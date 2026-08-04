import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function GET(request: NextRequest) {
  try {
    const adapter = getAdapter();
    const campaigns = await adapter.getCampaigns();
    const active = campaigns.filter((c) => c.status === "running");
    return NextResponse.json({ data: active });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
