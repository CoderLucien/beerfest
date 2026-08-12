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

	"github.com/CoderLucien/beerfest-api/internal/model"
)

// QueryService implements the smart-inquiry engine (Plan B hybrid):
// LLM selects template + extracts params; SQL is always parameterized.
type QueryService struct {
	db  *sql.DB
	rdb *redis.Client
}

func NewQueryService(db *sql.DB, rdb *redis.Client) *QueryService {
	return &QueryService{db: db, rdb: rdb}
}

// --- API types ---

type InquireRequest struct {
	Question   string `json:"question"`
	ActivityID string `json:"activity_id,omitempty"`
}

type CouponSummary struct {
	Name   string  `json:"name"`
	Issued int64   `json:"issued"`
	Used   int64   `json:"used"`
	Rate   float64 `json:"rate"`
}

type ChartData struct {
	Type   string      `json:"type"`
	Metric string      `json:"metric,omitempty"`
	Data   interface{} `json:"data"`
}

type InquireResponse struct {
	Question string          `json:"question"`
	Intent   string          `json:"intent"`
	Metrics  json.RawMessage `json:"metrics,omitempty"`
	Coupons  []CouponSummary `json:"coupons,omitempty"`
	Chart    *ChartData      `json:"chart,omitempty"`
	Answer   string          `json:"answer"`
	Boundary map[string]any  `json:"boundary,omitempty"`
	Analysis string          `json:"analysis,omitempty"`
}

// --- query templates (parameterized SQL) ---

type queryTemplate struct {
	Name string
	Fn   func(activityID string, params map[string]any) (string, []any)
}

var templates = map[string]queryTemplate{
	"promotion_stats": {
		Name: "promotion_stats",
		Fn: func(activityID string, params map[string]any) (string, []any) {
			return `SELECT p.name, COUNT(c.id) AS issued,
			        SUM(CASE WHEN c.status='used' THEN 1 ELSE 0 END) AS used
			 FROM promotions p
			 LEFT JOIN coupons c ON c.promotion_id = p.id
			 WHERE p.activity_id = ? AND p.name LIKE ?
			 GROUP BY p.name`, []any{activityID, "%" + toStr(params["coupon_hint"]) + "%"}
		},
	},
	"revenue_summary": {
		Name: "revenue_summary",
		Fn: func(activityID string, params map[string]any) (string, []any) {
			return `SELECT COALESCE(SUM(o.amount),0) AS total_revenue,
			        COUNT(DISTINCT c.user_id) AS active_users,
			        COUNT(DISTINCT c.id) AS total_coupons,
			        SUM(CASE WHEN c.status='used' THEN 1 ELSE 0 END) AS used_coupons
			 FROM orders o
			 LEFT JOIN promotions p ON p.activity_id = ?
			 LEFT JOIN coupons c ON c.promotion_id = p.id
			 WHERE o.activity_id = ?`, []any{activityID, activityID}
		},
	},
	"coupon_breakdown": {
		Name: "coupon_breakdown",
		Fn: func(activityID string, params map[string]any) (string, []any) {
			order := "issued DESC"
			if toStr(params["sort_by"]) == "rate" {
				order = "used*1.0/NULLIF(COUNT(c.id),0) DESC"
			} else if toStr(params["sort_by"]) == "used" {
				order = "used DESC"
			}
			return fmt.Sprintf(`SELECT p.name, COUNT(c.id) AS issued,
			        SUM(CASE WHEN c.status='used' THEN 1 ELSE 0 END) AS used
			 FROM promotions p
			 LEFT JOIN coupons c ON c.promotion_id = p.id
			 WHERE p.activity_id = ?
			 GROUP BY p.name
			 ORDER BY %s`, order), []any{activityID}
		},
	},
	"top_orders": {
		Name: "top_orders",
		Fn: func(activityID string, params map[string]any) (string, []any) {
			limit := 5
			if n, ok := params["limit"].(float64); ok && n > 0 {
				limit = int(n)
			}
			return fmt.Sprintf(`SELECT o.id, o.amount, o.coupon_code,
			        o.original_amount, o.discount_amount, o.created_at
			 FROM orders o WHERE o.activity_id = ?
			 ORDER BY o.amount DESC LIMIT %d`, limit), []any{activityID}
		},
	},
	"user_stats": {
		Name: "user_stats",
		Fn: func(activityID string, params map[string]any) (string, []any) {
			return `SELECT COUNT(DISTINCT user_id) AS active_users,
			        COUNT(DISTINCT CASE WHEN status='used' THEN user_id END) AS paying_users
			 FROM coupons WHERE promotion_id IN
			 (SELECT id FROM promotions WHERE activity_id=?)`, []any{activityID}
		},
	},
	"revenue_by_type": {
		Name: "revenue_by_type",
		Fn: func(activityID string, params map[string]any) (string, []any) {
			return `SELECT p.type, COALESCE(SUM(o.amount),0) AS revenue,
			        COUNT(DISTINCT o.id) AS order_count
			 FROM promotions p
			 LEFT JOIN coupons c ON c.promotion_id = p.id
			 LEFT JOIN orders o ON o.coupon_code = c.code
			 WHERE p.activity_id = ?
			 GROUP BY p.type`, []any{activityID}
		},
	},
	"anomaly_check": {
		Name: "anomaly_check",
		Fn: func(activityID string, params map[string]any) (string, []any) {
			return `SELECT p.name, COUNT(c.id) AS issued,
			        SUM(CASE WHEN c.status='used' THEN 1 ELSE 0 END) AS used,
			        CASE WHEN COUNT(c.id) > 0
			          THEN SUM(CASE WHEN c.status='used' THEN 1 ELSE 0 END)*1.0/COUNT(c.id)
			          ELSE 0 END AS rate
			 FROM promotions p
			 LEFT JOIN coupons c ON c.promotion_id = p.id
			 WHERE p.activity_id = ?
			 GROUP BY p.name`, []any{activityID}
		},
	},
	"comparison": {
		Name: "comparison",
		Fn: func(activityID string, params map[string]any) (string, []any) {
			return `SELECT p.name, COUNT(c.id) AS issued,
			        SUM(CASE WHEN c.status='used' THEN 1 ELSE 0 END) AS used,
			        CASE WHEN COUNT(c.id) > 0
			          THEN SUM(CASE WHEN c.status='used' THEN 1 ELSE 0 END)*1.0/COUNT(c.id)
			          ELSE 0 END AS rate
			 FROM promotions p
			 LEFT JOIN coupons c ON c.promotion_id = p.id
			 WHERE p.activity_id = ? AND (p.name LIKE ? OR p.name LIKE ?)
			 GROUP BY p.name`, []any{activityID,
				"%" + toStr(params["coupon_a"]) + "%",
				"%" + toStr(params["coupon_b"]) + "%"}
		},
	},
}

func toStr(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

// --- LLM routing prompt ---

const routerPrompt = `你是促销智能问数路由。根据用户问题选择模板并提取参数。

可用模板：promotion_stats(单券统计) revenue_summary(活动总览) coupon_breakdown(券种排序) top_orders(高额订单) user_stats(用户统计) revenue_by_type(按类型营收) anomaly_check(告警检查) comparison(两券对比)

数据能力边界：当前数据仅含活动总览(总营收/活跃用户/核销率/ARPU)与分券种统计(发放量/核销量/核销率)。不包含区域、门店、终端、时间趋势、用户画像、因果归因。

边界规则：
1. 问区域/门店/终端→标记boundary，可用券种近似替代
2. 问时间趋势/环比/同比→标记boundary
3. 问原因/为什么→标记analysis，归因标注"推测"
4. 闲聊/你好/你是谁→intent=chitchat

输出JSON：
{
  "intent": "data|analysis|boundary|chitchat",
  "template": "模板名或空",
  "params": {"coupon_hint":"券名片段","sort_by":"issued|rate|used","limit":5,"coupon_a":"","coupon_b":""},
  "answer_hint": "自然语言回答的要点（含具体数字占位符）",
  "boundary_missing": ["缺失维度"],
  "analysis_note": "分析类问题标注推测边界"
}`

type routerResult struct {
	Intent         string         `json:"intent"`
	Template       string         `json:"template"`
	Params         map[string]any `json:"params"`
	AnswerHint     string         `json:"answer_hint"`
	BoundaryMissing []string      `json:"boundary_missing"`
	AnalysisNote   string         `json:"analysis_note"`
}

// --- Main entry point ---

func (s *QueryService) Inquire(question, activityID string) (*InquireResponse, error) {
	if activityID == "" {
		activityID = "b0a13055-74df-46fe-8e55-e48928bde282"
	}

	// Step 1: Fetch ground-truth data
	dash := &DashboardService{db: s.db}
	metrics, err := dash.Metrics(activityID)
	if err != nil {
		return nil, fmt.Errorf("fetch dashboard: %w", err)
	}

	promo := &PromotionService{db: s.db}
	stats, err := promo.StatsByActivity(activityID)
	if err != nil {
		return nil, fmt.Errorf("fetch promotion stats: %w", err)
	}

	// Normalize rates to percentage
	if metrics != nil && metrics.CouponUsedRate > 0 && metrics.CouponUsedRate < 1 {
		metrics.CouponUsedRate *= 100
	}
	for i := range stats {
		if stats[i].Rate > 0 && stats[i].Rate < 1 {
			stats[i].Rate *= 100
		}
	}
	if metrics.ARPU == 0 && metrics.TotalRevenue > 0 && metrics.ActiveUsers > 0 {
		metrics.ARPU = metrics.TotalRevenue / float64(metrics.ActiveUsers)
	}

	coupons := buildCouponSummaries(stats)

	// Step 2: Route via LLM
	dataCtx := map[string]any{
		"activity_id": activityID,
		"dashboard":   metrics,
		"promotions":  couponNames(stats),
	}
	dataJSON, _ := json.Marshal(dataCtx)
	userMsg := fmt.Sprintf("数据上下文：%s\n\n用户问题：%s", string(dataJSON), question)

	routeResult, err := s.route(userMsg)
	if err != nil {
		log.Printf("[query] LLM route failed, falling back: %v", err)
		routeResult = fallbackRoute(question)
	}

	// Step 3: Execute template if applicable
	var templateData []map[string]any
	if routeResult.Template != "" {
		tmpl, ok := templates[routeResult.Template]
		if !ok {
			tmpl, ok = templates["coupon_breakdown"]
		}
		if ok {
			sqlStr, args := tmpl.Fn(activityID, routeResult.Params)
			templateData, _ = s.executeSQL(sqlStr, args)
		}
	}

	// Step 4: Build response
	resp := s.buildResponse(question, routeResult, metrics, coupons, templateData)

	// Step 5: Audit
	key := fmt.Sprintf("ops:inquire:%s:%d", activityID, time.Now().Unix())
	s.rdb.Set(context.Background(), key, question, 7*24*time.Hour)
	log.Printf("[inquire] activity=%s question=%s intent=%s", activityID, truncate(question, 80), resp.Intent)

	return resp, nil
}

// --- LLM routing ---

func (s *QueryService) route(userMsg string) (*routerResult, error) {
	baseURL := os.Getenv("LLM_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.hunyuan.cloud.tencent.com/v1"
	}
	apiKey := os.Getenv("LLM_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("LLM_API_KEY 环境变量未配置")
	}
	model := os.Getenv("LLM_MODEL")
	if model == "" {
		model = "hunyuan-lite"
	}

	reqBody := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": routerPrompt},
			{"role": "user", "content": userMsg},
		},
		"max_tokens":  512,
		"temperature": 0.3,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	url := strings.TrimRight(baseURL, "/") + "/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("llm request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read llm response: %w", err)
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("llm api %d: %s", resp.StatusCode, truncate(string(respBytes), 200))
	}

	var llmResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBytes, &llmResp); err != nil {
		return nil, err
	}
	if len(llmResp.Choices) == 0 {
		return nil, fmt.Errorf("llm returned no choices")
	}

	content := sanitizeLLMJSON(llmResp.Choices[0].Message.Content)
	var result routerResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		// Try to parse best-effort
		result.Intent = "data"
		result.Template = guessTemplate(question)
		result.Params = guessParams(question)
		result.AnswerHint = content
	}

	// Validate and normalize
	if result.Intent == "" {
		result.Intent = "data"
	}
	if result.Template == "" && result.Intent == "data" {
		result.Template = guessTemplate(question)
	}
	if result.Params == nil {
		result.Params = guessParams(question)
	}

	return &result, nil
}

// --- SQL execution ---

func (s *QueryService) executeSQL(query string, args []any) ([]map[string]any, error) {
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var results []map[string]any
	for rows.Next() {
		scanArgs := make([]any, len(cols))
		scanPtrs := make([]any, len(cols))
		for i := range scanArgs {
			scanPtrs[i] = &scanArgs[i]
		}
		if err := rows.Scan(scanPtrs...); err != nil {
			return nil, err
		}
		row := make(map[string]any)
		for i, col := range cols {
			row[col] = scanArgs[i]
		}
		results = append(results, row)
	}
	return results, nil
}

// --- Response building ---

func (s *QueryService) buildResponse(question string, route *routerResult, metrics *model.DashboardMetrics, coupons []CouponSummary, tmplData []map[string]any) *InquireResponse {
	resp := &InquireResponse{
		Question: question,
		Intent:   route.Intent,
	}

	metricsJSON, _ := json.Marshal(metrics)
	resp.Metrics = json.RawMessage(metricsJSON)

	switch route.Intent {
	case "boundary":
		resp.Boundary = map[string]any{
			"missing":     route.BoundaryMissing,
			"suggestion":  "当前数据无该维度，已用最接近的可用维度给出参考",
		}
		resp.Answer = buildBoundaryAnswer(question, route, coupons, tmplData)
	case "analysis":
		resp.Analysis = route.AnalysisNote
		resp.Answer = buildAnalysisAnswer(question, route, metrics, coupons, tmplData)
	case "chitchat":
		resp.Answer = "你好！我是促销智能问数助手，可以帮你查询活动营收、核销率、ARPU、券种统计等运营数据。直接提问即可，比如「当前总营收是多少」「哪个券核销率最低」。"
	default:
		resp.Answer = buildDataAnswer(question, route, metrics, coupons, tmplData)
		resp.Coupons = filterRelevantCoupons(tmplData, coupons, route)
		resp.Chart = buildChart(route, coupons, tmplData)
	}

	return resp
}

func buildDataAnswer(question string, route *routerResult, m *model.DashboardMetrics, coupons []CouponSummary, data []map[string]any) string {
	switch route.Template {
	case "revenue_summary":
		return fmt.Sprintf("当前活动总营收 ¥%.2f，活跃用户 %d 人，整体核销率 %.1f%%，ARPU ¥%.2f。",
			m.TotalRevenue, m.ActiveUsers, m.CouponUsedRate, m.ARPU)
	case "promotion_stats":
		if len(data) > 0 {
			d := data[0]
			name := fmt.Sprintf("%v", d["name"])
			issued := fmt.Sprintf("%v", d["issued"])
			used := fmt.Sprintf("%v", d["used"])
			return name + " 发放" + issued + "张，核销" + used + "张，核销率" + fmt.Sprintf("%v", d["rate"]) + "%"
		}
	case "coupon_breakdown":
		if len(coupons) > 0 {
			var parts []string
			for i, c := range coupons {
				if i >= 10 {
					break
				}
				parts = append(parts, fmt.Sprintf("%s 核销率%.1f%%（%d/%d）", c.Name, c.Rate, c.Used, c.Issued))
			}
			return "券种统计：\n" + strings.Join(parts, "\n")
		}
	case "comparison":
		if len(data) >= 2 {
			a, b := data[0], data[1]
			return fmt.Sprintf("%s 核销率 %.1f%%，%s 核销率 %.1f%%。",
				a["name"], toFloat(a["rate"]), b["name"], toFloat(b["rate"]))
		}
	case "anomaly_check":
		return buildAnomalyAnswer(coupons, m)
	}
	return route.AnswerHint
}

func buildBoundaryAnswer(question string, route *routerResult, coupons []CouponSummary, data []map[string]any) string {
	missing := strings.Join(route.BoundaryMissing, "、")
	prefix := fmt.Sprintf("当前数据无%s维度，无法直接回答。", missing)
	if len(coupons) > 0 {
		lo := coupons[len(coupons)-1]
		return prefix + fmt.Sprintf(" 最接近的参考：分券种中 %s 核销率最低（%.1f%%）。", lo.Name, lo.Rate)
	}
	return prefix
}

func buildAnalysisAnswer(question string, route *routerResult, m *model.DashboardMetrics, coupons []CouponSummary, data []map[string]any) string {
	var sb strings.Builder
	sb.WriteString("基于当前数据分析：\n")
	sb.WriteString(fmt.Sprintf("整体核销率 %.1f%%，活跃用户 %d 人。\n", m.CouponUsedRate, m.ActiveUsers))
	if m.CouponUsedRate < 30 {
		sb.WriteString("核销率处于严重偏低水平（<30%）。")
	} else if m.CouponUsedRate < 40 {
		sb.WriteString("核销率偏低（<40%）。")
	}
	if route.AnalysisNote != "" {
		sb.WriteString(" 推测：" + route.AnalysisNote)
	}
	return sb.String()
}

func buildAnomalyAnswer(coupons []CouponSummary, m *model.DashboardMetrics) string {
	var alerts []string
	if m.CouponUsedRate < 30 {
		alerts = append(alerts, fmt.Sprintf("整体核销率 %.1f%% 严重偏低（<30%%）", m.CouponUsedRate))
	} else if m.CouponUsedRate < 40 {
		alerts = append(alerts, fmt.Sprintf("整体核销率 %.1f%% 偏低（<40%%）", m.CouponUsedRate))
	}
	for _, c := range coupons {
		if c.Rate < 20 {
			alerts = append(alerts, fmt.Sprintf("%s 核销率 %.1f%% 严重偏低，提示临期风险", c.Name, c.Rate))
		}
	}
	if len(alerts) == 0 {
		return fmt.Sprintf("当前核销率 %.1f%%，各项指标正常，未触发告警。", m.CouponUsedRate)
	}
	return strings.Join(alerts, "；")
}

// --- Helpers ---

func buildCouponSummaries(stats []model.PromotionStat) []CouponSummary {
	var cs []CouponSummary
	for _, s := range stats {
		cs = append(cs, CouponSummary{
			Name:   s.Name,
			Issued: s.Issued,
			Used:   s.Used,
			Rate:   s.Rate,
		})
	}
	return cs
}

func couponNames(stats []model.PromotionStat) []map[string]any {
	var names []map[string]any
	for _, s := range stats {
		names = append(names, map[string]any{
			"name":   s.Name,
			"issued": s.Issued,
			"used":   s.Used,
			"rate":   s.Rate,
		})
	}
	return names
}

func filterRelevantCoupons(data []map[string]any, all []CouponSummary, route *routerResult) []CouponSummary {
	if len(data) == 0 {
		return all
	}
	seen := make(map[string]bool)
	var filtered []CouponSummary
	for _, d := range data {
		name := fmt.Sprintf("%v", d["name"])
		if seen[name] {
			continue
		}
		seen[name] = true
		for _, c := range all {
			if strings.Contains(c.Name, name) || strings.Contains(name, c.Name) {
				filtered = append(filtered, c)
				break
			}
		}
	}
	if len(filtered) == 0 {
		return all
	}
	return filtered
}

func buildChart(route *routerResult, coupons []CouponSummary, data []map[string]any) *ChartData {
	if route.Template == "coupon_breakdown" || route.Template == "anomaly_check" {
		return &ChartData{
			Type:   "bar",
			Metric: "rate",
			Data:   coupons,
		}
	}
	if route.Template == "comparison" && len(data) >= 2 {
		return &ChartData{
			Type:   "table",
			Metric: "comparison",
			Data:   data,
		}
	}
	return nil
}

func toFloat(v any) float64 {
	if v == nil {
		return 0
	}
	switch x := v.(type) {
	case float64:
		return x
	case int64:
		return float64(x)
	}
	return 0
}

// --- Fallback: keyword-based routing when LLM unavailable ---

func fallbackRoute(question string) *routerResult {
	q := strings.ToLower(question)
	r := &routerResult{Intent: "data", Params: make(map[string]any)}

	switch {
	case strings.Contains(q, "你好") || strings.Contains(q, "你是谁") || strings.Contains(q, "能做什么"):
		r.Intent = "chitchat"
		return r
	case strings.Contains(q, "区域") || strings.Contains(q, "门店") || strings.Contains(q, "终端"):
		r.Intent = "boundary"
		r.BoundaryMissing = []string{"区域/门店/终端"}
		r.Template = "coupon_breakdown"
		return r
	case strings.Contains(q, "下降") || strings.Contains(q, "为什么") || strings.Contains(q, "原因"):
		r.Intent = "analysis"
		r.Template = "anomaly_check"
		r.AnalysisNote = "基于当前快照数据分析，无法判断时序因果关系"
		return r
	case strings.Contains(q, "环比") || strings.Contains(q, "同比") || strings.Contains(q, "昨天") || strings.Contains(q, "今天"):
		r.Intent = "boundary"
		r.BoundaryMissing = []string{"时间趋势"}
		r.Template = "revenue_summary"
		return r
	}

	r.Template = guessTemplate(question)
	r.Params = guessParams(question)
	return r
}

func guessTemplate(question string) string {
	q := question
	switch {
	case strings.Contains(q, "营收") || strings.Contains(q, "总览") || strings.Contains(q, "ARPU") || strings.Contains(q, "arpu") || strings.Contains(q, "整体"):
		return "revenue_summary"
	case strings.Contains(q, "排序") || strings.Contains(q, "排名") || strings.Contains(q, "哪个") || strings.Contains(q, "最高") || strings.Contains(q, "最低") || strings.Contains(q, "最好") || strings.Contains(q, "最差"):
		return "coupon_breakdown"
	case strings.Contains(q, "和") && (strings.Contains(q, "哪个") || strings.Contains(q, "对比") || strings.Contains(q, "比较")):
		return "comparison"
	case strings.Contains(q, "告警") || strings.Contains(q, "预警") || strings.Contains(q, "异常"):
		return "anomaly_check"
	case strings.Contains(q, "用户") || strings.Contains(q, "活跃"):
		return "user_stats"
	case strings.Contains(q, "订单") || strings.Contains(q, "大单"):
		return "top_orders"
	default:
		return "revenue_summary"
	}
}

func guessParams(question string) map[string]any {
	params := make(map[string]any)
	for _, name := range []string{"满100减30", "全场8折", "全场9折", "满200减50", "满200减60", "满168减68", "满50减10", "小食免单", "满2瓶送1瓶", "啤酒+烧烤"} {
		if strings.Contains(question, name) {
			params["coupon_hint"] = name
			break
		}
	}
	if strings.Contains(question, "最低") || strings.Contains(question, "最差") {
		params["sort_by"] = "rate"
	}
	if strings.Contains(question, "最高") || strings.Contains(question, "最好") {
		params["sort_by"] = "rate"
	}
	return params
}

// DashboardMetrics type is in model package
