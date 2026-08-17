package config

import (
	"crypto/tls"
	"fmt"
	"os"

	"github.com/go-sql-driver/mysql"
)

type Config struct {
	Port      string
	DBHost    string
	DBPort    string
	DBUser    string
	DBPass    string
	DBName    string
	DBTLS     string
	RedisAddr string
}

func Load() (*Config, error) {
	dbPass := os.Getenv("DB_PASSWORD")
	if dbPass == "" {
		return nil, fmt.Errorf("DB_PASSWORD is not set: copy .env.example to .env and fill in your database credentials")
	}
	return &Config{
		Port:      env("PORT", "8080"),
		DBHost:    env("DB_HOST", "localhost"),
		DBPort:    env("DB_PORT", "4000"),
		DBUser:    env("DB_USER", "beerfest"),
		DBPass:    dbPass,
		DBName:    env("DB_NAME", "beerfest"),
		DBTLS:     env("DB_TLS", ""),
		RedisAddr: env("REDIS_ADDR", "localhost:6379"),
	}, nil
}

func (c *Config) DatabaseURL() string {
	dsn := c.DBUser + ":" + c.DBPass +
		"@tcp(" + c.DBHost + ":" + c.DBPort + ")/" + c.DBName + "?parseTime=true&multiStatements=true"
	if c.DBTLS != "" {
		dsn += "&tls=" + c.DBTLS
	}
	return dsn
}

func (c *Config) RegisterTLS() {
	if c.DBTLS == "" {
		return
	}
	mysql.RegisterTLSConfig(c.DBTLS, &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: c.DBHost,
	})
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
