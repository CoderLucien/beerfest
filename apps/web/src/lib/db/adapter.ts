import type {
  Visitor,
  Zone,
  Merchant,
  Product,
  Inventory,
  Campaign,
  CampaignVersion,
  Coupon,
  Order,
  Approval,
  ExperimentAssignment,
  BusinessEvent,
  DashboardData,
} from "@beerfest/domain";

export interface DataAdapter {
  getVisitors(): Promise<Visitor[]>;
  getVisitor(id: string): Promise<Visitor | null>;
  getPresetVisitors(): Promise<Visitor[]>;

  getZones(): Promise<Zone[]>;
  getZoneBriefs(): Promise<import("@beerfest/domain").ZoneBrief[]>;

  getMerchants(): Promise<Merchant[]>;
  getMerchantsByZone(zoneId: string): Promise<Merchant[]>;

  getProducts(): Promise<Product[]>;
  getProductsByMerchant(merchantId: string): Promise<Product[]>;

  getInventory(): Promise<Inventory[]>;
  getInventoryByProduct(productId: string): Promise<Inventory | null>;

  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  createCampaign(data: Partial<Campaign>): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign>;

  getCampaignVersions(campaignId: string): Promise<CampaignVersion[]>;

  getCouponsByVisitor(visitorId: string): Promise<Coupon[]>;
  claimCoupon(visitorId: string, campaignId: string): Promise<Coupon>;

  getOrdersByVisitor(visitorId: string): Promise<Order[]>;
  createOrder(data: { visitorId: string; items: { productId: string; quantity: number }[] }): Promise<Order>;

  getApprovals(campaignId: string): Promise<Approval[]>;
  submitApproval(campaignId: string): Promise<Approval>;
  approveCampaign(approvalId: string, reviewer: string): Promise<Approval>;
  rejectCampaign(approvalId: string, reviewer: string, reason: string): Promise<Approval>;

  getDashboardData(): Promise<DashboardData>;
  getEventStream(since?: number): Promise<BusinessEvent[]>;

  getExperimentAssignment(visitorId: string, campaignId: string): Promise<ExperimentAssignment | null>;
}
