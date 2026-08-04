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
    const approvals = await adapter.getApprovals(params.id);
    const latest = approvals[approvals.length - 1];
    if (!latest) {
      return NextResponse.json({ error: "No pending approval found" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const approval = await adapter.approveCampaign(latest.approvalId, body.approver || "管理员");
    await adapter.updateCampaign(params.id, { status: "running" });
    return NextResponse.json({ data: { approval, campaignStatus: "running" } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
