import { describe, it, expect } from "vitest";
import {
  checkBudget,
  consumeBudget,
  isBudgetExhausted,
  checkInventory,
  reserveInventory,
  isBelowThreshold,
  getTotalAvailable,
} from "@beerfest/domain";
import type { Campaign, Inventory } from "@beerfest/domain";

const baseCampaign: Campaign = {
  campaignId: "c_001",
  name: "测试活动",
  description: "预算测试",
  objective: "验证预算逻辑",
  budgetLimit: 6000,
  budgetConsumed: 0,
  status: "running",
  currentVersion: 1,
  targetVisitorType: "normal",
  containsAlcohol: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const baseInventory: Inventory = {
  productId: "p_001",
  merchantId: "m_001",
  availableQuantity: 100,
  reservedQuantity: 0,
  thresholdLow: 80,
  updatedAt: Date.now(),
};

describe("Budget Rules", () => {
  it("发券扣减预算", () => {
    const result = checkBudget(baseCampaign, 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5900);
  });

  it("预算耗尽拒绝新请求", () => {
    const exhausted: Campaign = { ...baseCampaign, budgetConsumed: 6000 };
    const result = checkBudget(exhausted, 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("BUDGET_EXHAUSTED");
  });

  it("请求超过剩余预算时拒绝", () => {
    const nearlyExhausted: Campaign = { ...baseCampaign, budgetConsumed: 5900 };
    const result = checkBudget(nearlyExhausted, 200);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("INSUFFICIENT_BUDGET");
  });

  it("consumeBudget 正确累加消耗", () => {
    const updated = consumeBudget(baseCampaign, 500);
    expect(updated.budgetConsumed).toBe(500);
    const updated2 = consumeBudget(updated, 300);
    expect(updated2.budgetConsumed).toBe(800);
  });

  it("isBudgetExhausted 判断正确", () => {
    expect(isBudgetExhausted(baseCampaign)).toBe(false);
    const exhausted: Campaign = { ...baseCampaign, budgetConsumed: 6000 };
    expect(isBudgetExhausted(exhausted)).toBe(true);
  });
});

describe("Inventory Rules", () => {
  it("发券占用库存", () => {
    const reserved = reserveInventory(baseInventory, 10);
    expect(reserved.availableQuantity).toBe(90);
    expect(reserved.reservedQuantity).toBe(10);
  });

  it("库存不足时拒绝", () => {
    const low: Inventory = { ...baseInventory, availableQuantity: 5 };
    const result = checkInventory(low, 10);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("INSUFFICIENT_STOCK");
  });

  it("库存低于阈值触发预警", () => {
    const low: Inventory = { ...baseInventory, availableQuantity: 60 };
    expect(isBelowThreshold(low, 80)).toBe(true);
    expect(isBelowThreshold(baseInventory, 80)).toBe(false);
  });

  it("reserveInventory 后库存减少", () => {
    const result = reserveInventory(baseInventory, 20);
    expect(result.availableQuantity).toBe(80);
    expect(result.reservedQuantity).toBe(20);
  });

  it("getTotalAvailable 正确汇总可用库存", () => {
    const items: Inventory[] = [
      baseInventory,
      { ...baseInventory, productId: "p_002", availableQuantity: 50 },
    ];
    expect(getTotalAvailable(items)).toBe(150);
  });

  it("零库存拒绝领取", () => {
    const empty: Inventory = { ...baseInventory, availableQuantity: 0 };
    const result = checkInventory(empty, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("OUT_OF_STOCK");
  });
});
