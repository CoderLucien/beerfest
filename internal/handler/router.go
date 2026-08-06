package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/CoderLucien/beerfest-api/internal/service"
)

func RegisterRoutes(r *gin.Engine, s *service.Registry) {
	api := r.Group("/api/v1")
	{
		// Dashboard
		api.GET("/dashboard/:activity_id", Dashboard(s.Dashboard))

		// Activities
		api.POST("/activities", CreateActivity(s.Activity))
		api.GET("/activities", ListActivities(s.Activity))
		api.GET("/activities/:id", GetActivity(s.Activity))
		api.PUT("/activities/:id/status", UpdateActivityStatus(s.Activity))

		// Promotions
		api.POST("/promotions", CreatePromotion(s.Promotion))
		api.GET("/promotions/:id", GetPromotion(s.Promotion))
		api.GET("/activities/:id/promotions", ListPromotionsByActivity(s.Promotion))
		api.POST("/promotions/:id/approve", ApprovePromotion(s.Promotion))
		api.POST("/promotions/:id/suspend", SuspendPromotion(s.Promotion))

		// Coupons
		api.POST("/coupons", IssueCoupon(s.Coupon))
		api.POST("/coupons/:code/use", UseCoupon(s.Coupon))
		api.GET("/coupons/user/:user_id", ListUserCoupons(s.Coupon))

		// Experiments
		api.POST("/experiments", CreateExperiment(s.Experiment))
		api.POST("/experiments/:id/start", StartExperiment(s.Experiment))
		api.POST("/experiments/:id/complete", CompleteExperiment(s.Experiment))

		// Customer Segments (V2)
		api.POST("/segments", CreateSegment(s.Segment))
		api.PUT("/segments/:id/rule", UpdateSegmentRule(s.Segment))

		// Simulator (M4)
		api.POST("/simulate", RunSimulation(s.DB))
	}
}
