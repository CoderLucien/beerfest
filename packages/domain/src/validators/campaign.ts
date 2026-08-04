import { z } from "zod";

export const targetAudienceSchema = z.object({
  description: z.string().min(1),
  visitorTypes: z.array(z.enum(["normal", "family"])),
  minAge: z.number().min(0),
  currentZone: z.string().optional(),
  minSessionMinutes: z.number().min(0),
  excludeConditions: z.array(z.string()),
});

export const discountSchema = z.object({
  type: z.literal("full_reduction"),
  threshold: z.number().min(0),
  amount: z.number().min(0),
});

export const stopConditionsSchema = z.object({
  inventoryBelow: z.number().min(0),
  refundRatePercent: z.number().min(0).max(100),
  budgetExhausted: z.boolean(),
});

export const campaignRulesSchema = z.object({
  targetAudience: targetAudienceSchema,
  products: z.array(z.string()).min(1, "At least one product required"),
  discount: discountSchema,
  maxCoupons: z.number().min(1),
  validMinutes: z.number().min(1),
  stopConditions: stopConditionsSchema,
  evaluationMethod: z.string().min(1),
  explanation: z.string().min(1),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  target: z.string().min(1, "Campaign target is required"),
  budgetLimit: z.number().min(1, "Budget must be positive"),
  rules: campaignRulesSchema,
});
