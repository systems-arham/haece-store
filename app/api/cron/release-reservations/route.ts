import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// Sweeps expired reservations back to stock. Triggered every 10 minutes
// by the platform scheduler (see netlify/functions/release-reservations.js,
// or vercel.json if deploying on Vercel).
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stale = await sql`
    SELECT DISTINCT order_id FROM inventory_units
    WHERE status = 'reserved' AND reserved_until < now()
  `;
  for (const r of stale as any[]) {
    const units = await sql`SELECT id FROM inventory_units WHERE order_id=${r.order_id} AND status='reserved'`;
    for (const u of units as any[]) {
      await sql`INSERT INTO inventory_movements (unit_id, from_status, to_status, order_id) VALUES (${u.id}, 'reserved', 'in_stock', ${r.order_id})`;
    }
    await sql`UPDATE inventory_units SET status='in_stock', reserved_until=NULL, order_id=NULL WHERE order_id=${r.order_id} AND status='reserved'`;
    await sql`UPDATE orders SET status='expired' WHERE id=${r.order_id} AND status='pending_payment'`;
  }
  return NextResponse.json({ released_orders: (stale as any[]).length });
}
