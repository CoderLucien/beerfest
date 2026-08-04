import type { CampaignStatus } from "../types/campaign";

export const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["pending_approval"],
  pending_approval: ["approved", "rejected"],
  rejected: ["draft"],
  approved: ["running"],
  running: ["paused", "completed", "cancelled"],
  paused: ["running", "cancelled"],
  cancelled: [],
  completed: [],
};

export function canTransition(
  from: CampaignStatus,
  to: CampaignStatus
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidStatus(status: string): status is CampaignStatus {
  return Object.keys(ALLOWED_TRANSITIONS).includes(status);
}

export function getNextStatuses(
  current: CampaignStatus
): CampaignStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export const STOP_TRIGGERS = {
  inventoryBelow: "Inventory below safe threshold",
  refundRateHigh: "Refund rate exceeds limit",
  budgetExhausted: "Budget exhausted",
} as const;

export function shouldAutoPause(params: {
  inventoryAvailable: number;
  inventoryThreshold: number;
  refundRate: number;
  refundRateLimit: number;
  budgetExhausted: boolean;
}): boolean {
  return (
    params.inventoryAvailable < params.inventoryThreshold ||
    params.refundRate > params.refundRateLimit ||
    params.budgetExhausted
  );
}
