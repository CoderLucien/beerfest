import { getPresetVisitors, generateVisitors, MERCHANTS, PRODUCTS, createInitialInventory, PRESET_EVENTS } from "@beerfest/simulator";
import type { DataAdapter } from "./adapter";
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
  CampaignStatus,
  CouponStatus,
  OrderStatus,
} from "@beerfest/domain";

let uid = 0;
function nextId(prefix: string) {
  return `${prefix}_${++uid}`;
}

function now() {
  return Date.now();
}

const ZONES: Zone[] = [
  { zoneId: "zone_a", name: "A 区 · 精酿主会场", currentVisitors: 1200, baselineVisitors: 1000, avgWaitTime: 22, status: "busy" },
  { zoneId: "zone_b", name: "B 区 · 文创美食区", currentVisitors: 260, baselineVisitors: 400, avgWaitTime: 3, status: "under_capacity" },
  { zoneId: "zone_c", name: "C 区 · 国际美食区", currentVisitors: 800, baselineVisitors: 750, avgWaitTime: 8, status: "normal" },
];

const DEFAULT_CAMPAIGN: Campaign = {
  campaignId: "campaign_001",
  name: "夜游错峰组合券",
  description: "满 88 减 12，限 B 区餐饮+文创商户使用，有效期 90 分钟",
  objective: "引导A区客流至B区，改善B区库存周转",
  budgetLimit: 6000,
  budgetConsumed: 1560,
  status: "running",
  currentVersion: 1,
  targetVisitorType: "normal",
  containsAlcohol: false,
  createdAt: now(),
  updatedAt: now(),
};

function createDefaultCampaignVersion(): CampaignVersion {
  return {
    versionId: "cv_001",
    campaignId: "campaign_001",
    version: 1,
    rules: {
      targetAudience: {
        description: "A 区成年游客，非family类型",
        visitorTypes: ["normal"],
        minAge: 18,
        currentZone: "zone_a",
        minSessionMinutes: 10,
        excludeConditions: ["family"],
      },
      products: ["p_b_03", "p_b_04", "p_b_05", "p_b_06", "p_b_07", "p_b_08"],
      discount: { type: "full_reduction", threshold: 88, amount: 12 },
      maxCoupons: 500,
      validMinutes: 90,
      stopConditions: { inventoryBelow: 80, refundRatePercent: 3, budgetExhausted: true },
      evaluationMethod: "实验组vs对照组，比较净支付GMV和转化率",
      explanation: "满88减12的优惠力度合理，B区组合商品均价约30-50元，需2-3件凑够88元门槛",
    },
    status: "approved",
    createdAt: now() - 300000,
    approvedAt: now() - 240000,
  };
}

export class SyntheticAdapter implements DataAdapter {
  private visitors: Visitor[];
  private campaigns: Campaign[] = [DEFAULT_CAMPAIGN];
  private campaignVersions: CampaignVersion[] = [createDefaultCampaignVersion()];
  private coupons: Coupon[] = [];
  private orders: Order[] = [];
  private approvals: Approval[] = [];
  private assignments: ExperimentAssignment[] = [];
  private inventory: Inventory[];

  constructor() {
    this.visitors = [...getPresetVisitors(), ...generateVisitors(20)];
    this.inventory = createInitialInventory(PRODUCTS as any);
  }

  async getVisitors(): Promise<Visitor[]> {
    return this.visitors;
  }

  async getVisitor(id: string): Promise<Visitor | null> {
    return this.visitors.find((v) => v.visitorId === id) ?? null;
  }

  async getPresetVisitors(): Promise<Visitor[]> {
    return getPresetVisitors();
  }

  async getZones(): Promise<Zone[]> {
    return ZONES;
  }

  async getZoneBriefs() {
    return ZONES.map((z) => ({
      zoneId: z.zoneId,
      name: z.name,
      currentVisitors: z.currentVisitors,
      baselineVisitors: z.baselineVisitors,
      avgWaitTime: z.avgWaitTime,
      status: z.status,
    }));
  }

  async getMerchants(): Promise<Merchant[]> {
    return MERCHANTS;
  }

  async getMerchantsByZone(zoneId: string): Promise<Merchant[]> {
    return MERCHANTS.filter((m) => m.zoneId === zoneId);
  }

  async getProducts(): Promise<Product[]> {
    return PRODUCTS;
  }

  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    return PRODUCTS.filter((p) => p.merchantId === merchantId);
  }

  async getInventory(): Promise<Inventory[]> {
    return this.inventory;
  }

  async getInventoryByProduct(productId: string): Promise<Inventory | null> {
    return this.inventory.find((i) => i.productId === productId) ?? null;
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.campaigns;
  }

  async getCampaign(id: string): Promise<Campaign | null> {
    return this.campaigns.find((c) => c.campaignId === id) ?? null;
  }

  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    const campaign: Campaign = {
      campaignId: nextId("campaign"),
      name: data.name ?? "",
      description: data.description ?? "",
      objective: data.objective ?? "",
      budgetLimit: data.budgetLimit ?? 0,
      budgetConsumed: 0,
      status: "draft",
      currentVersion: 1,
      targetVisitorType: data.targetVisitorType ?? "normal",
      containsAlcohol: data.containsAlcohol ?? false,
      createdAt: now(),
      updatedAt: now(),
    };
    this.campaigns.push(campaign);
    return campaign;
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const idx = this.campaigns.findIndex((c) => c.campaignId === id);
    if (idx === -1) throw new Error(`Campaign ${id} not found`);
    this.campaigns[idx] = { ...this.campaigns[idx], ...data, updatedAt: now() };
    return this.campaigns[idx];
  }

  async getCampaignVersions(campaignId: string): Promise<CampaignVersion[]> {
    return this.campaignVersions.filter((v) => v.campaignId === campaignId);
  }

  async getCouponsByVisitor(visitorId: string): Promise<Coupon[]> {
    return this.coupons.filter((c) => c.visitorId === visitorId);
  }

  async claimCoupon(visitorId: string, campaignId: string): Promise<Coupon> {
    const idempotencyKey = `${visitorId}_${campaignId}`;
    const existing = this.coupons.find((c) => c.idempotencyKey === idempotencyKey && c.status !== "expired");
    if (existing) return existing;

    const coupon: Coupon = {
      couponId: nextId("coupon"),
      visitorId,
      campaignId,
      campaignVersion: 1,
      status: "active",
      discountAmount: 12,
      claimedAt: now(),
      expiresAt: now() + 90 * 60 * 1000,
      idempotencyKey,
    };
    this.coupons.push(coupon);
    return coupon;
  }

  async getOrdersByVisitor(visitorId: string): Promise<Order[]> {
    return this.orders.filter((o) => o.visitorId === visitorId);
  }

  async createOrder(data: { visitorId: string; items: { productId: string; quantity: number }[] }): Promise<Order> {
    const products = data.items.map((item) => {
      const p = PRODUCTS.find((x) => x.productId === item.productId)!;
      return { productId: p.productId, name: p.name, price: p.price, quantity: item.quantity };
    });
    const total = products.reduce((s, p) => s + p.price * p.quantity, 0);
    const discount = total >= 88 ? 12 : 0;

    const order: Order = {
      orderId: nextId("order"),
      visitorId: data.visitorId,
      campaignId: "campaign_001",
      couponId: "",
      products,
      netPayment: total - discount,
      discountAmount: discount,
      status: "pending",
      createdAt: now(),
    };
    this.orders.push(order);
    return order;
  }

  async getApprovals(campaignId: string): Promise<Approval[]> {
    return this.approvals.filter((a) => a.campaignId === campaignId);
  }

  async submitApproval(campaignId: string): Promise<Approval> {
    const approval: Approval = {
      approvalId: nextId("approval"),
      campaignVersionId: `cv_${uid}`,
      campaignId,
      approver: "",
      decision: "approved",
      reason: "自动审批（低风险活动）",
      createdAt: now(),
    };
    this.approvals.push(approval);
    return approval;
  }

  async approveCampaign(approvalId: string, reviewer: string): Promise<Approval> {
    const idx = this.approvals.findIndex((a) => a.approvalId === approvalId);
    if (idx === -1) throw new Error("Approval not found");
    this.approvals[idx] = { ...this.approvals[idx], approver: reviewer, decision: "approved" };
    return this.approvals[idx];
  }

  async rejectCampaign(approvalId: string, reviewer: string, reason: string): Promise<Approval> {
    const idx = this.approvals.findIndex((a) => a.approvalId === approvalId);
    if (idx === -1) throw new Error("Approval not found");
    this.approvals[idx] = { ...this.approvals[idx], approver: reviewer, decision: "rejected", reason };
    return this.approvals[idx];
  }

  async getDashboardData(): Promise<DashboardData> {
    return {
      totalVisitors: 3260,
      activeVisitors: 2260,
      totalOrders: 65,
      totalGMV: 6240,
      totalBudgetUsed: 1560,
      totalBudgetRemaining: 4440,
      zones: await this.getZoneBriefs(),
      campaigns: this.campaigns.map((c) => ({
        campaignId: c.campaignId,
        name: c.name,
        status: c.status,
        budgetLimit: c.budgetLimit,
        budgetConsumed: c.budgetConsumed,
      })),
      recentEvents: [],
      lastUpdated: now(),
    };
  }

  async getEventStream(since?: number): Promise<BusinessEvent[]> {
    const baseTime = since ?? now() - 360000;
    return PRESET_EVENTS.map((e, i) => ({
      eventId: `evt_${i}`,
      eventType: e.type,
      payload: e.payload,
      timestamp: baseTime + e.offsetMs,
      traceId: `trace_${i}`,
    }));
  }

  async getExperimentAssignment(visitorId: string, campaignId: string): Promise<ExperimentAssignment | null> {
    const existing = this.assignments.find(
      (a) => a.visitorId === visitorId && a.campaignId === campaignId
    );
    if (existing) return existing;

    const hash = visitorId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const assignment: ExperimentAssignment = {
      visitorId,
      campaignId,
      group: hash % 2 === 0 ? "experiment" : "control",
      assignedAt: now(),
    };
    this.assignments.push(assignment);
    return assignment;
  }
}

let instance: SyntheticAdapter | null = null;

export function getAdapter(): DataAdapter {
  if (!instance) {
    instance = new SyntheticAdapter();
  }
  return instance;
}
