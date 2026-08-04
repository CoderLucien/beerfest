import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function POST(request: NextRequest) {
  try {
    const { visitorId, campaignId } = await request.json();
    if (!visitorId || !campaignId) {
      return NextResponse.json({ error: "visitorId and campaignId are required" }, { status: 400 });
    }
    const adapter = getAdapter();
    const coupon = await adapter.claimCoupon(visitorId, campaignId);
    return NextResponse.json({ data: coupon });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
