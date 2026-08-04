import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adapter = getAdapter();
    const campaign = await adapter.getCampaign(params.id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    await adapter.updateCampaign(params.id, { status: "pending_approval" });
    const approval = await adapter.submitApproval(params.id);
    return NextResponse.json({ data: { campaign: { ...campaign, status: "pending_approval" }, approval } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
