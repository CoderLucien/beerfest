import type { Visitor, VisitorType } from "../types/visitor";
import type { Campaign } from "../types/campaign";

export interface EligibilityCheck {
  eligible: boolean;
  reason?: string;
  showAlcohol: boolean;
}

export function checkEligibility(visitor: Visitor, campaign: Campaign): EligibilityCheck {
  const reasons: string[] = [];
  let showAlcohol = false;

  if (visitor.type === "family" && campaign.targetVisitorType !== "family") {
    reasons.push("Family visitors cannot access this campaign");
  }

  if (visitor.age < 18) {
    reasons.push("Visitor under 18 cannot claim coupons");
    return { eligible: false, reason: reasons.join("; "), showAlcohol: false };
  }

  if (campaign.containsAlcohol) {
    if (!visitor.alcoholVerified) {
      reasons.push("Alcohol verification required");
    } else if (visitor.age < 18) {
      reasons.push("Under 18 cannot access alcohol products");
    } else {
      showAlcohol = true;
    }
  }

  if (reasons.length > 0) {
    return { eligible: false, reason: reasons.join("; "), showAlcohol: false };
  }

  return { eligible: true, showAlcohol };
}

export function filterCampaignsByFamily(
  campaigns: Campaign[],
  visitorType: VisitorType,
  alcoholVerified: boolean
): Campaign[] {
  return campaigns.filter((c) => {
    if (visitorType === "family") {
      return !c.containsAlcohol;
    }
    if (!alcoholVerified && c.containsAlcohol) {
      return false;
    }
    return true;
  });
}
