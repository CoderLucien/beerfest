package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type issueCouponReq struct {
	PromotionID string `json:"promotion_id" binding:"required"`
}

func IssueCoupon(s *service.CouponService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req issueCouponReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		userID, _ := c.Get("user_id")
		cp, err := s.Issue(req.PromotionID, userID.(string), c.ClientIP(), c.GetHeader("User-Agent"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, cp)
	}
}

func UseCoupon(s *service.CouponService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := s.Use(c.Param("code")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "used"})
	}
}

func ListMyCoupons(s *service.CouponService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		list, err := s.ListByUser(userID.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, list)
	}
}
