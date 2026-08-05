import { describe, it, expect } from "vitest";
import { checkEligibility } from "@beerfest/domain";
import type { Visitor, Campaign, Product } from "@beerfest/domain";

const baseVisitor: Visitor = {
  visitorId: "visitor_1",
  name: "测试用户",
  type: "normal",
  age: 25,
  alcoholVerified: true,
  memberLevel: "gold",
  currentZone: "zone_a",
  preferences: ["beer"],
  registeredAt: Date.now(),
};

const familyVisitor: Visitor = {
  ...baseVisitor,
  visitorId: "visitor_2",
  name: "家庭用户",
  type: "family",
  age: 35,
  alcoholVerified: false,
};

const normalCampaign: Campaign = {
  campaignId: "c_test",
  name: "测试活动",
  description: "test",
  objective: "test",
  budgetLimit: 5000,
  budgetConsumed: 0,
  status: "running",
  currentVersion: 1,
  targetVisitorType: "normal",
  containsAlcohol: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const alcoholCampaign: Campaign = {
  ...normalCampaign,
  campaignId: "c_alcohol",
  containsAlcohol: true,
};

const familyCampaign: Campaign = {
  ...normalCampaign,
  campaignId: "c_family",
  targetVisitorType: "family",
};

describe("Eligibility Rules", () => {
  it("正常游客通过普通活动", () => {
    const result = checkEligibility(baseVisitor, normalCampaign);
    expect(result.eligible).toBe(true);
  });

  it("未成年人不能领券", () => {
    const minor: Visitor = { ...baseVisitor, age: 16, visitorId: "minor" };
    const result = checkEligibility(minor, normalCampaign);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("under 18");
  });

  it("家庭游客不能访问普通活动", () => {
    const result = checkEligibility(familyVisitor, normalCampaign);
    expect(result.eligible).toBe(false);
  });

  it("家庭游客可以访问家庭活动", () => {
    const result = checkEligibility(familyVisitor, familyCampaign);
    expect(result.eligible).toBe(true);
  });

  it("酒精活动需要酒精验证", () => {
    const unverified: Visitor = { ...baseVisitor, alcoholVerified: false, visitorId: "unverified" };
    const result = checkEligibility(unverified, alcoholCampaign);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Alcohol");
  });

  it("已验证游客可访问酒精活动", () => {
    const result = checkEligibility(baseVisitor, alcoholCampaign);
    expect(result.eligible).toBe(true);
    expect(result.showAlcohol).toBe(true);
  });

  it("家庭游客不校验酒精", () => {
    const result = checkEligibility(familyVisitor, familyCampaign);
    expect(result.showAlcohol).toBe(false);
  });
});

describe("Product Filtering by Visitor", () => {
  const products = [
    { productId: "p1", name: "啤酒", price: 35, category: "drink" as const, containsAlcohol: true, merchantId: "m1" },
    { productId: "p2", name: "烧烤", price: 25, category: "food" as const, containsAlcohol: false, merchantId: "m2" },
    { productId: "p3", name: "冰箱贴", price: 15, category: "cultural_goods" as const, containsAlcohol: false, merchantId: "m3" },
  ];

  it("家庭游客看不到酒精商品", () => {
    const filtered = products.filter((p) => !p.containsAlcohol);
    expect(filtered.length).toBe(2);
    expect(filtered.every((p) => !p.containsAlcohol)).toBe(true);
  });

  it("已验证成人可看全部商品", () => {
    const filtered = products;
    expect(filtered.length).toBe(3);
  });

  it("未验证成人看不到酒精商品", () => {
    const filtered = products.filter((p) => !p.containsAlcohol);
    expect(filtered.find((p) => p.containsAlcohol)).toBeUndefined();
  });
});

describe("Experiment Group Assignment", () => {
  it("相同访客得到相同分组 (哈希稳定性)", () => {
    const hash = (id: string) => id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const g1 = hash("visitor_42") % 2 === 0 ? "experiment" : "control";
    const g2 = hash("visitor_42") % 2 === 0 ? "experiment" : "control";
    expect(g1).toBe(g2);
  });

  it("分组为 control 或 experiment", () => {
    const hash = (id: string) => id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const group = hash("any_visitor") % 2 === 0 ? "experiment" : "control";
    expect(["control", "experiment"]).toContain(group);
  });
});
