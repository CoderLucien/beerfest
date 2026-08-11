package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/adapter"
	"github.com/CoderLucien/beerfest-api/internal/service"
)

type sendCodeReq struct {
	Phone string `json:"phone" binding:"required"`
}

func SendCode(s *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req sendCodeReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "phone required"})
			return
		}
		if err := s.SendCode(req.Phone, c.ClientIP(), c.GetHeader("User-Agent")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		adapter.MockSMS(req.Phone, "您的验证码已发送，请查收")
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}

type loginReq struct {
	Phone string `json:"phone" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

func Login(s *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req loginReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "phone and code required"})
			return
		}
		token, user, err := s.Login(req.Phone, req.Code, c.ClientIP(), c.GetHeader("User-Agent"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"token":   token,
			"user_id": user.ID,
			"phone":   user.Phone,
		})
	}
}

type adminLoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func AdminLogin(s *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req adminLoginReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username and password required"})
			return
		}
		token, user, err := s.AdminLogin(req.Username, req.Password, c.ClientIP(), c.GetHeader("User-Agent"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"token":    token,
			"user_id":  user.ID,
			"username": user.Username,
			"role":     user.Role,
		})
	}
}

func AdminRefreshToken(s *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" || len(auth) < 8 || auth[:7] != "Bearer " {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			return
		}
		token, err := s.RefreshAdminToken(auth[7:])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token refresh failed: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"token": token})
	}
}

func DemoLogin(s *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, user, err := s.DemoLogin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"token":   token,
			"user_id": user.ID,
			"phone":   user.Phone,
		})
	}
}
