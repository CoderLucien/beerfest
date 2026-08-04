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
    const versions = await adapter.getCampaignVersions(params.id);
    const approvals = await adapter.getApprovals(params.id);
    return NextResponse.json({ data: { campaign, versions, approvals } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
