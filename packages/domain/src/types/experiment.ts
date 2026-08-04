export type ExperimentGroup = "control" | "experiment";

export interface ExperimentAssignment {
  visitorId: string;
  campaignId: string;
  group: ExperimentGroup;
  assignedAt: number;
}

export interface ExperimentResult {
  campaignId: string;
  campaignVersion: number;
  controlGroup: GroupMetrics;
  experimentGroup: GroupMetrics;
  incrementalRevenue: number;
  couponCost: number;
  contributionRatio: number;
  calculatedAt: number;
}

export interface GroupMetrics {
  visitorCount: number;
  conversionRate: number;
  orderCount: number;
  avgOrderValue: number;
  netPaymentGMV: number;
  couponCostTotal: number;
}
