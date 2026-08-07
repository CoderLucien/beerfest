package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type createOrderReq struct {
	ActivityID string  `json:"activity_id" binding:"required"`
	Amount     float64 `json:"amount" binding:"required"`
}

func CreateOrder(s *service.OrderService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createOrderReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "activity_id and amount required"})
			return
		}
		userID, _ := c.Get("user_id")
		o, err := s.Create(req.ActivityID, userID.(string), req.Amount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, o)
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
