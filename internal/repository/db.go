package repository

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

func NewDB(dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	log.Println("connected to TiDB")
	return db, nil
}

func NewRedis(addr string) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	return rdb, nil
}

func Migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS activities (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		status VARCHAR(32) NOT NULL DEFAULT 'draft',
		start_time DATETIME,
		end_time DATETIME,
		workflow_id VARCHAR(64),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS promotions (
		id VARCHAR(64) PRIMARY KEY,
		activity_id VARCHAR(64),
		name VARCHAR(255) NOT NULL,
		type VARCHAR(32) NOT NULL,
		rule JSON,
		status VARCHAR(32) NOT NULL DEFAULT 'draft',
		workflow_id VARCHAR(64),
		approved_by VARCHAR(64),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS coupons (
		id VARCHAR(64) PRIMARY KEY,
		promotion_id VARCHAR(64),
		user_id VARCHAR(64) NOT NULL,
		code VARCHAR(128) UNIQUE NOT NULL,
		status VARCHAR(32) NOT NULL DEFAULT 'issued',
		trace_id VARCHAR(64),
		issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		expires_at DATETIME
	);
	CREATE TABLE IF NOT EXISTS customer_segments (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		rule JSON NOT NULL,
		version INT DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS experiments (
		id VARCHAR(64) PRIMARY KEY,
		activity_id VARCHAR(64),
		name VARCHAR(255) NOT NULL,
		variant_a JSON,
		variant_b JSON,
		status VARCHAR(32) NOT NULL DEFAULT 'draft',
		result TEXT,
		trace_id VARCHAR(64),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS orders (
		id VARCHAR(64) PRIMARY KEY,
		activity_id VARCHAR(64),
		user_id VARCHAR(64) NOT NULL,
		amount DECIMAL(12,2) NOT NULL DEFAULT 0,
		trace_id VARCHAR(64),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS promotion_segments (
		promotion_id VARCHAR(64),
		segment_id VARCHAR(64),
		PRIMARY KEY (promotion_id, segment_id)
	);
	`
	_, err := db.Exec(schema)
	if err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	log.Println("migrations applied")
	return nil
}
