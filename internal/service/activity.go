package service

import (
	"database/sql"
	"time"

	"github.com/google/uuid"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

type ActivityService struct{ db *sql.DB }

func (s *ActivityService) Create(name string, start, end time.Time) (*model.Activity, error) {
	a := &model.Activity{
		ID:         uuid.New().String(),
		Name:       name,
		Status:     "draft",
		StartTime:  start,
		EndTime:    end,
		WorkflowID: uuid.New().String(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	_, err := s.db.Exec(
		`INSERT INTO activities (id,name,status,start_time,end_time,workflow_id,created_at,updated_at)
		 VALUES (?,?,?,?,?,?,?,?)`,
		a.ID, a.Name, a.Status, a.StartTime, a.EndTime, a.WorkflowID, a.CreatedAt, a.UpdatedAt,
	)
	return a, err
}

func (s *ActivityService) Get(id string) (*model.Activity, error) {
	a := &model.Activity{}
	err := s.db.QueryRow(
		`SELECT id,name,status,start_time,end_time,workflow_id,created_at,updated_at
		 FROM activities WHERE id=?`, id,
	).Scan(&a.ID, &a.Name, &a.Status, &a.StartTime, &a.EndTime, &a.WorkflowID, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (s *ActivityService) UpdateStatus(id, status string) error {
	_, err := s.db.Exec(
		`UPDATE activities SET status=?, updated_at=? WHERE id=?`,
		status, time.Now(), id,
	)
	return err
}

func (s *ActivityService) List() ([]model.Activity, error) {
	rows, err := s.db.Query(
		`SELECT id,name,status,start_time,end_time,workflow_id,created_at,updated_at
		 FROM activities ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.Activity
	for rows.Next() {
		var a model.Activity
		if err := rows.Scan(&a.ID, &a.Name, &a.Status, &a.StartTime, &a.EndTime,
			&a.WorkflowID, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, nil
}
