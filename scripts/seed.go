package scripts

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

func Seed(db *sql.DB, seed int64) error {
	rng := rand.New(rand.NewSource(seed))
	log.Printf("[seed] generating demo data with seed=%d", seed)

	activityID := uuid.New().String()
	now := time.Now()
	_, err := db.Exec(
		`INSERT INTO activities (id,name,status,start_time,end_time,workflow_id,created_at,updated_at)
		 VALUES (?,?,?,?,?,?,?,?)`,
		activityID, "啤酒节 2026 智慧营销", "active",
		now.Add(-7*24*time.Hour), now.Add(23*24*time.Hour),
		uuid.New().String(), now, now,
	)
	if err != nil {
		return fmt.Errorf("seed activity: %w", err)
	}

	// Create promotions and track their IDs
	promoTypes := []struct{ name, ptype, rule string }{
		{"全场8折", "discount", `{"rate":0.8}`},
		{"满200减50", "discount", `{"threshold":200,"amount":50}`},
		{"新人专享券", "coupon", `{"amount":30,"min_spend":100}`},
		{"啤酒节限定套餐", "bundle", `{"items":["beer","snack"],"discount":0.75}`},
	}
	var promoIDs []string
	for _, pt := range promoTypes {
		id := uuid.New().String()
		db.Exec(
			`INSERT INTO promotions (id,activity_id,name,type,rule,status,workflow_id,created_at,updated_at)
			 VALUES (?,?,?,?,?,?,?,?,?)`,
			id, activityID, pt.name, pt.ptype, pt.rule, "active",
			uuid.New().String(), now, now,
		)
		promoIDs = append(promoIDs, id)
	}

	// Create seed users and coupons with valid FK references
	userIDs := []string{"u001", "u002", "u003", "u004", "u005"}
	for _, uid := range userIDs {
		for i := 0; i < rng.Intn(3)+1; i++ {
			promoID := promoIDs[rng.Intn(len(promoIDs))]
			db.Exec(
				`INSERT INTO coupons (id,promotion_id,user_id,code,status,trace_id,issued_at,expires_at)
				 VALUES (?,?,?,?,?,?,?,?)`,
				uuid.New().String(), promoID, uid,
				fmt.Sprintf("CP-%s-%d", uid, i), "issued",
				uuid.New().String(), now, now.Add(7*24*time.Hour),
			)
		}
	}

	// Create segment qualification rules
	segments := []struct {
		name string
		rule string
	}{
		{"高频用户", `{"min_spend":500,"member_days":30}`},
		{"新注册用户", `{"member_days":7,"max_age":0}`},
		{"华北区用户", `{"regions":["北京","天津","河北"]}`},
	}
	for _, s := range segments {
		db.Exec(
			`INSERT INTO customer_segments (id,name,rule,version,created_at,updated_at)
			 VALUES (?,?,?,?,?,?)`,
			uuid.New().String(), s.name, s.rule, 1, now, now,
		)
	}

	// Create an A/B experiment
	db.Exec(
		`INSERT INTO experiments (id,activity_id,name,variant_a,variant_b,status,trace_id,created_at)
		 VALUES (?,?,?,?,?,?,?,?)`,
		uuid.New().String(), activityID, "首推促销对用户转化率的影响",
		`{"name":"满减策略","threshold":200,"amount":50}`,
		`{"name":"折扣策略","rate":0.85}`,
		"running", uuid.New().String(), now,
	)

	log.Printf("[seed] done — 1 activity, %d promotions, %d user batches, %d segments, 1 experiment",
		len(promoTypes), len(userIDs), len(segments))
	return nil
}
