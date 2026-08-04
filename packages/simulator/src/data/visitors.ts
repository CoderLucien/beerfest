import { createRng } from "../seed-random";
import type { Visitor, VisitorType, MemberLevel } from "@beerfest/domain";

const SEED = 20260804;
const ZONES = ["zone_a", "zone_b", "zone_c"];
const MEMBER_LEVELS: MemberLevel[] = ["regular", "silver", "gold"];
const PREFERENCES = ["beer", "food", "cultural", "music", "family", "shopping"];

export function generateVisitors(count: number, seed?: number) {
  const rng = createRng(seed ?? SEED);
  const visitors: Visitor[] = [];

  for (let i = 0; i < count; i++) {
    const age = rng.int(10, 70);
    const type: VisitorType = rng.chance(30) ? "family" : "normal";
    const alcoholVerified = age >= 18 && rng.chance(60);

    visitors.push({
      visitorId: `visitor_${String(i + 1).padStart(5, "0")}`,
      name: `游客${i + 1}`,
      type,
      age,
      alcoholVerified: type === "family" ? false : alcoholVerified,
      memberLevel: rng.pick(MEMBER_LEVELS),
      currentZone: rng.pick(ZONES),
      preferences: rng.pickN(PREFERENCES, rng.int(1, 3)),
      registeredAt: Date.now() - rng.int(0, 86400000),
    });
  }

  return visitors;
}

export function getPresetVisitors(): Visitor[] {
  return [
    {
      visitorId: "demo_normal_01",
      name: "张三",
      type: "normal",
      age: 28,
      alcoholVerified: true,
      memberLevel: "gold",
      currentZone: "zone_a",
      preferences: ["beer", "food"],
      registeredAt: Date.now() - 7200000,
    },
    {
      visitorId: "demo_family_01",
      name: "李四一家",
      type: "family",
      age: 35,
      alcoholVerified: false,
      memberLevel: "silver",
      currentZone: "zone_a",
      preferences: ["family", "food", "cultural"],
      registeredAt: Date.now() - 3600000,
    },
    {
      visitorId: "demo_normal_02",
      name: "王五",
      type: "normal",
      age: 22,
      alcoholVerified: false,
      memberLevel: "regular",
      currentZone: "zone_b",
      preferences: ["beer", "music"],
      registeredAt: Date.now() - 1800000,
    },
    {
      visitorId: "demo_admin_01",
      name: "运营管理员",
      type: "normal",
      age: 32,
      alcoholVerified: true,
      memberLevel: "gold",
      currentZone: "zone_b",
      preferences: [],
      registeredAt: Date.now() - 86400000,
    },
  ];
}

export const DEMO_VISITORS = getPresetVisitors();

export function getVisitorsByZone(visitors: Visitor[], zoneId: string): Visitor[] {
  return visitors.filter((v) => v.currentZone === zoneId);
}

export function getVisitorsByType(visitors: Visitor[], type: VisitorType): Visitor[] {
  return visitors.filter((v) => v.type === type);
}
