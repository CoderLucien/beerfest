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

	promoIDs, err := s.promotionIDsForActivity(activityID)
	if err != nil {
		return nil, fmt.Errorf("simulator: %w", err)
	}

	result := &SimulationResult{}
	users := 100 + s.rng.Intn(200)
	var issuedCouponCodes []string

	for i := 0; i < users; i++ {
		userID := fmt.Sprintf("u%04d", i)

		if s.rng.Float64() < 0.3 && len(promoIDs) > 0 {
			result.CouponsIssued++
			promoID := promoIDs[s.rng.Intn(len(promoIDs))]
			code := fmt.Sprintf("CP-%s-%d", userID, day)
			issuedCouponCodes = append(issuedCouponCodes, code)
			s.db.Exec(
				`INSERT INTO coupons (id,promotion_id,user_id,code,status,trace_id,issued_at,expires_at)
				 VALUES (?,?,?,?,?,?,?,?)`,
				uuid.New().String(), promoID, userID,
				code,
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

		if s.rng.Float64() < 0.15 && len(issuedCouponCodes) > 0 {
			code := issuedCouponCodes[s.rng.Intn(len(issuedCouponCodes))]
			res, err := s.db.Exec(
				`UPDATE coupons SET status='used' WHERE code=? AND status='issued'`,
				code,
			)
			if err == nil {
				if n, _ := res.RowsAffected(); n > 0 {
					result.CouponsUsed++
				}
			}
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

func (s *Simulator) promotionIDsForActivity(activityID string) ([]string, error) {
	rows, err := s.db.Query(
		`SELECT id FROM promotions WHERE activity_id=? AND status='active'`, activityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
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
