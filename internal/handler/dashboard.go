package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

func Dashboard(s *service.DashboardService) gin.HandlerFunc {
	return func(c *gin.Context) {
		activityID := c.Param("activity_id")
		m, err := s.Metrics(activityID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, m)
	}
}
