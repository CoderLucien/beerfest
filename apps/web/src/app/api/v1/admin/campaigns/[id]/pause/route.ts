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
    if (campaign.status !== "running") {
      return NextResponse.json({ error: "Only running campaigns can be paused" }, { status: 400 });
    }
    await adapter.updateCampaign(params.id, { status: "paused" });
    return NextResponse.json({ data: { ...campaign, status: "paused" } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
