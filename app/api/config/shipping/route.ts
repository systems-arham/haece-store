import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// Public shipping config for the bag page.
export async function GET(req: NextRequest) {
  const rows = await sql`SELECT key, value FROM site_content WHERE key IN ('free_ship_threshold_cents','flat_ship_cents')`;
  const map = Object.fromEntries((rows as any[]).map((r) => [r.key, r.value]));
  return NextResponse.json({
    freeOver: Number(map["free_ship_threshold_cents"] || 20000),
    flat: Number(map["flat_ship_cents"] || 1200),
  });
}
