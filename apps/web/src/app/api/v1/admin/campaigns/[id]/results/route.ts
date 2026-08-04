import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adapter = getAdapter();
    const campaign = await adapter.getCampaign(params.id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const assignment = await adapter.getExperimentAssignment("demo_normal_01", params.id);
    return NextResponse.json({
      data: {
        campaignId: params.id,
        campaignVersion: campaign.currentVersion,
        controlGroup: {
          visitorCount: 20,
          conversionRate: 0.15,
          orderCount: 3,
          avgOrderValue: 45,
          netPaymentGMV: 135,
          couponCostTotal: 36,
        },
        experimentGroup: {
          visitorCount: 18,
          conversionRate: 0.33,
          orderCount: 6,
          avgOrderValue: 58,
          netPaymentGMV: 348,
          couponCostTotal: 72,
        },
        incrementalRevenue: 213,
        couponCost: 36,
        contributionRatio: 5.9,
        calculatedAt: Date.now(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
