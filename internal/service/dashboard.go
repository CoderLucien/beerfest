package service

import (
	"database/sql"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

type DashboardService struct{ db *sql.DB }

func (s *DashboardService) Metrics(activityID string) (*model.DashboardMetrics, error) {
	m := &model.DashboardMetrics{}
	s.db.QueryRow(
		`SELECT COALESCE(SUM(amount),0) FROM orders WHERE activity_id=?`, activityID,
	).Scan(&m.TotalRevenue)
	s.db.QueryRow(
		`SELECT COUNT(DISTINCT user_id) FROM coupons WHERE promotion_id IN
		 (SELECT id FROM promotions WHERE activity_id=?)`, activityID,
	).Scan(&m.ActiveUsers)
	var used, total int64
	s.db.QueryRow(
		`SELECT COUNT(*) FROM coupons WHERE status='used' AND promotion_id IN
		 (SELECT id FROM promotions WHERE activity_id=?)`, activityID,
	).Scan(&used)
	s.db.QueryRow(
		`SELECT COUNT(*) FROM coupons WHERE promotion_id IN
		 (SELECT id FROM promotions WHERE activity_id=?)`, activityID,
	).Scan(&total)
	if total > 0 {
		m.CouponUsedRate = float64(used) / float64(total)
	}
	s.db.QueryRow(
		`SELECT COALESCE(result,'pending') FROM experiments WHERE activity_id=?
		 ORDER BY created_at DESC LIMIT 1`, activityID,
	).Scan(&m.ExperimentWin)
	return m, nil
}
