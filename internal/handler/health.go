package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

func Health(s *service.HealthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		r := s.Check()
		code := http.StatusOK
		if r.Status != "healthy" {
			code = http.StatusServiceUnavailable
		}
		c.JSON(code, r)
	}
}
