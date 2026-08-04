import type { Campaign, CampaignRules } from "../types/campaign";

export interface ApprovalDecision {
  requiresApproval: boolean;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
}

const BUDGET_THRESHOLD = 2000;

export function evaluateApprovalRequirement(
  rules: CampaignRules,
  budgetLimit: number
): ApprovalDecision {
  const reasons: string[] = [];

  if (budgetLimit > BUDGET_THRESHOLD) {
    reasons.push(`Budget ${budgetLimit} exceeds threshold ${BUDGET_THRESHOLD}`);
  }

  const hasAlcohol = rules.products.some(
    (_pid) =>
      rules.targetAudience.minAge >= 18 &&
      rules.targetAudience.visitorTypes.includes("normal")
  );

  if (hasAlcohol) {
    reasons.push("Campaign involves alcohol products");
  }

  if (reasons.length >= 2) {
    return { requiresApproval: true, riskLevel: "high", reasons };
  }

  if (reasons.length === 1) {
    return { requiresApproval: true, riskLevel: "medium", reasons };
  }

  return { requiresApproval: false, riskLevel: "low", reasons: [] };
}

export function isAutoApproval(
  decision: ApprovalDecision
): boolean {
  return decision.riskLevel === "low";
}
