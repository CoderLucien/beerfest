package service

import (
	"database/sql"

	"github.com/redis/go-redis/v9"
)

type Registry struct {
	DB         *sql.DB
	Redis      *redis.Client
	Health     *HealthService
	Promotion  *PromotionService
	Activity   *ActivityService
	Coupon     *CouponService
	Order      *OrderService
	Dashboard  *DashboardService
	Experiment *ExperimentService
	Segment    *SegmentService
	Auth       *AuthService
	OpsChat    *OpsChatService
	Query      *QueryService
}

func NewRegistry(db *sql.DB, rdb *redis.Client) *Registry {
	r := &Registry{DB: db, Redis: rdb}
	r.Health = NewHealthService(db, rdb)
	r.Promotion = &PromotionService{db: db}
	r.Activity = &ActivityService{db: db}
	r.Coupon = &CouponService{db: db}
		r.Order = &OrderService{db: db}
	r.Dashboard = &DashboardService{db: db}
	r.Experiment = &ExperimentService{db: db}
	r.Segment = &SegmentService{db: db}
	r.Auth = NewAuthService(db, rdb)
	r.OpsChat = NewOpsChatService(db, rdb)
	r.Query = NewQueryService(db, rdb)
	return r
}
