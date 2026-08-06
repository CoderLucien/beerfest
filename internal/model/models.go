package model

import "time"

type Activity struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Status     string    `json:"status"` // draft, active, paused, ended
	StartTime  time.Time `json:"start_time"`
	EndTime    time.Time `json:"end_time"`
	WorkflowID string    `json:"workflow_id"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Promotion struct {
	ID          string    `json:"id"`
	ActivityID  string    `json:"activity_id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"` // discount, coupon, bundle
	Rule        string    `json:"rule"` // JSON rule definition
	Status      string    `json:"status"`
	WorkflowID  string    `json:"workflow_id"`
	ApprovedBy  string    `json:"approved_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Coupon struct {
	ID          string    `json:"id"`
	PromotionID string    `json:"promotion_id"`
	UserID      string    `json:"user_id"`
	Code        string    `json:"code"`
	Status      string    `json:"status"` // issued, used, expired
	TraceID     string    `json:"trace_id"`
	IssuedAt    time.Time `json:"issued_at"`
	ExpiresAt   time.Time `json:"expires_at"`
}

type CustomerSegment struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Rule      string    `json:"rule"` // JSON qualification rule
	Version   int       `json:"version"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Experiment struct {
	ID          string     `json:"id"`
	ActivityID  string     `json:"activity_id"`
	Name        string     `json:"name"`
	VariantA    string     `json:"variant_a"`
	VariantB    string     `json:"variant_b"`
	Status      string     `json:"status"`
	Result      string     `json:"result,omitempty"`
	TraceID     string     `json:"trace_id"`
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

type DashboardMetrics struct {
	TotalRevenue   float64 `json:"total_revenue"`
	ActiveUsers    int64   `json:"active_users"`
	CouponUsedRate float64 `json:"coupon_used_rate"`
	ExperimentWin  string  `json:"experiment_win"`
}
