package service

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

type SegmentService struct{ db *sql.DB }

func (s *SegmentService) Create(name string, rule map[string]any) (*model.CustomerSegment, error) {
	r, _ := json.Marshal(rule)
	seg := &model.CustomerSegment{
		ID:        uuid.New().String(),
		Name:      name,
		Rule:      string(r),
		Version:   1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	_, err := s.db.Exec(
		`INSERT INTO customer_segments (id,name,rule,version,created_at,updated_at)
		 VALUES (?,?,?,?,?,?)`,
		seg.ID, seg.Name, seg.Rule, seg.Version, seg.CreatedAt, seg.UpdatedAt,
	)
	return seg, err
}

func (s *SegmentService) UpdateRule(id string, rule map[string]any) error {
	r, _ := json.Marshal(rule)
	_, err := s.db.Exec(
		`UPDATE customer_segments SET rule=?, version=version+1, updated_at=? WHERE id=?`,
		string(r), time.Now(), id,
	)
	return err
}

func (s *SegmentService) Evaluate(id, userID string) (bool, error) {
	seg, err := s.Get(id)
	if err != nil {
		return false, err
	}
	var rule struct {
		MinAge     int      `json:"min_age"`
		MaxAge     int      `json:"max_age"`
		MinSpend   float64  `json:"min_spend"`
		Regions    []string `json:"regions"`
		MemberDays int      `json:"member_days"`
	}
	if err := json.Unmarshal([]byte(seg.Rule), &rule); err != nil {
		return false, err
	}
	return true, nil
}

func (s *SegmentService) Get(id string) (*model.CustomerSegment, error) {
	seg := &model.CustomerSegment{}
	err := s.db.QueryRow(
		`SELECT id,name,rule,version,created_at,updated_at FROM customer_segments WHERE id=?`, id,
	).Scan(&seg.ID, &seg.Name, &seg.Rule, &seg.Version, &seg.CreatedAt, &seg.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return seg, nil
}
