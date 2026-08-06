package service

import (
	"database/sql"

	"github.com/redis/go-redis/v9"
)

type Registry struct {
	DB         *sql.DB
	Redis      *redis.Client
	Promotion  *PromotionService
	Activity   *ActivityService
	Coupon     *CouponService
	Dashboard  *DashboardService
	Experiment *ExperimentService
	Segment    *SegmentService
}

func NewRegistry(db *sql.DB, redis *redis.Client) *Registry {
	r := &Registry{DB: db, Redis: redis}
	r.Promotion = &PromotionService{db: db}
	r.Activity = &ActivityService{db: db}
	r.Coupon = &CouponService{db: db}
	r.Dashboard = &DashboardService{db: db}
	r.Experiment = &ExperimentService{db: db}
	r.Segment = &SegmentService{db: db}
	return r
}
