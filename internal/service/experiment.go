package service

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

type ExperimentService struct{ db *sql.DB }

func (s *ExperimentService) Create(activityID, name string, variantA, variantB map[string]any) (*model.Experiment, error) {
	va, _ := json.Marshal(variantA)
	vb, _ := json.Marshal(variantB)
	e := &model.Experiment{
		ID:         uuid.New().String(),
		ActivityID: activityID,
		Name:       name,
		VariantA:   string(va),
		VariantB:   string(vb),
		Status:     "draft",
		TraceID:    uuid.New().String(),
		CreatedAt:  time.Now(),
	}
	_, err := s.db.Exec(
		`INSERT INTO experiments (id,activity_id,name,variant_a,variant_b,status,trace_id,created_at)
		 VALUES (?,?,?,?,?,?,?,?)`,
		e.ID, e.ActivityID, e.Name, e.VariantA, e.VariantB, e.Status, e.TraceID, e.CreatedAt,
	)
	return e, err
}

func (s *ExperimentService) Start(id string) error {
	res, err := s.db.Exec(`UPDATE experiments SET status='running' WHERE id=? AND status='draft'`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *ExperimentService) Complete(id, result string) error {
	res, err := s.db.Exec(
		`UPDATE experiments SET status='completed', result=?, completed_at=? WHERE id=? AND status='running'`,
		result, time.Now(), id,
	)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
