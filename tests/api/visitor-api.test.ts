import { describe, it, expect } from "vitest";
import {
  getPresetVisitors,
  generateVisitors,
  MERCHANTS,
  PRODUCTS,
  createInitialInventory,
  PRESET_EVENTS,
} from "@beerfest/simulator";
import {
  checkEligibility,
  checkBudget,
  checkInventory,
} from "@beerfest/domain";
import type { Campaign } from "@beerfest/domain";

const runningCampaign: Campaign = {
  campaignId: "campaign_001",
  name: "夜游错峰组合券",
  description: "满 88 减 12",
  objective: "引导客流",
  budgetLimit: 6000,
  budgetConsumed: 1560,
  status: "running",
  currentVersion: 1,
  targetVisitorType: "normal",
  containsAlcohol: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("Visitor API (Domain Logic)", () => {
  it("活跃活动列表过滤 running 状态", () => {
    const campaigns = [runningCampaign, { ...runningCampaign, campaignId: "c2", status: "draft" as const }];
    const active = campaigns.filter((c) => c.status === "running");
    expect(active.length).toBe(1);
  });

  it("领取优惠券验证预算", () => {
    const result = checkBudget(runningCampaign, 12);
    expect(result.allowed).toBe(true);
  });

  it("领取优惠券验证库存", () => {
    const inventory = createInitialInventory(PRODUCTS as any);
    const product = inventory.find((i) => i.productId === "p_b_03")!;
    const result = checkInventory(product, 1);
    expect(result.allowed).toBe(true);
  });

  it("访客列表包含预设账号", () => {
    const presets = getPresetVisitors();
    expect(presets.length).toBe(4);
    expect(presets.map((v) => v.name)).toContain("张三");
    expect(presets.map((v) => v.name)).toContain("李四一家");
  });

  it("商户按区域查询", () => {
    const zoneB = MERCHANTS.filter((m) => m.zoneId === "zone_b");
    expect(zoneB.length).toBeGreaterThan(0);
    zoneB.forEach((m) => {
      expect(m.zoneId).toBe("zone_b");
    });
  });

  it("商品数据完整性", () => {
    expect(PRODUCTS.length).toBeGreaterThan(0);
    PRODUCTS.forEach((p) => {
      expect(p.productId).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.price).toBeGreaterThan(0);
      expect(p.merchantId).toBeTruthy();
    });
  });

  it("库存初始化", () => {
    const inventory = createInitialInventory(PRODUCTS as any);
    expect(inventory.length).toBe(PRODUCTS.length);
    inventory.forEach((i) => {
      expect(i.availableQuantity).toBeGreaterThan(0);
      expect(i.reservedQuantity).toBe(0);
    });
  });

  it("事件流包含预设事件", () => {
    expect(PRESET_EVENTS.length).toBeGreaterThan(0);
    PRESET_EVENTS.forEach((e) => {
      expect(e.type).toBeTruthy();
      expect(e.offsetMs).toBeGreaterThanOrEqual(0);
    });
  });

  it("资格校验通过正常游客", () => {
    const visitor = getPresetVisitors()[0];
    const result = checkEligibility(visitor, {
      targetAudience: {
        description: "test",
        visitorTypes: ["normal"],
        minAge: 18,
        minSessionMinutes: 0,
        excludeConditions: [],
      },
      products: [],
      discount: { type: "full_reduction", threshold: 88, amount: 12 },
      maxCoupons: 500,
      validMinutes: 90,
      stopConditions: { inventoryBelow: 80, refundRatePercent: 3, budgetExhausted: true },
      evaluationMethod: "exp",
      explanation: "test",
    });
    expect(result.eligible).toBe(true);
  });

  it("生成大量游客正确计数", () => {
    const visitors = generateVisitors(100, 42);
    expect(visitors.length).toBe(100);
  });
});
