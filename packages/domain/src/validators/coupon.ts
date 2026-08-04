import { z } from "zod";

export const claimCouponSchema = z.object({
  visitorId: z.string().min(1),
  campaignId: z.string().min(1),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
});
