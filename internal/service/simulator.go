package service

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

type Simulator struct {
	db  *sql.DB
	rng *rand.Rand
}

func NewSimulator(db *sql.DB, seed int64) *Simulator {
	return &Simulator{
		db:  db,
		rng: rand.New(rand.NewSource(seed)),
	}
}

type SimulationResult struct {
	OrdersCreated  int     `json:"orders_created"`
	CouponsIssued  int     `json:"coupons_issued"`
	CouponsUsed    int     `json:"coupons_used"`
	Revenue        float64 `json:"revenue"`
	AnomaliesFound int     `json:"anomalies_found"`
}

func (s *Simulator) RunBusinessDay(activityID string, day int) (*SimulationResult, error) {
	log.Printf("[sim] day=%d activity=%s", day, activityID)

	result := &SimulationResult{}
	users := 100 + s.rng.Intn(200)

	for i := 0; i < users; i++ {
		userID := fmt.Sprintf("u%04d", i)

		if s.rng.Float64() < 0.3 {
			result.CouponsIssued++
			promoID := uuid.New().String()
			s.db.Exec(
				`INSERT INTO coupons (id,promotion_id,user_id,code,status,trace_id,issued_at,expires_at)
				 VALUES (?,?,?,?,?,?,?,?)`,
				uuid.New().String(), promoID, userID,
				fmt.Sprintf("CP-%s-%d", userID, day),
				"issued", uuid.New().String(),
				time.Now(), time.Now().Add(7*24*time.Hour),
			)
		}

		if s.rng.Float64() < 0.4 {
			result.OrdersCreated++
			amount := 50.0 + s.rng.Float64()*200.0
			result.Revenue += amount
			s.db.Exec(
				`INSERT INTO orders (id,activity_id,user_id,amount,trace_id,created_at)
				 VALUES (?,?,?,?,?,?)`,
				uuid.New().String(), activityID, userID, amount,
				uuid.New().String(), time.Now(),
			)
		}

		if s.rng.Float64() < 0.15 {
			result.CouponsUsed++
		}
	}

	if s.rng.Float64() < 0.1 {
		result.AnomaliesFound = 1
		log.Printf("[sim] anomaly detected on day %d", day)
		if _, err := AutoSuspend(s.db, activityID); err != nil {
			log.Printf("[sim] auto-suspend error: %v", err)
		}
	}

	return result, nil
}

func (s *Simulator) RunFullScenario(activityID string) ([]*SimulationResult, error) {
	var results []*SimulationResult
	for day := 1; day <= 14; day++ {
		r, err := s.RunBusinessDay(activityID, day)
		if err != nil {
			return results, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (s *Simulator) DB() *sql.DB { return s.db }
