import type { CouponStatus } from "../types/coupon";

export const COUPON_TRANSITIONS: Record<CouponStatus, CouponStatus[]> = {
  pending: ["active", "expired"],
  active: ["used", "expired"],
  used: [],
  expired: [],
};

export function canTransitionCoupon(
  from: CouponStatus,
  to: CouponStatus
): boolean {
  return COUPON_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidCouponStatus(status: string): status is CouponStatus {
  return Object.keys(COUPON_TRANSITIONS).includes(status);
}

export function isActive(status: CouponStatus): boolean {
  return status === "active";
}

export function isConsumable(status: CouponStatus): boolean {
  return status === "pending" || status === "active";
}
