export type EventType =
  | "visitor_entry"
  | "visitor_exit"
  | "order_placed"
  | "order_paid"
  | "order_verified"
  | "order_refunded"
  | "coupon_claimed"
  | "coupon_used"
  | "campaign_created"
  | "campaign_approved"
  | "campaign_started"
  | "campaign_paused"
  | "campaign_completed"
  | "inventory_updated"
  | "zone_congestion"
  | "budget_threshold";

export interface BusinessEvent {
  eventId: string;
  eventType: EventType;
  campaignId?: string;
  visitorId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
  traceId: string;
}

export interface DashboardData {
  totalVisitors: number;
  activeVisitors: number;
  totalOrders: number;
  totalGMV: number;
  totalBudgetUsed: number;
  totalBudgetRemaining: number;
  zones: ZoneBrief[];
  campaigns: CampaignBrief[];
  recentEvents: BusinessEvent[];
  lastUpdated: number;
}

import type { Zone } from "./zone";
import type { Campaign } from "./campaign";

export interface ZoneBrief {
  zoneId: string;
  name: string;
  currentVisitors: number;
  baselineVisitors: number;
  avgWaitTime: number;
  status: Zone["status"];
}

export interface CampaignBrief {
  campaignId: string;
  name: string;
  status: Campaign["status"];
  budgetLimit: number;
  budgetConsumed: number;
}
