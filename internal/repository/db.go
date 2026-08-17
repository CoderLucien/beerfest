package repository

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
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
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			completed_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS orders (
			id VARCHAR(64) PRIMARY KEY,
			activity_id VARCHAR(64),
			user_id VARCHAR(64) NOT NULL,
			amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			trace_id VARCHAR(64),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			completed_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS promotion_segments (
			promotion_id VARCHAR(64),
			segment_id VARCHAR(64),
			PRIMARY KEY (promotion_id, segment_id)
		);
		CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(64) PRIMARY KEY,
			phone VARCHAR(32) UNIQUE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		`
	_, err := db.Exec(schema)
	if err != nil {
		return fmt.Errorf("migrate: %w", err)
	}

	// ALTER migrations for columns added after initial CREATE
	alters := []string{
		`ALTER TABLE experiments ADD COLUMN completed_at DATETIME`,
		`ALTER TABLE orders ADD COLUMN completed_at DATETIME`,
		`ALTER TABLE coupons ADD COLUMN ip VARCHAR(64)`,
		`ALTER TABLE coupons ADD COLUMN user_agent VARCHAR(512)`,
			`ALTER TABLE users ADD COLUMN username VARCHAR(64)`,
			`ALTER TABLE users ADD COLUMN password_hash VARCHAR(256)`,
			`ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'user'`,
	}
	for _, a := range alters {
		if _, err := db.Exec(a); err != nil {
			if strings.Contains(err.Error(), "Error 1060") || strings.Contains(err.Error(), "Duplicate column") {
				continue
			}
			return fmt.Errorf("migrate alter: %w", err)
		}
	}

	log.Println("migrations applied")
		// Seed default admin user
		seedAdmin(db)

	return nil
}

func seedAdmin(db *sql.DB) {
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM users WHERE username='admin'`).Scan(&count)
	if count > 0 {
		return
	}
	pw := os.Getenv("ADMIN_INIT_PASSWORD")
	random := false
	if pw == "" {
		var err error
		pw, err = randomPassword(16)
		if err != nil {
			log.Printf("seed admin: generate password error: %v", err)
			return
		}
		random = true
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("seed admin: bcrypt error: %v", err)
		return
	}
	_, err = db.Exec(
		`INSERT INTO users (id, phone, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
		"admin-001", "00000000000", "admin", string(hash), "admin",
	)
	if err != nil {
		log.Printf("seed admin: insert error: %v", err)
		return
	}
	if random {
		log.Printf("default admin user seeded: username=admin, one-time password=%s (set ADMIN_INIT_PASSWORD env to control it)", pw)
	} else {
		log.Println("default admin user seeded: username=admin, password from ADMIN_INIT_PASSWORD env")
	}
}

func randomPassword(n int) (string, error) {
	const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	for i := range b {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			return "", err
		}
		b[i] = chars[idx.Int64()]
	}
	return string(b), nil
}
