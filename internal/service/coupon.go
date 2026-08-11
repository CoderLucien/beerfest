package service

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

type CouponService struct{ db *sql.DB }

func (s *CouponService) Issue(promotionID, userID, ip, userAgent string) (*model.Coupon, error) {
	codePrefix := userID
	if len(userID) > 8 {
		codePrefix = userID[:8]
	}
	c := &model.Coupon{
		ID:          uuid.New().String(),
		PromotionID: promotionID,
		UserID:      userID,
		Code:        fmt.Sprintf("CP-%s-%d-%s", codePrefix, time.Now().Unix(), uuid.New().String()[:4]),
		Status:      "issued",
		TraceID:     uuid.New().String(),
		IP:          ip,
		UserAgent:   userAgent,
		IssuedAt:    time.Now(),
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour),
	}
	_, err := s.db.Exec(
		`INSERT INTO coupons (id,promotion_id,user_id,code,status,trace_id,ip,user_agent,issued_at,expires_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?)`,
		c.ID, c.PromotionID, c.UserID, c.Code, c.Status, c.TraceID, c.IP, c.UserAgent, c.IssuedAt, c.ExpiresAt,
	)
	return c, err
}

func (s *CouponService) GetByCode(code string) (*model.Coupon, error) {
	c := &model.Coupon{}
	err := s.db.QueryRow(
		`SELECT id,promotion_id,user_id,code,status,trace_id,COALESCE(ip,''),COALESCE(user_agent,''),issued_at,expires_at
		 FROM coupons WHERE code=?`, code,
	).Scan(&c.ID, &c.PromotionID, &c.UserID, &c.Code, &c.Status, &c.TraceID, &c.IP, &c.UserAgent, &c.IssuedAt, &c.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *CouponService) Use(code string) error {
	return s.UseWithOrder(code, "", 0, 0)
}

func (s *CouponService) UseWithOrder(code, orderID string, originalAmount, discountAmount float64) error {
	res, err := s.db.Exec(
		`UPDATE coupons SET status='used' WHERE code=? AND status='issued' AND expires_at > NOW()`,
		code,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c, _ := s.GetByCode(code)
		if c == nil {
			return fmt.Errorf("coupon %s not found", code)
		}
		if c.Status != "issued" {
			return fmt.Errorf("coupon %s status is %s", code, c.Status)
		}
		return fmt.Errorf("coupon %s expired at %s", code, c.ExpiresAt.Format("2006-01-02"))
	}

	if orderID != "" {
		s.db.Exec(
			`UPDATE orders SET coupon_code=?, original_amount=?, discount_amount=? WHERE id=?`,
			code, originalAmount, discountAmount, orderID,
		)
	}
	return nil
}

func (s *CouponService) ListByUser(userID string) ([]model.Coupon, error) {
	rows, err := s.db.Query(
		`SELECT id,promotion_id,user_id,code,status,trace_id,COALESCE(ip,''),COALESCE(user_agent,''),issued_at,expires_at
		 FROM coupons WHERE user_id=? ORDER BY issued_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.Coupon
	for rows.Next() {
		var c model.Coupon
		if err := rows.Scan(&c.ID, &c.PromotionID, &c.UserID, &c.Code, &c.Status,
			&c.TraceID, &c.IP, &c.UserAgent, &c.IssuedAt, &c.ExpiresAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, nil
}
