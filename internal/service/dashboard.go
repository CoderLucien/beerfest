package service

import (
	"database/sql"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

type DashboardService struct{ db *sql.DB }

func (s *DashboardService) Metrics(activityID string) (*model.DashboardMetrics, error) {
	m := &model.DashboardMetrics{}
	if err := s.db.QueryRow(
		`SELECT COALESCE(SUM(amount),0) FROM orders WHERE activity_id=?`, activityID,
	).Scan(&m.TotalRevenue); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if err := s.db.QueryRow(
		`SELECT COUNT(DISTINCT user_id) FROM coupons WHERE promotion_id IN
		 (SELECT id FROM promotions WHERE activity_id=?)`, activityID,
	).Scan(&m.ActiveUsers); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	var used, total int64
	if err := s.db.QueryRow(
		`SELECT COUNT(*) FROM coupons WHERE status='used' AND promotion_id IN
		 (SELECT id FROM promotions WHERE activity_id=?)`, activityID,
	).Scan(&used); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if err := s.db.QueryRow(
		`SELECT COUNT(*) FROM coupons WHERE promotion_id IN
		 (SELECT id FROM promotions WHERE activity_id=?)`, activityID,
	).Scan(&total); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if total > 0 {
		m.CouponUsedRate = float64(used) / float64(total)
	}
	if err := s.db.QueryRow(
		`SELECT COALESCE(result,'pending') FROM experiments WHERE activity_id=?
		 ORDER BY created_at DESC LIMIT 1`, activityID,
	).Scan(&m.ExperimentWin); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	return m, nil
}
