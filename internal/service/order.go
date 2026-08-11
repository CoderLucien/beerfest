package service

import (
	"database/sql"
	"time"

	"github.com/google/uuid"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

type OrderService struct{ db *sql.DB }

func (s *OrderService) ListByUser(userID string) ([]model.Order, error) {
	rows, err := s.db.Query(
		`SELECT id, activity_id, user_id, amount,
		        COALESCE(coupon_code,''), COALESCE(original_amount,0), COALESCE(discount_amount,0),
		        COALESCE(trace_id,''), created_at, completed_at
		 FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.Order
	for rows.Next() {
		var o model.Order
		if err := rows.Scan(&o.ID, &o.ActivityID, &o.UserID, &o.Amount,
			&o.CouponCode, &o.OriginalAmount, &o.DiscountAmount,
			&o.TraceID, &o.CreatedAt, &o.CompletedAt); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	return list, nil
}

func (s *OrderService) Create(activityID, userID, couponCode string, amount, originalAmount, discountAmount float64) (*model.Order, error) {
	o := &model.Order{
		ID:             uuid.New().String(),
		ActivityID:     activityID,
		UserID:         userID,
		Amount:         amount,
		CouponCode:     couponCode,
		OriginalAmount: originalAmount,
		DiscountAmount: discountAmount,
		TraceID:        uuid.New().String(),
		CreatedAt:      time.Now(),
	}
	_, err := s.db.Exec(
		`INSERT INTO orders (id, activity_id, user_id, amount, coupon_code, original_amount, discount_amount, trace_id, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		o.ID, o.ActivityID, o.UserID, o.Amount, o.CouponCode, o.OriginalAmount, o.DiscountAmount, o.TraceID, o.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return o, nil
}

func (s *OrderService) ListAll(activityID string, minAmount float64, limit, offset int) ([]model.AdminOrder, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `SELECT o.id, o.activity_id, o.user_id, o.amount,
	                 COALESCE(o.coupon_code,''), COALESCE(o.original_amount,0), COALESCE(o.discount_amount,0),
	                 COALESCE(o.trace_id,''), o.created_at, o.completed_at,
	                 COALESCE(u.phone,'')
	          FROM orders o
	          LEFT JOIN users u ON u.id = o.user_id
	          WHERE o.activity_id = ?`
	args := []interface{}{activityID}
	if minAmount > 0 {
		query += " AND o.amount >= ?"
		args = append(args, minAmount)
	}
	query += " ORDER BY o.amount DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.AdminOrder
	for rows.Next() {
		var o model.AdminOrder
		if err := rows.Scan(&o.ID, &o.ActivityID, &o.UserID, &o.Amount,
			&o.CouponCode, &o.OriginalAmount, &o.DiscountAmount,
			&o.TraceID, &o.CreatedAt, &o.CompletedAt, &o.Phone); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	return list, nil
}

func (s *OrderService) AttachCoupon(orderID, couponCode string, originalAmount, discountAmount float64) error {
	_, err := s.db.Exec(
		`UPDATE orders SET coupon_code=?, original_amount=?, discount_amount=? WHERE id=?`,
		couponCode, originalAmount, discountAmount, orderID,
	)
	return err
}
