export interface Visitor {
  visitorId: string;
  name: string;
  type: VisitorType;
  age: number;
  alcoholVerified: boolean;
  memberLevel: MemberLevel;
  currentZone: string;
  preferences: string[];
  registeredAt: number;
}

export type VisitorType = "normal" | "family";
export type MemberLevel = "regular" | "silver" | "gold";

export interface VerificationResult {
  verified: boolean;
  alcoholEligible: boolean;
  reason?: string;
}
