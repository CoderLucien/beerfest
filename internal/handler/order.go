package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type createOrderReq struct {
	ActivityID     string  `json:"activity_id" binding:"required"`
	Amount         float64 `json:"amount" binding:"required"`
	CouponCode     string  `json:"coupon_code"`
	OriginalAmount float64 `json:"original_amount"`
	DiscountAmount float64 `json:"discount_amount"`
}

func CreateOrder(s *service.OrderService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createOrderReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "activity_id and amount required"})
			return
		}
		userID, _ := c.Get("user_id")
		o, err := s.Create(req.ActivityID, userID.(string), req.CouponCode, req.Amount, req.OriginalAmount, req.DiscountAmount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, o)
	}
}

func ListAdminOrders(s *service.OrderService) gin.HandlerFunc {
	return func(c *gin.Context) {
		activityID := c.Query("activity_id")
		if activityID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "activity_id required"})
			return
		}
		minAmount := 0.0
		if v := c.Query("min_amount"); v != "" {
			minAmount, _ = strconv.ParseFloat(v, 64)
		}
		limit := 50
		if v := c.Query("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
				limit = n
			}
		}
		offset := 0
		if v := c.Query("offset"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n >= 0 {
				offset = n
			}
		}
		list, err := s.ListAll(activityID, minAmount, limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, list)
	}
}

func ListMyOrders(s *service.OrderService) gin.HandlerFunc {
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
