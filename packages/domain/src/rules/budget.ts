import type { Campaign } from "../types/campaign";

export interface BudgetResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

export function checkBudget(campaign: Campaign, requestAmount: number): BudgetResult {
  const remaining = campaign.budgetLimit - campaign.budgetConsumed;

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, reason: "BUDGET_EXHAUSTED" };
  }

  if (requestAmount > remaining) {
    return {
      allowed: false,
      remaining,
      reason: `INSUFFICIENT_BUDGET: request=${requestAmount}, remaining=${remaining}`,
    };
  }

  return { allowed: true, remaining: remaining - requestAmount };
}

export function consumeBudget(campaign: Campaign, amount: number): Campaign {
  return {
    ...campaign,
    budgetConsumed: campaign.budgetConsumed + amount,
    updatedAt: Date.now(),
  };
}

export function isBudgetExhausted(campaign: Campaign): boolean {
  return campaign.budgetConsumed >= campaign.budgetLimit;
}
