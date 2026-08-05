import { describe, it, expect } from "vitest";
import {
  canTransition,
  getNextStatuses,
  shouldAutoPause,
  isValidStatus,
} from "@beerfest/domain";

describe("Campaign State Machine", () => {
  it("draft can transition to pending_approval", () => {
    expect(canTransition("draft", "pending_approval")).toBe(true);
  });

  it("draft cannot go directly to running", () => {
    expect(canTransition("draft", "running")).toBe(false);
  });

  it("draft cannot go directly to cancelled", () => {
    expect(canTransition("draft", "cancelled")).toBe(false);
  });

  it("running can be paused", () => {
    expect(canTransition("running", "paused")).toBe(true);
  });

  it("paused can be resumed", () => {
    expect(canTransition("paused", "running")).toBe(true);
  });

  it("running can be completed", () => {
    expect(canTransition("running", "completed")).toBe(true);
  });

  it("running can be cancelled", () => {
    expect(canTransition("running", "cancelled")).toBe(true);
  });

  it("completed cannot transition further", () => {
    expect(canTransition("completed", "running")).toBe(false);
    expect(canTransition("completed", "paused")).toBe(false);
  });

  it("cancelled cannot transition further", () => {
    expect(canTransition("cancelled", "running")).toBe(false);
    expect(canTransition("cancelled", "draft")).toBe(false);
  });

  it("getNextStatuses returns valid transitions", () => {
    const next = getNextStatuses("draft");
    expect(next.length).toBeGreaterThan(0);
    expect(next).toContain("pending_approval");
  });

  it("isValidStatus validates campaign statuses", () => {
    expect(isValidStatus("draft")).toBe(true);
    expect(isValidStatus("running")).toBe(true);
    expect(isValidStatus("completed")).toBe(true);
    expect(isValidStatus("invalid")).toBe(false);
  });

  it("approved can go to running", () => {
    expect(canTransition("approved", "running")).toBe(true);
  });

  it("pending_approval can be approved", () => {
    expect(canTransition("pending_approval", "approved")).toBe(true);
  });

  it("pending_approval can be rejected", () => {
    expect(canTransition("pending_approval", "rejected")).toBe(true);
  });
});

describe("Campaign Stop Conditions", () => {
  it("库存低于阈值时自动暂停", () => {
    const result = shouldAutoPause({
      inventoryAvailable: 50,
      inventoryThreshold: 80,
      refundRate: 0.01,
      refundRateLimit: 0.03,
      budgetExhausted: false,
    });
    expect(result).toBe(true);
  });

  it("退款率超过阈值时自动暂停", () => {
    const result = shouldAutoPause({
      inventoryAvailable: 200,
      inventoryThreshold: 80,
      refundRate: 0.05,
      refundRateLimit: 0.03,
      budgetExhausted: false,
    });
    expect(result).toBe(true);
  });

  it("预算耗尽时自动暂停", () => {
    const result = shouldAutoPause({
      inventoryAvailable: 200,
      inventoryThreshold: 80,
      refundRate: 0.01,
      refundRateLimit: 0.03,
      budgetExhausted: true,
    });
    expect(result).toBe(true);
  });

  it("全条件正常时不暂停", () => {
    const result = shouldAutoPause({
      inventoryAvailable: 200,
      inventoryThreshold: 80,
      refundRate: 0.01,
      refundRateLimit: 0.03,
      budgetExhausted: false,
    });
    expect(result).toBe(false);
  });

  it("零退款率不触发暂停", () => {
    const result = shouldAutoPause({
      inventoryAvailable: 200,
      inventoryThreshold: 80,
      refundRate: 0,
      refundRateLimit: 0.03,
      budgetExhausted: false,
    });
    expect(result).toBe(false);
  });
});
