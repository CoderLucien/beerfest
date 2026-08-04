import { describe, it, expect } from "vitest";
import { checkEligibility, filterProductsByEligibility, checkExperimentGroup } from "@beerfest/domain";
import type { Visitor, CampaignRules, Product } from "@beerfest/domain";

const baseVisitor: Visitor = {
  visitorId: "visitor_1",
  name: "测试用户",
  type: "adult",
  age: 25,
  alcoholVerified: true,
  memberTier: "regular",
  currentZoneId: "zone_a",
  enteredAt: new Date(),
};

const familyVisitor: Visitor = { ...baseVisitor, visitorId: "visitor_2", type: "family", age: 35 };

const baseRules: CampaignRules = {
  targetAudience: ["adult"],
  products: ["p_b1_1", "p_b2_1"],
  discount: { type: "flat", threshold: 88, amount: 12 },
  maxCoupons: 500,
  budgetCap: 6000,
  validMinutes: 90,
  stopConditions: {
    minInventoryThreshold: 80,
    maxRefundRate: 0.03,
    budgetExhausted: true,
  },
  eligibilityRules: [],
};

describe("Eligibility Rules", () => {
  it("visitor passes with no rules", () => {
    const result = checkEligibility(baseVisitor, baseRules);
    expect(result.eligible).toBe(true);
  });

  it("age gate blocks underage visitor", () => {
    const rules: CampaignRules = {
      ...baseRules,
      eligibilityRules: [{ type: "age_gate", params: { minAge: 18 } }],
    };
    const minor: Visitor = { ...baseVisitor, age: 16 };
    const result = checkEligibility(minor, rules);
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toContain("低于最低要求");
  });

  it("family_only rule blocks adult visitors", () => {
    const rules: CampaignRules = {
      ...baseRules,
      eligibilityRules: [{ type: "family_only", params: {} }],
    };
    const result = checkEligibility(baseVisitor, rules);
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toContain("家庭客群");
  });

  it("family_only rule allows family visitors", () => {
    const rules: CampaignRules = {
      ...baseRules,
      eligibilityRules: [{ type: "family_only", params: {} }],
    };
    const result = checkEligibility(familyVisitor, rules);
    expect(result.eligible).toBe(true);
  });

  it("alcohol_verified blocks unverified visitor", () => {
    const rules: CampaignRules = {
      ...baseRules,
      eligibilityRules: [{ type: "alcohol_verified", params: {} }],
    };
    const unverified: Visitor = { ...baseVisitor, alcoholVerified: false };
    const result = checkEligibility(unverified, rules);
    expect(result.eligible).toBe(false);
  });

  it("multiple rules accumulate reasons", () => {
    const rules: CampaignRules = {
      ...baseRules,
      eligibilityRules: [
        { type: "age_gate", params: { minAge: 18 } },
        { type: "family_only", params: {} },
      ],
    };
    const minor: Visitor = { ...baseVisitor, age: 16, type: "adult" };
    const result = checkEligibility(minor, rules);
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBe(2);
  });
});

describe("Product Filtering by Eligibility", () => {
  const products: Product[] = [
    { productId: "p1", merchantId: "m1", name: "啤酒", category: "alcohol", price: 38 },
    { productId: "p2", merchantId: "m1", name: "明信片", category: "cultural", price: 25 },
    { productId: "p3", merchantId: "m2", name: "烤肠", category: "food", price: 35 },
  ];

  it("family visitors see only non-alcohol products", () => {
    const filtered = filterProductsByEligibility(familyVisitor, products, baseRules);
    expect(filtered.length).toBe(2);
    expect(filtered.find((p) => p.category === "alcohol")).toBeUndefined();
  });

  it("unverified adults see only non-alcohol products", () => {
    const unverified: Visitor = { ...baseVisitor, alcoholVerified: false };
    const filtered = filterProductsByEligibility(unverified, products, baseRules);
    expect(filtered.find((p) => p.category === "alcohol")).toBeUndefined();
  });

  it("verified adults see all products", () => {
    const filtered = filterProductsByEligibility(baseVisitor, products, baseRules);
    expect(filtered.length).toBe(3);
  });
});

describe("Experiment Group Assignment", () => {
  it("same visitor always gets same group", () => {
    const g1 = checkExperimentGroup("visitor_42");
    const g2 = checkExperimentGroup("visitor_42");
    expect(g1).toBe(g2);
  });

  it("groups are control or experiment", () => {
    const group = checkExperimentGroup("any_visitor");
    expect(["control", "experiment"]).toContain(group);
  });
});
