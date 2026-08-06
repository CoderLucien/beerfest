package config

import "os"

type Config struct {
	Port      string
	DBHost    string
	DBPort    string
	DBUser    string
	DBPass    string
	DBName    string
	RedisAddr string
}

func Load() *Config {
	return &Config{
		Port:      env("PORT", "8080"),
		DBHost:    env("DB_HOST", "localhost"),
		DBPort:    env("DB_PORT", "5432"),
		DBUser:    env("DB_USER", "beerfest"),
		DBPass:    env("DB_PASSWORD", "beerfest"),
		DBName:    env("DB_NAME", "beerfest"),
		RedisAddr: env("REDIS_ADDR", "localhost:6379"),
	}
}

func (c *Config) DatabaseURL() string {
	return c.DBUser + ":" + c.DBPass +
		"@tcp(" + c.DBHost + ":" + c.DBPort + ")/" + c.DBName + "?parseTime=true"
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
