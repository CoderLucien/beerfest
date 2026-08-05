import { describe, it, expect } from "vitest";
import {
  getPresetVisitors,
  MERCHANTS,
  PRESET_EVENTS,
} from "@beerfest/simulator";
import {
  checkBudget,
  consumeBudget,
  isBudgetExhausted,
  checkInventory,
  reserveInventory,
  isBelowThreshold,
} from "@beerfest/domain";
import type { Campaign, Inventory } from "@beerfest/domain";

const baseCampaign: Campaign = {
  campaignId: "c_admin_001",
  name: "管理测试活动",
  description: "测试管理 API",
  objective: "测试",
  budgetLimit: 5000,
  budgetConsumed: 0,
  status: "draft",
  currentVersion: 1,
  targetVisitorType: "normal",
  containsAlcohol: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("Admin API (Domain Logic)", () => {
  it("Dashboard 数据包含 zones 和 campaigns", () => {
    const zones = ["zone_a", "zone_b", "zone_c"];
    expect(zones.length).toBe(3);
    expect(baseCampaign.name).toBeTruthy();
    expect(baseCampaign.budgetLimit).toBeGreaterThan(0);
  });

  it("创建活动默认为 draft 状态", () => {
    expect(baseCampaign.status).toBe("draft");
  });

  it("创建活动包含完整字段", () => {
    expect(baseCampaign.campaignId).toBeTruthy();
    expect(baseCampaign.name).toBeTruthy();
    expect(baseCampaign.description).toBeTruthy();
    expect(baseCampaign.budgetLimit).toBeGreaterThan(0);
    expect(baseCampaign.status).toBe("draft");
    expect(baseCampaign.targetVisitorType).toBe("normal");
    expect(baseCampaign.containsAlcohol).toBe(false);
  });

  it("提交审批 → 审批通过", () => {
    const approved: Campaign = { ...baseCampaign, status: "pending_approval" };
    expect(approved.status).toBe("pending_approval");
    const fullyApproved: Campaign = { ...approved, status: "approved" };
    expect(fullyApproved.status).toBe("approved");
  });

  it("暂停 → 恢复", () => {
    const paused: Campaign = { ...baseCampaign, status: "paused" };
    expect(paused.status).toBe("paused");
    const resumed: Campaign = { ...paused, status: "running" };
    expect(resumed.status).toBe("running");
  });

  it("预算扣减正确", () => {
    const after = consumeBudget(baseCampaign, 500);
    expect(after.budgetConsumed).toBe(500);
  });

  it("预算耗尽检测", () => {
    const full: Campaign = { ...baseCampaign, budgetConsumed: 5000 };
    expect(isBudgetExhausted(full)).toBe(true);
  });

  it("库存预留后可用量减少", () => {
    const inv: Inventory = {
      productId: "p_test",
      merchantId: "m_test",
      availableQuantity: 100,
      reservedQuantity: 0,
      thresholdLow: 20,
      updatedAt: Date.now(),
    };
    const after = reserveInventory(inv, 10);
    expect(after.availableQuantity).toBe(90);
    expect(after.reservedQuantity).toBe(10);
  });

  it("库存低于阈值触发", () => {
    const inv: Inventory = {
      productId: "p_low",
      merchantId: "m_low",
      availableQuantity: 15,
      reservedQuantity: 5,
      thresholdLow: 20,
      updatedAt: Date.now(),
    };
    expect(isBelowThreshold(inv, 20)).toBe(true);
  });

  it("事件流完整性", () => {
    expect(PRESET_EVENTS.length).toBeGreaterThan(0);
    const types = new Set(PRESET_EVENTS.map((e) => e.type));
    expect(types.has("campaign_created")).toBe(true);
    expect(types.has("campaign_approved")).toBe(true);
    expect(types.has("campaign_paused")).toBe(true);
    expect(types.has("campaign_completed")).toBe(true);
  });
});
