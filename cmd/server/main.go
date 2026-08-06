package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"

	"github.com/CoderLucien/beerfest-api/internal/config"
	"github.com/CoderLucien/beerfest-api/internal/handler"
	"github.com/CoderLucien/beerfest-api/internal/middleware"
	"github.com/CoderLucien/beerfest-api/internal/repository"
	"github.com/CoderLucien/beerfest-api/internal/service"
)

func main() {
	cfg := config.Load()
	cfg.RegisterTLS()

	db, err := repository.NewDB(cfg.DatabaseURL())
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	defer db.Close()

	redis, err := repository.NewRedis(cfg.RedisAddr)
	if err != nil {
		log.Fatalf("failed to connect redis: %v", err)
	}
	defer redis.Close()

	if err := repository.Migrate(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	r := gin.Default()
	r.Use(middleware.TraceID())
	r.Use(middleware.Logger())

	handler.RegisterRoutes(r, service.NewRegistry(db, redis))

	port := cfg.Port
	if port == "" {
		port = "8080"
	}
	log.Printf("beerfest-api starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
		os.Exit(1)
	}
}
