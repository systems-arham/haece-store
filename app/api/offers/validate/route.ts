import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// Public: validate a private offer code from the bag page.
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  const rows = (await sql`
    SELECT percent_off, active, max_uses, used_count
    FROM offer_codes WHERE code = ${clean} LIMIT 1
  `) as any[];
  const c = rows[0];
  if (!c || !c.active) {
    return NextResponse.json({ error: "This code is not valid." }, { status: 404 });
  }
  if (c.max_uses != null && Number(c.used_count) >= Number(c.max_uses)) {
    return NextResponse.json({ error: "This code has reached its limit." }, { status: 410 });
  }
  return NextResponse.json({ ok: true, code: clean, percent_off: Number(c.percent_off) });
}
