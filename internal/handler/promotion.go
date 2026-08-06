package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type createPromotionReq struct {
	ActivityID string `json:"activity_id" binding:"required"`
	Name       string `json:"name" binding:"required"`
	Type       string `json:"type" binding:"required"`
	Rule       string `json:"rule"`
}

func CreatePromotion(s *service.PromotionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createPromotionReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if !validPromotionType(req.Type) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid type, must be discount|coupon|bundle"})
			return
		}
		p, err := s.Create(req.ActivityID, req.Name, req.Type, req.Rule)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, p)
	}
}

func GetPromotion(s *service.PromotionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		p, err := s.Get(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusOK, p)
	}
}

func ListPromotionsByActivity(s *service.PromotionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		list, err := s.ListByActivity(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, list)
	}
}

func ApprovePromotion(s *service.PromotionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := s.Approve(c.Param("id"), "admin"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "approved"})
	}
}

func SuspendPromotion(s *service.PromotionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := s.Suspend(c.Param("id")); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "suspended"})
	}
}

func validPromotionType(t string) bool {
	switch t {
	case "discount", "coupon", "bundle":
		return true
	}
	return false
}
