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
		`SELECT id, activity_id, user_id, amount, COALESCE(trace_id,''), created_at, completed_at
		 FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.Order
	for rows.Next() {
		var o model.Order
		if err := rows.Scan(&o.ID, &o.ActivityID, &o.UserID, &o.Amount, &o.TraceID, &o.CreatedAt, &o.CompletedAt); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	return list, nil
}

func (s *OrderService) Create(activityID, userID string, amount float64) (*model.Order, error) {
	o := &model.Order{
		ID:         uuid.New().String(),
		ActivityID: activityID,
		UserID:     userID,
		Amount:     amount,
		TraceID:    uuid.New().String(),
		CreatedAt:  time.Now(),
	}
	_, err := s.db.Exec(
		`INSERT INTO orders (id, activity_id, user_id, amount, trace_id, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		o.ID, o.ActivityID, o.UserID, o.Amount, o.TraceID, o.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return o, nil
}
