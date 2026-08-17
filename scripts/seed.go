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

	now := time.Now()

	// Activities — 3 themes for demo show, each with its own promotion set
	type promoDef struct{ name, ptype, rule string }
	activities := []struct {
		name   string
		status string
		start  time.Time
		end    time.Time
		promos []promoDef
	}{
		{
			"啤酒节 2026 智慧营销", "active",
			now.Add(-7 * 24 * time.Hour), now.Add(23 * 24 * time.Hour),
			[]promoDef{
				// Tier 1: new-player guarantee (weight 15 each)
				{"全场9折", "discount", `{"rate":0.9}`},
				{"满50减10", "coupon", `{"threshold":50,"discount":10}`},
				// Tier 2: common rewards
				{"满100减30", "coupon", `{"threshold":100,"discount":30}`},
				{"啤酒+烧烤套餐", "bundle", `{"items":["beer","bbq"],"price":88}`},
				{"满2瓶送1瓶", "coupon", `{"threshold":2,"discount":0,"desc":"买2得3"}`},
				{"小食免单券", "coupon", `{"threshold":58,"discount":58}`},
				// Tier 3: premium rewards
				{"满200减60", "coupon", `{"threshold":200,"discount":60}`},
				{"全场8折", "discount", `{"rate":0.8}`},
				{"满300减50", "coupon", `{"threshold":300,"discount":50}`},
				// Tier 4: rare jackpot
				{"满168减68", "coupon", `{"threshold":168,"discount":68}`},
			},
		},
		{
			"精酿专场", "active",
			now, now.Add(14 * 24 * time.Hour),
			[]promoDef{
				{"精酿买一送一", "bundle", `{"items":["craft_beer"],"price":45}`},
				{"精酿品鉴套餐", "bundle", `{"items":["craft_beer","snacks"],"price":98}`},
				{"满150减40", "coupon", `{"threshold":150,"discount":40}`},
			},
		},
		{
			"音乐嘉年华", "draft",
			now.Add(7 * 24 * time.Hour), now.Add(21 * 24 * time.Hour),
			[]promoDef{
				{"演出套餐", "bundle", `{"items":["show_ticket","beer"],"price":128}`},
				{"满300减100", "coupon", `{"threshold":300,"discount":100}`},
				{"嘉年华9折", "discount", `{"rate":0.9}`},
			},
		},
	}

	var promoIDs []string
	mainActivityID := ""
	for i, act := range activities {
		id := uuid.New().String()
		if i == 0 {
			mainActivityID = id
		}
		_, err := db.Exec(
			`INSERT INTO activities (id,name,status,start_time,end_time,workflow_id,created_at,updated_at)
			 VALUES (?,?,?,?,?,?,?,?)`,
			id, act.name, act.status, act.start, act.end,
			uuid.New().String(), now, now,
		)
		if err != nil {
			return fmt.Errorf("seed activity %s: %w", act.name, err)
		}
		for _, pt := range act.promos {
			pid := uuid.New().String()
			db.Exec(
				`INSERT INTO promotions (id,activity_id,name,type,rule,status,workflow_id,created_at,updated_at)
				 VALUES (?,?,?,?,?,?,?,?,?)`,
				pid, id, pt.name, pt.ptype, pt.rule, "active",
				uuid.New().String(), now, now,
			)
			promoIDs = append(promoIDs, pid)
		}
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

	// Create an A/B experiment on the main activity
	db.Exec(
		`INSERT INTO experiments (id,activity_id,name,variant_a,variant_b,status,trace_id,created_at)
		 VALUES (?,?,?,?,?,?,?,?)`,
		uuid.New().String(), mainActivityID, "首推促销对用户转化率的影响",
		`{"name":"满减策略","threshold":200,"amount":50}`,
		`{"name":"折扣策略","rate":0.85}`,
		"running", uuid.New().String(), now,
	)

	log.Printf("[seed] done — %d activities, %d promotions, %d user batches, %d segments, 1 experiment",
		len(activities), len(promoIDs), len(userIDs), len(segments))
	return nil
}
