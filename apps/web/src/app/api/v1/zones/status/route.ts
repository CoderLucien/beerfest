import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function GET(request: NextRequest) {
  try {
    const adapter = getAdapter();
    const zones = await adapter.getZones();
    const zoneBriefs = await adapter.getZoneBriefs();
    return NextResponse.json({ data: { zones, zoneBriefs } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
