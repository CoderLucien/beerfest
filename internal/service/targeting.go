package service

import (
	"database/sql"
	"log"
)

func ReQualify(db *sql.DB, segmentID string) (int, error) {
	segSvc := &SegmentService{db: db}
	rows, err := db.Query(`SELECT DISTINCT user_id FROM orders`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		ok, err := segSvc.Evaluate(segmentID, userID)
		if err != nil {
			log.Printf("[re-qualify] evaluate error user=%s: %v", userID, err)
			continue
		}
		if ok {
			count++
		}
	}
	log.Printf("[re-qualify] segment=%s qualifying_users=%d", segmentID, count)
	return count, nil
}

func SetPromotionSegments(db *sql.DB, promotionID string, segmentIDs []string) error {
	for _, segID := range segmentIDs {
		_, err := db.Exec(
			`INSERT INTO promotion_segments (promotion_id, segment_id) VALUES (?,?)
			 ON DUPLICATE KEY UPDATE promotion_id=promotion_id`,
			promotionID, segID,
		)
		if err != nil {
			return err
		}
	}
	log.Printf("[targeting] promotion=%s linked to %d segments", promotionID, len(segmentIDs))
	return nil
}
