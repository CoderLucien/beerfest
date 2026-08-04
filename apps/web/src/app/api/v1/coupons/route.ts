import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function GET(request: NextRequest) {
  try {
    const visitorId = request.nextUrl.searchParams.get("visitor_id");
    if (!visitorId) {
      return NextResponse.json({ error: "visitor_id is required" }, { status: 400 });
    }
    const adapter = getAdapter();
    const coupons = await adapter.getCouponsByVisitor(visitorId);
    return NextResponse.json({ data: coupons });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
