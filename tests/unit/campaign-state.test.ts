import { describe, it, expect } from "vitest";
import { transition, canTransition, checkStopConditions } from "@beerfest/domain";

describe("Campaign State Machine", () => {
  it("draft can transition to pending_approval", () => {
    expect(canTransition("draft", "pending_approval")).toBe(true);
  });

  it("draft can transition to cancelled", () => {
    expect(canTransition("draft", "cancelled")).toBe(true);
  });

  it("draft cannot go directly to running", () => {
    expect(canTransition("draft", "running")).toBe(false);
  });

  it("running can be paused", () => {
    expect(canTransition("running", "paused")).toBe(true);
  });

  it("paused can be resumed", () => {
    expect(canTransition("paused", "running")).toBe(true);
  });

  it("completed cannot transition further", () => {
    expect(canTransition("completed", "running")).toBe(false);
    expect(canTransition("completed", "paused")).toBe(false);
  });

  it("transition returns error for invalid path", () => {
    const result = transition("draft", "running");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("transition succeeds for valid path", () => {
    const result = transition("draft", "pending_approval");
    expect(result.success).toBe(true);
    expect(result.status).toBe("pending_approval");
  });

  it("same state transition is allowed", () => {
    const result = transition("running", "running");
    expect(result.success).toBe(true);
  });
});

describe("Campaign Stop Conditions", () => {
  const stopConditions = {
    minInventoryThreshold: 80,
    maxRefundRate: 0.03,
    budgetExhausted: true,
  };

  it("pauses when inventory below threshold", () => {
    const result = checkStopConditions(50, 0, 100, { limit: 6000, consumed: 1000 }, stopConditions);
    expect(result.shouldPause).toBe(true);
    expect(result.reason).toContain("库存");
  });

  it("pauses when refund rate exceeds threshold", () => {
    const result = checkStopConditions(200, 8, 100, { limit: 6000, consumed: 1000 }, stopConditions);
    expect(result.shouldPause).toBe(true);
    expect(result.reason).toContain("退款");
  });

  it("pauses when budget exhausted", () => {
    const result = checkStopConditions(200, 0, 100, { limit: 6000, consumed: 6000 }, stopConditions);
    expect(result.shouldPause).toBe(true);
    expect(result.reason).toContain("预算");
  });

  it("does not pause when all conditions OK", () => {
    const result = checkStopConditions(200, 1, 100, { limit: 6000, consumed: 1000 }, stopConditions);
    expect(result.shouldPause).toBe(false);
  });

  it("does not crash on zero orders for refund rate", () => {
    const result = checkStopConditions(200, 0, 0, { limit: 6000, consumed: 1000 }, stopConditions);
    expect(result.shouldPause).toBe(false);
  });
});
