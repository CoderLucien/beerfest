package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type createSegmentReq struct {
	Name string         `json:"name" binding:"required"`
	Rule map[string]any `json:"rule" binding:"required"`
}

type updateSegmentRuleReq struct {
	Rule map[string]any `json:"rule" binding:"required"`
}

func CreateSegment(s *service.SegmentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createSegmentReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		seg, err := s.Create(req.Name, req.Rule)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, seg)
	}
}

func UpdateSegmentRule(s *service.SegmentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req updateSegmentRuleReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := s.UpdateRule(c.Param("id"), req.Rule); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "updated",
			"message": "rule updated, version incremented — existing qualifications invalidated",
		})
	}
}
