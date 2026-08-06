package service

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

type PromotionService struct{ db *sql.DB }

func (s *PromotionService) Create(activityID, name, ptype, ruleJSON string) (*model.Promotion, error) {
	var rule json.RawMessage
	if ruleJSON == "" {
		rule = json.RawMessage("{}")
	} else {
		rule = json.RawMessage(ruleJSON)
	}
	p := &model.Promotion{
		ID:         uuid.New().String(),
		ActivityID: activityID,
		Name:       name,
		Type:       ptype,
		Rule:       string(rule),
		Status:     "draft",
		WorkflowID: uuid.New().String(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	_, err := s.db.Exec(
		`INSERT INTO promotions (id,activity_id,name,type,rule,status,workflow_id,created_at,updated_at)
		 VALUES (?,?,?,?,?,?,?,?,?)`,
		p.ID, p.ActivityID, p.Name, p.Type, p.Rule, p.Status, p.WorkflowID, p.CreatedAt, p.UpdatedAt,
	)
	return p, err
}

func (s *PromotionService) Get(id string) (*model.Promotion, error) {
	p := &model.Promotion{}
	var approvedBy sql.NullString
	err := s.db.QueryRow(
		`SELECT id,activity_id,name,type,rule,status,workflow_id,approved_by,created_at,updated_at
		 FROM promotions WHERE id=?`, id,
	).Scan(&p.ID, &p.ActivityID, &p.Name, &p.Type, &p.Rule, &p.Status, &p.WorkflowID,
		&approvedBy, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if approvedBy.Valid {
		p.ApprovedBy = approvedBy.String
	}
	return p, nil
}

func (s *PromotionService) Approve(id, approver string) error {
	_, err := s.db.Exec(
		`UPDATE promotions SET status='active', approved_by=?, updated_at=? WHERE id=?`,
		approver, time.Now(), id,
	)
	return err
}

func (s *PromotionService) Suspend(id string) error {
	_, err := s.db.Exec(
		`UPDATE promotions SET status='suspended', updated_at=? WHERE id=?`,
		time.Now(), id,
	)
	return err
}

func (s *PromotionService) ListByActivity(activityID string) ([]model.Promotion, error) {
	rows, err := s.db.Query(
		`SELECT id,activity_id,name,type,rule,status,workflow_id,approved_by,created_at,updated_at
		 FROM promotions WHERE activity_id=? ORDER BY created_at DESC`, activityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.Promotion
	for rows.Next() {
		var p model.Promotion
		var approvedBy sql.NullString
		if err := rows.Scan(&p.ID, &p.ActivityID, &p.Name, &p.Type, &p.Rule, &p.Status,
			&p.WorkflowID, &approvedBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if approvedBy.Valid {
			p.ApprovedBy = approvedBy.String
		}
		list = append(list, p)
	}
	return list, nil
}
