import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function GET(request: NextRequest) {
  try {
    const adapter = getAdapter();
    const campaigns = await adapter.getCampaigns();
    return NextResponse.json({ data: campaigns });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const adapter = getAdapter();
    const campaign = await adapter.createCampaign(body);
    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
