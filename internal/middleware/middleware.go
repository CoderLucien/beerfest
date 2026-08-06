package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TraceID() gin.HandlerFunc {
	return func(c *gin.Context) {
		traceID := c.GetHeader("X-Trace-ID")
		if traceID == "" {
			traceID = uuid.New().String()
		}
		c.Set("trace_id", traceID)
		c.Header("X-Trace-ID", traceID)

		activityID := c.GetHeader("X-Activity-ID")
		if activityID != "" {
			c.Set("activity_id", activityID)
		}
		workflowID := c.GetHeader("X-Workflow-ID")
		if workflowID != "" {
			c.Set("workflow_id", workflowID)
		}

		c.Next()
	}
}

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		latency := time.Since(start)
		traceID, _ := c.Get("trace_id")
		log.Printf("[%s] %s %s %d %v",
			traceID, c.Request.Method, c.Request.URL.Path,
			c.Writer.Status(), latency)
	}
}
