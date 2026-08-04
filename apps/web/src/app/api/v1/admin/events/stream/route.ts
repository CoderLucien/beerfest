import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function GET(request: NextRequest) {
  try {
    const since = Number(request.nextUrl.searchParams.get("since")) || Date.now() - 360000;
    const adapter = getAdapter();
    const events = await adapter.getEventStream(since);
    return NextResponse.json({ data: events });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
