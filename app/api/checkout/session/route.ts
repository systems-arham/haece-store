import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// Public lookup of an order by Stripe session id (for the success page).
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  const rows = await sql`
    SELECT order_number, email, total_cents, status FROM orders
    WHERE stripe_session_id = ${sessionId} LIMIT 1
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
