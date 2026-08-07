package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

type opsChatReq struct {
	Question   string `json:"question" binding:"required"`
	ActivityID string `json:"activity_id,omitempty"`
}

func OpsChat(s *service.OpsChatService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req opsChatReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "question required"})
			return
		}
		result, err := s.Chat(req.Question, req.ActivityID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}
