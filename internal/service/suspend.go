package service

import (
	"database/sql"
	"log"
	"time"
)

func AutoSuspend(db *sql.DB, activityID string) (int, error) {
	res, err := db.Exec(
		`UPDATE promotions SET status='suspended', updated_at=?
		 WHERE status='active' AND activity_id IN
		 (SELECT id FROM activities WHERE end_time < ?)`,
		time.Now(), time.Now(),
	)
	if err != nil {
		log.Printf("[auto-suspend] error: %v", err)
		return 0, err
	}
	n, _ := res.RowsAffected()
	if n > 0 {
		log.Printf("[auto-suspend] suspended %d expired promotions", n)
	}
	return int(n), nil
}
