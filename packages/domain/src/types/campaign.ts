export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "running"
  | "paused"
  | "cancelled"
  | "completed";

export interface Campaign {
  campaignId: string;
  name: string;
  description: string;
  objective: string;
  budgetLimit: number;
  budgetConsumed: number;
  status: CampaignStatus;
  currentVersion: number;
  targetVisitorType: VisitorType;
  containsAlcohol: boolean;
  createdAt: number;
  updatedAt: number;
}

import type { VisitorType } from "./visitor";

export interface CampaignVersion {
  versionId: string;
  campaignId: string;
  version: number;
  rules: CampaignRules;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  createdAt: number;
  approvedAt?: number;
}

export interface CampaignRules {
  targetAudience: TargetAudience;
  products: string[];
  discount: Discount;
  maxCoupons: number;
  validMinutes: number;
  stopConditions: StopConditions;
  evaluationMethod: string;
  explanation: string;
}

export interface TargetAudience {
  description: string;
  visitorTypes: VisitorType[];
  minAge: number;
  currentZone?: string;
  minSessionMinutes: number;
  excludeConditions: string[];
}

export interface Discount {
  type: "full_reduction";
  threshold: number;
  amount: number;
}

export interface StopConditions {
  inventoryBelow: number;
  refundRatePercent: number;
  budgetExhausted: boolean;
}

export interface CreateCampaignInput {
  name: string;
  target: string;
  budgetLimit: number;
  rules: CampaignRules;
}
