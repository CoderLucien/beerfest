import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/synthetic";

export async function GET(request: NextRequest) {
  try {
    const adapter = getAdapter();
    const products = await adapter.getProducts();
    return NextResponse.json({ data: products });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
