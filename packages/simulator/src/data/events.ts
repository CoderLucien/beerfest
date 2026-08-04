import type { BusinessEvent, EventType } from "@beerfest/domain";

export interface PresetEvent {
  type: EventType;
  offsetMs: number;
  payload: Record<string, unknown>;
}

export const PRESET_EVENTS: PresetEvent[] = [
  {
    type: "zone_congestion",
    offsetMs: 30000,
    payload: {
      zone: "zone_a",
      avgWaitTime: 22,
      message: "A 区热门摊位平均排队 22 分钟",
    },
  },
  {
    type: "zone_congestion",
    offsetMs: 30000,
    payload: {
      zone: "zone_b",
      currentVisitors: 260,
      baselineVisitors: 400,
      deviationPercent: -35,
      message: "B 区客流低于基线 35%",
    },
  },
  {
    type: "inventory_updated",
    offsetMs: 35000,
    payload: {
      zone: "zone_b",
      availableItemCount: 420,
      message: "B 区餐饮+文创组合库存 420 份，需在 2 小时内改善周转",
    },
  },
  {
    type: "budget_threshold",
    offsetMs: 40000,
    payload: {
      remainingBudget: 6000,
      message: "当前促销预算剩余 6000 元",
    },
  },
  {
    type: "campaign_created",
    offsetMs: 120000,
    payload: {
      campaignName: "夜游错峰组合券",
      discount: "满 88 减 12",
      maxCoupons: 500,
      validMinutes: 90,
      budgetLimit: 6000,
      targetZone: "zone_b",
    },
  },
  {
    type: "campaign_approved",
    offsetMs: 150000,
    payload: {
      campaignId: "campaign_001",
      approver: "运营管理员",
      decision: "approved",
    },
  },
  {
    type: "campaign_started",
    offsetMs: 180000,
    payload: {
      campaignId: "campaign_001",
      status: "running",
    },
  },
  {
    type: "coupon_claimed",
    offsetMs: 200000,
    payload: {
      campaignId: "campaign_001",
      visitorId: "demo_normal_01",
      couponIndex: 1,
    },
  },
  {
    type: "coupon_claimed",
    offsetMs: 220000,
    payload: {
      campaignId: "campaign_001",
      visitorId: "demo_family_01",
      couponIndex: 2,
    },
  },
  {
    type: "order_placed",
    offsetMs: 240000,
    payload: {
      campaignId: "campaign_001",
      visitorId: "demo_normal_01",
      amount: 96,
      discountAmount: 12,
    },
  },
  {
    type: "order_paid",
    offsetMs: 260000,
    payload: {
      campaignId: "campaign_001",
      visitorId: "demo_normal_01",
      netPayment: 84,
    },
  },
  {
    type: "coupon_used",
    offsetMs: 280000,
    payload: {
      campaignId: "campaign_001",
      visitorId: "demo_normal_01",
      couponStatus: "used",
    },
  },
  {
    type: "inventory_updated",
    offsetMs: 310000,
    payload: {
      zone: "zone_b",
      availableItemCount: 78,
      threshold: 80,
      message: "库存低于安全阈值 80，触发自动暂停",
    },
  },
  {
    type: "campaign_paused",
    offsetMs: 320000,
    payload: {
      campaignId: "campaign_001",
      reason: "INVENTORY_BELOW_THRESHOLD",
      availableCount: 78,
      threshold: 80,
    },
  },
  {
    type: "campaign_completed",
    offsetMs: 340000,
    payload: {
      campaignId: "campaign_001",
      totalCoupons: 350,
      totalOrders: 65,
      netPaymentGMV: 6240,
      couponCost: 780,
    },
  },
];
