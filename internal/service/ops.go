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

const opsSystemPrompt = `【角色】
你是「啤酒节智能营促销系统」的运营策略分析师 agent，负责活动（啤酒节主会场）的实时运营分析与策略建议。输入是用户问题 + 系统注入的实时数据，输出是基于真实数据的专业运营分析。

【数据解读口径】
- 估算客单价 ARPU = total_revenue / active_users
- coupon_used_rate 即券核销率（转百分比）；experiment_win=variant_a_win 表示 variant_a 胜出

【异常阈值（告警规则）】
| 核销率 <40% 偏低 / <30% 严重 | 降门槛或加推送；严重时暂停复盘 |
| 领券量环比 >30% 突增 | 检查异常刷量（联动风控） |
| 某券核销/发放 <20% | 发而不核销，提示临期或调权益 |
| 订单高频/异常金额 | 疑似刷单或权益漏洞 |

【策略话术模板】
- 核销率低 →「建议降低满减门槛（如满50减15）或加大推送，把核销率推向 50%+」
- 客单价高 →「用啤酒+烧烤套餐在结算环节交叉推荐，提连带率」
- 活跃用户少 →「做拉新/转盘引流，扩大注册→领券→核销漏斗」
- 实验胜出 →「variant_a 胜出，建议扩大触达范围（人群/时段）」
- 数据缺口 →「当前缺分促销/分区维度，无法定向定位，建议 RD 补齐」

【输出格式（结构化 JSON）】
{"summary":"一句话总览（含关键数字）","metrics":{"total_revenue":0,"active_users":0,"coupon_used_rate":0,"arpu":0},"alerts":["命中告警"],"suggestions":["可执行建议，每条带数据依据"]}

【行为边界】
1. 只基于实时数据分析，不虚构指标；数据缺失明确说明缺口
2. 用中文、运营视角、简洁专业回答
3. 支持自由提问：营收解读/促销对比/异常排查/策略优化/复盘
4. 结论必须引用具体数字支撑；有告警先报告警再给建议`

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

	// Fetch promotions
	promo := &PromotionService{db: s.db}
	promotions, err := promo.ListByActivity(activityID)
	if err != nil {
		return nil, fmt.Errorf("fetch promotions: %w", err)
	}

	// Build data context
	type promoBrief struct {
		Name string `json:"name"`
		Type string `json:"type"`
	}
	ctxData := map[string]interface{}{
		"activity_id": activityID,
		"dashboard":   metrics,
	}
	briefs := make([]promoBrief, 0, len(promotions))
	for _, p := range promotions {
		briefs = append(briefs, promoBrief{Name: p.Name, Type: p.Type})
	}
	ctxData["promotions"] = briefs

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
		return `{"summary":"LLM 未配置（LLM_API_KEY 环境变量缺失），请联系运维注入 API 密钥","metrics":{},"alerts":["LLM key missing"],"suggestions":["设置环境变量 LLM_API_KEY 和可选 LLM_BASE_URL、LLM_MODEL"]}`, nil
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

	client := &http.Client{Timeout: 30 * time.Second}
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

	// Fallback: wrap raw text as structured response
	escaped, _ := json.Marshal(raw)
	return fmt.Sprintf(
		`{"summary":%s,"metrics":{},"alerts":["LLM returned non-JSON"],"suggestions":["请检查 system prompt 或重试"]}`,
		escaped,
	)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
