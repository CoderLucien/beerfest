package handler

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type simulateReq struct {
	ActivityID string `json:"activity_id" binding:"required"`
	Days       int    `json:"days"`
	Seed       int64  `json:"seed"`
}

func RunSimulation(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req simulateReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if req.Days <= 0 {
			req.Days = 1
		}

		sim := service.NewSimulator(db, req.Seed)
		var results []*service.SimulationResult
		for day := 1; day <= req.Days; day++ {
			r, err := sim.RunBusinessDay(req.ActivityID, day)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			results = append(results, r)
		}

		var total service.SimulationResult
		for _, r := range results {
			total.OrdersCreated += r.OrdersCreated
			total.CouponsIssued += r.CouponsIssued
			total.CouponsUsed += r.CouponsUsed
			total.Revenue += r.Revenue
			total.AnomaliesFound += r.AnomaliesFound
		}

		c.JSON(http.StatusOK, gin.H{
			"days":    req.Days,
			"seed":    req.Seed,
			"daily":   results,
			"summary": total,
		})
	}
}
