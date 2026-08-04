import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";
import { checkEligibility } from "@beerfest/domain";

export async function POST(request: NextRequest) {
  try {
    const { visitorId } = await request.json();
    if (!visitorId) {
      return NextResponse.json({ error: "visitorId is required" }, { status: 400 });
    }
    const adapter = getAdapter();
    const visitor = await adapter.getVisitor(visitorId);
    if (!visitor) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }
    const campaigns = await adapter.getCampaigns();
    const active = campaigns.filter((c) => c.status === "running");

    const eligibilityResults = active.map((c) => ({
      campaignId: c.campaignId,
      campaignName: c.name,
      ...checkEligibility(visitor, c),
    }));

    return NextResponse.json({
      data: {
        visitor: {
          visitorId: visitor.visitorId,
          name: visitor.name,
          type: visitor.type,
          age: visitor.age,
          alcoholVerified: visitor.alcoholVerified,
          memberLevel: visitor.memberLevel,
        },
        campaigns: eligibilityResults,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
