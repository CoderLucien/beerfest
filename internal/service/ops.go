package service

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const opsSystemPrompt = `你是啤酒节运营助手。先判断用户意图，再选择回复模式。

## 意图分类
- 数据分析类：询问运营数据、活动概况、指标、报表、核销率、ARPU、营收 → 「运营分析」模式
- 操作问答类：询问如何操作、功能使用、促销管理、券种配置、概念解释 → 「操作问答」模式
- 闲聊/介绍类：问你是谁、能做什么、打招呼 → 「对话」模式

## 运营分析模式
基于输入的实时数据输出专业分析。
数据口径：ARPU=total_revenue/active_users；coupon_used_rate即核销率（%）。
告警规则：核销率<40%偏低/<30%严重；领券量环比>30%疑似刷量；某券核销/发放<20%提示临期；订单异常金额疑似刷单。
策略建议：核销率低→降门槛或加推送；客单价高→交叉推荐提连带率；活跃少→拉新引流；实验胜出→扩大触达；数据缺口→说明缺失维度。
输出JSON：{"summary":"总览含数字","metrics":{"total_revenue":0,"active_users":0,"coupon_used_rate":0,"arpu":0},"alerts":["命中告警"],"suggestions":["可执行建议附数据依据"]}
只基于实时数据分析，不虚构；中文、运营视角、简洁；结论引用具体数字；有告警先报告警。
核销率等百分比指标统一用百分比格式（如41.5%），禁止使用小数（如0.415）。
策略建议必须基于当前数据中的实际券种和门槛，不可推荐不存在或已过期的券种。

## 操作问答模式
基于系统知识回答用户的操作问题，给出清晰的步骤或解释。用中文直接回答，不需要输出JSON报告格式。如果不确定，诚实说明并提供可探索的方向。

## 对话模式
友好自然地简短回复，介绍自己是啤酒节运营助手，可以帮忙分析运营数据、回答操作问题。

## 数据能力边界（必读）
当前注入数据仅覆盖：活动总览（total_revenue/active_users/coupon_used_rate/arpu）与分券种统计（promotions[].issued/used/rate）。
数据不包含：区域/门店/终端维度、时间趋势（环比/同比）、用户画像、因果归因、订单明细。

## 能力边界规则
1. 用户问及数据不含的维度（如"哪个区域/门店核销率低""核销率为什么下降""今天比昨天怎么样"）：
   - 第一步必须明确声明"当前数据无该维度，无法直接回答"；
   - 第二步用最接近的可用维度给出参考结论（如用分券种近似替代区域）；
   - 严禁虚构不存在的区域、终端、时间对比或分类标签。
2. 因果问题（为什么/原因）：只能陈述可观察事实（如"满2瓶送1瓶核销率仅13.3%"），归因判断必须标注"推测"，禁止编造证据链。
3. 数据分析模式输出 JSON 时，若因数据缺失无法完整回答，须在 summary 中诚实注明缺哪个维度，不可用空泛建议掩盖。

## 重要规则
1. 只选一种模式，不要同时输出报告和对话
2. 数据分析类问题必须输出JSON格式
3. 非数据分析类问题直接中文回答，禁止输出JSON
4. 不虚构数据，基于实际输入分析`

type OpsChatService struct {
	db  *sql.DB
	rdb *redis.Client
}

func NewOpsChatService(db *sql.DB, rdb *redis.Client) *OpsChatService {
	return &OpsChatService{db: db, rdb: rdb}
}

type chatRequest struct {
	Question   string `json:"question"`
	ActivityID string `json:"activity_id,omitempty"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type llmRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens"`
	Temperature float64       `json:"temperature"`
}

type llmResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type OpsChatResult struct {
	Question string          `json:"question"`
	Data     json.RawMessage `json:"data_context"`
	Reply    json.RawMessage `json:"reply"`
}

func (s *OpsChatService) Chat(question, activityID string) (*OpsChatResult, error) {
	if activityID == "" {
		activityID = "b0a13055-74df-46fe-8e55-e48928bde282"
	}

	// Fetch real-time dashboard data
	dash := &DashboardService{db: s.db}
	metrics, err := dash.Metrics(activityID)
	if err != nil {
		return nil, fmt.Errorf("fetch dashboard: %w", err)
	}

	// Fetch promotion stats with per-coupon metrics
	promo := &PromotionService{db: s.db}
	stats, err := promo.StatsByActivity(activityID)
	if err != nil {
		return nil, fmt.Errorf("fetch promotion stats: %w", err)
	}

	ctxData := map[string]interface{}{
		"activity_id": activityID,
		"dashboard":   metrics,
		"promotions":  stats,
	}

	// Normalize rates to percentage (source data is decimal, e.g. 0.4153 → 41.53)
	if metrics != nil && metrics.CouponUsedRate > 0 && metrics.CouponUsedRate < 1 {
		metrics.CouponUsedRate *= 100
	}
	for i := range stats {
		if stats[i].Rate > 0 && stats[i].Rate < 1 {
			stats[i].Rate *= 100
		}
	}

	dataJSON, _ := json.Marshal(ctxData)

	// Build user message with data context
	userMsg := fmt.Sprintf("实时数据：\n%s\n\n用户问题：%s", string(dataJSON), question)

	// Call LLM
	replyJSON, err := s.callLLM(opsSystemPrompt, userMsg)
	if err != nil {
		return nil, fmt.Errorf("llm call: %w", err)
	}

	// Write audit log
	key := fmt.Sprintf("ops:chat:%s:%d", activityID, time.Now().Unix())
	s.rdb.Set(context.Background(), key, question, 7*24*time.Hour)

	log.Printf("[ops-chat] activity=%s question=%s", activityID, truncate(question, 80))

	return &OpsChatResult{
		Question: question,
		Data:     json.RawMessage(dataJSON),
		Reply:    json.RawMessage(replyJSON),
	}, nil
}

func (s *OpsChatService) callLLM(systemPrompt, userMsg string) (string, error) {
	baseURL := os.Getenv("LLM_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.hunyuan.cloud.tencent.com/v1"
	}
	apiKey := os.Getenv("LLM_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("LLM_API_KEY 环境变量未配置，请在 docker-compose.yml 中注入 API 密钥")
	}
	model := os.Getenv("LLM_MODEL")
	if model == "" {
		model = "hunyuan-lite"
	}

	reqBody := llmRequest{
		Model: model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMsg},
		},
		MaxTokens:   1024,
		Temperature: 0.7,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	url := strings.TrimRight(baseURL, "/") + "/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("llm request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read llm response: %w", err)
	}

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("llm api %d: %s", resp.StatusCode, truncate(string(respBytes), 200))
	}

	var llmResp llmResponse
	if err := json.Unmarshal(respBytes, &llmResp); err != nil {
		return "", fmt.Errorf("parse llm response: %w", err)
	}
	if len(llmResp.Choices) == 0 {
		return "", fmt.Errorf("llm returned no choices")
	}

	content := llmResp.Choices[0].Message.Content
	content = sanitizeLLMJSON(content)
	return content, nil
}

func sanitizeLLMJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	if json.Valid([]byte(raw)) {
		return raw
	}

	// Try to extract embedded JSON object
	if start := strings.Index(raw, "{"); start >= 0 {
		if end := strings.LastIndex(raw, "}"); end > start {
			candidate := raw[start : end+1]
			if json.Valid([]byte(candidate)) {
				return candidate
			}
		}
	}

	// Fallback: wrap natural-language reply as summary-only, no fake alerts
	escaped, _ := json.Marshal(raw)
	return fmt.Sprintf(`{"summary":%s,"metrics":{},"alerts":[],"suggestions":[]}`, escaped)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
