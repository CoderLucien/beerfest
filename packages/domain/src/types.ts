export interface Visitor {
  visitorId: string;
  name: string;
  type: "adult" | "family" | "minor";
  age: number;
  alcoholVerified: boolean;
  memberTier: "regular" | "silver" | "gold";
  currentZoneId: string;
  enteredAt: Date;
}

export interface Zone {
  zoneId: string;
  name: string;
  currentFootfall: number;
  baselineFootfall: number;
  averageWaitMinutes: number;
}

export interface Merchant {
  merchantId: string;
  zoneId: string;
  name: string;
  category: string;
  active: boolean;
}

export interface Product {
  productId: string;
  merchantId: string;
  name: string;
  category: "food" | "beverage" | "cultural" | "alcohol";
  price: number;
}

export interface Inventory {
  productId: string;
  merchantId: string;
  available: number;
  reserved: number;
}

export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export interface Campaign {
  campaignId: string;
  name: string;
  objective: string;
  budgetLimit: number;
  budgetConsumed: number;
  status: CampaignStatus;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignVersion {
  versionId: string;
  campaignId: string;
  versionNumber: number;
  rulesSnapshot: CampaignRules;
  approvalStatus: "none" | "pending" | "approved" | "rejected";
  createdAt: Date;
}

export interface CampaignRules {
  targetAudience: string[];
  products: string[];
  discount: { type: "flat"; threshold: number; amount: number };
  maxCoupons: number;
  budgetCap: number;
  validMinutes: number;
  stopConditions: StopConditions;
  eligibilityRules: EligibilityRule[];
}

export interface StopConditions {
  minInventoryThreshold: number;
  maxRefundRate: number;
  budgetExhausted: boolean;
}

export interface EligibilityRule {
  type: "age_gate" | "alcohol_verified" | "member_tier" | "zone" | "family_only";
  params: Record<string, unknown>;
}

export type CouponStatus = "pending" | "active" | "used" | "expired";

export interface Coupon {
  couponId: string;
  visitorId: string;
  campaignId: string;
  campaignVersion: number;
  status: CouponStatus;
  idempotencyKey: string;
  claimedAt: Date;
  expiresAt: Date;
}

export type OrderStatus = "pending" | "paid" | "verified" | "completed" | "cancelled" | "refunded";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  orderId: string;
  visitorId: string;
  campaignId: string;
  campaignVersion: number;
  couponId?: string;
  items: OrderItem[];
  netPayment: number;
  discountAmount: number;
  status: OrderStatus;
  createdAt: Date;
}

export type ExperimentGroup = "control" | "experiment";

export interface ExperimentAssignment {
  visitorId: string;
  campaignId: string;
  group: ExperimentGroup;
  assignedAt: Date;
}

export type ApprovalDecision = "approved" | "rejected";

export interface Approval {
  approvalId: string;
  campaignVersionId: string;
  approver: string;
  decision: ApprovalDecision;
  reason: string;
  decidedAt: Date;
}

export type BusinessEventType =
  | "footfall_update"
  | "order_placed"
  | "coupon_claimed"
  | "coupon_verified"
  | "refund_issued"
  | "inventory_threshold"
  | "campaign_paused"
  | "campaign_resumed"
  | "budget_exhausted";

export interface BusinessEvent {
  eventId: string;
  eventType: BusinessEventType;
  campaignId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface DashboardData {
  zones: Zone[];
  campaigns: Campaign[];
  totalOrders: number;
  totalGMV: number;
  totalBudgetRemaining: number;
  alerts: Alert[];
}

export interface Alert {
  alertId: string;
  type: "footfall_anomaly" | "inventory_low" | "budget_low" | "campaign_paused" | "refund_spike";
  message: string;
  severity: "warning" | "critical";
  timestamp: Date;
}

export interface ExperimentResult {
  campaignId: string;
  controlGroup: GroupMetrics;
  experimentGroup: GroupMetrics;
  incrementalGMV: number;
  couponCost: number;
  netIncremental: number;
}

export interface GroupMetrics {
  totalVisitors: number;
  conversionRate: number;
  ordersCount: number;
  averageOrderValue: number;
  netPaymentGMV: number;
}
