import { describe, it, expect } from "vitest";
import {
  canTransitionCoupon,
  isActive,
  isConsumable,
  isValidCouponStatus,
} from "@beerfest/domain";

describe("Coupon State Machine", () => {
  it("pending → active 合法", () => {
    expect(canTransitionCoupon("pending", "active")).toBe(true);
  });

  it("pending → expired 合法", () => {
    expect(canTransitionCoupon("pending", "expired")).toBe(true);
  });

  it("active → used 合法", () => {
    expect(canTransitionCoupon("active", "used")).toBe(true);
  });

  it("active → expired 合法", () => {
    expect(canTransitionCoupon("active", "expired")).toBe(true);
  });

  it("used 不能再转换", () => {
    expect(canTransitionCoupon("used", "active")).toBe(false);
    expect(canTransitionCoupon("used", "pending")).toBe(false);
  });

  it("expired 不能再转换", () => {
    expect(canTransitionCoupon("expired", "active")).toBe(false);
    expect(canTransitionCoupon("expired", "used")).toBe(false);
  });

  it("isActive 仅 active 为 true", () => {
    expect(isActive("active")).toBe(true);
    expect(isActive("pending")).toBe(false);
    expect(isActive("used")).toBe(false);
    expect(isActive("expired")).toBe(false);
  });

  it("isConsumable 待激活或可用时 true", () => {
    expect(isConsumable("pending")).toBe(true);
    expect(isConsumable("active")).toBe(true);
    expect(isConsumable("used")).toBe(false);
    expect(isConsumable("expired")).toBe(false);
  });

  it("isValidCouponStatus 合法状态为 true", () => {
    expect(isValidCouponStatus("active")).toBe(true);
    expect(isValidCouponStatus("used")).toBe(true);

    expect(isValidCouponStatus("delivered")).toBe(false);
    expect(isValidCouponStatus("")).toBe(false);
  });
});
