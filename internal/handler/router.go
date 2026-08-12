package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/middleware"
	"github.com/CoderLucien/beerfest-api/internal/service"
)

func RegisterRoutes(r *gin.Engine, s *service.Registry) {
	api := r.Group("/api/v1")
	{
		// Health (public)
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})
		api.GET("/health", Health(s.Health))

		// Auth (public)
		api.POST("/auth/send-code", SendCode(s.Auth))
		api.POST("/auth/login", Login(s.Auth))
		api.POST("/auth/demo-login", DemoLogin(s.Auth))

		// Admin auth (public)
		api.POST("/admin/login", AdminLogin(s.Auth))
		api.POST("/admin/refresh", AdminRefreshToken(s.Auth))

		// Activities (read: public)
		api.GET("/activities", ListActivities(s.Activity))
		api.GET("/activities/:id", GetActivity(s.Activity))

		// Promotions (read: public)
		api.GET("/promotions/:id", GetPromotion(s.Promotion))
		api.GET("/activities/:id/promotions", ListPromotionsByActivity(s.Promotion))

		// Coupons (customer auth)
		auth := api.Group("")
		auth.Use(middleware.AuthRequired())
		{
			auth.POST("/coupons", IssueCoupon(s.Coupon))
			auth.POST("/coupons/:code/use", UseCoupon(s.Coupon))
			auth.GET("/coupons/mine", ListMyCoupons(s.Coupon))
			auth.POST("/orders", CreateOrder(s.Order))
			auth.GET("/orders/mine", ListMyOrders(s.Order))
		}

		// Admin-only operations
		admin := api.Group("")
		admin.Use(middleware.AdminRequired())
		{
			// Dashboard
			admin.GET("/dashboard/:activity_id", Dashboard(s.Dashboard))
			admin.GET("/orders", ListAdminOrders(s.Order))

			// Activities (write)
			admin.POST("/activities", CreateActivity(s.Activity))
			admin.PUT("/activities/:id/status", UpdateActivityStatus(s.Activity))

			// Promotions (write)
			admin.POST("/promotions", CreatePromotion(s.Promotion))
			admin.PUT("/promotions/:id/rule", UpdatePromotionRule(s.Promotion))
			admin.POST("/promotions/:id/approve", ApprovePromotion(s.Promotion))
			admin.POST("/promotions/:id/suspend", SuspendPromotion(s.Promotion))
			admin.GET("/promotions/stats", PromotionStats(s.Promotion))

			// Experiments
			admin.POST("/experiments", CreateExperiment(s.Experiment))
			admin.POST("/experiments/:id/start", StartExperiment(s.Experiment))
			admin.POST("/experiments/:id/complete", CompleteExperiment(s.Experiment))

			// Customer Segments
			admin.POST("/segments", CreateSegment(s.Segment))
			admin.PUT("/segments/:id/rule", UpdateSegmentRule(s.Segment))

			// Simulator
			admin.POST("/simulate", RunSimulation(s.DB))

			// Ops Chat (T4)
			admin.POST("/ops/chat", OpsChat(s.OpsChat))

			// Smart Inquiry (T5)
			admin.POST("/ops/inquire", Inquire(s.Query))
		}
	}
}
