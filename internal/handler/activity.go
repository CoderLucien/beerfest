package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type createActivityReq struct {
	Name      string `json:"name" binding:"required"`
	StartTime string `json:"start_time" binding:"required"`
	EndTime   string `json:"end_time" binding:"required"`
}

type statusReq struct {
	Status string `json:"status" binding:"required"`
}

func CreateActivity(s *service.ActivityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createActivityReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		start, err := time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_time format, use RFC3339"})
			return
		}
		end, err := time.Parse(time.RFC3339, req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_time format, use RFC3339"})
			return
		}
		a, err := s.Create(req.Name, start, end)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, a)
	}
}

func GetActivity(s *service.ActivityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		a, err := s.Get(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusOK, a)
	}
}

func ListActivities(s *service.ActivityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		list, err := s.List()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, list)
	}
}

func UpdateActivityStatus(s *service.ActivityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req statusReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if !validActivityStatus(req.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status, must be draft|active|paused|ended"})
			return
		}
		if err := s.UpdateStatus(c.Param("id"), req.Status); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}

func validActivityStatus(s string) bool {
	switch s {
	case "draft", "active", "paused", "ended":
		return true
	}
	return false
}
