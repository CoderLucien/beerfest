import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visitorId, items } = body;
    if (!visitorId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "visitorId and items are required" }, { status: 400 });
    }
    const adapter = getAdapter();
    const order = await adapter.createOrder({ visitorId, items });
    return NextResponse.json({ data: order });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const visitorId = request.nextUrl.searchParams.get("visitor_id");
    if (!visitorId) {
      return NextResponse.json({ error: "visitor_id is required" }, { status: 400 });
    }
    const adapter = getAdapter();
    const orders = await adapter.getOrdersByVisitor(visitorId);
    return NextResponse.json({ data: orders });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
