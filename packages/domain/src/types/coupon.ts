export type CouponStatus = "pending" | "active" | "used" | "expired";

export interface Coupon {
  couponId: string;
  visitorId: string;
  campaignId: string;
  campaignVersion: number;
  status: CouponStatus;
  discountAmount: number;
  claimedAt: number;
  expiresAt: number;
  idempotencyKey: string;
  usedAt?: number;
}

export interface ClaimCouponInput {
  visitorId: string;
  campaignId: string;
  idempotencyKey: string;
}
