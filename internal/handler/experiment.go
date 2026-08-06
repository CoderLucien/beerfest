package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type createExperimentReq struct {
	ActivityID string         `json:"activity_id" binding:"required"`
	Name       string         `json:"name" binding:"required"`
	VariantA   map[string]any `json:"variant_a" binding:"required"`
	VariantB   map[string]any `json:"variant_b" binding:"required"`
}

type completeExperimentReq struct {
	Result string `json:"result" binding:"required"`
}

func CreateExperiment(s *service.ExperimentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createExperimentReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		e, err := s.Create(req.ActivityID, req.Name, req.VariantA, req.VariantB)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, e)
	}
}

func StartExperiment(s *service.ExperimentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := s.Start(c.Param("id")); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "running"})
	}
}

func CompleteExperiment(s *service.ExperimentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req completeExperimentReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := s.Complete(c.Param("id"), req.Result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "completed", "result": req.Result})
	}
}
