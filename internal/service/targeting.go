package service

import (
	"database/sql"
	"log"
)

func ReQualify(db *sql.DB, segmentID string) (int, error) {
	rows, err := db.Query(`SELECT id, rule FROM customer_segments WHERE id=?`, segmentID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, rule string
		if err := rows.Scan(&id, &rule); err != nil {
			continue
		}
		count++
	}
	log.Printf("[re-qualify] segment=%s affected_users=%d", segmentID, count)
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
