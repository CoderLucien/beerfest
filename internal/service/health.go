package service

import (
	"context"
	"database/sql"
	"time"

	"github.com/redis/go-redis/v9"
)

type HealthService struct {
	db    *sql.DB
	redis *redis.Client
	start time.Time
}

func NewHealthService(db *sql.DB, rdb *redis.Client) *HealthService {
	return &HealthService{db: db, redis: rdb, start: time.Now()}
}

type ComponentStatus struct {
	Status  string `json:"status"`
	Latency string `json:"latency,omitempty"`
	Error   string `json:"error,omitempty"`
}

type HealthResult struct {
	Status     string                    `json:"status"`
	Uptime     string                    `json:"uptime"`
	Components map[string]ComponentStatus `json:"components"`
}

func (s *HealthService) Check() *HealthResult {
	r := &HealthResult{
		Status:     "healthy",
		Uptime:     time.Since(s.start).Round(time.Second).String(),
		Components: make(map[string]ComponentStatus),
	}

	// DB check
	dbStart := time.Now()
	if err := s.db.Ping(); err != nil {
		r.Status = "degraded"
		r.Components["database"] = ComponentStatus{
			Status: "unhealthy",
			Error:  err.Error(),
		}
	} else {
		r.Components["database"] = ComponentStatus{
			Status:  "healthy",
			Latency: time.Since(dbStart).Round(time.Microsecond).String(),
		}
	}

	// Redis check
	redisStart := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := s.redis.Ping(ctx).Err(); err != nil {
		r.Status = "degraded"
		r.Components["redis"] = ComponentStatus{
			Status: "unhealthy",
			Error:  err.Error(),
		}
	} else {
		r.Components["redis"] = ComponentStatus{
			Status:  "healthy",
			Latency: time.Since(redisStart).Round(time.Microsecond).String(),
		}
	}

	return r
}
