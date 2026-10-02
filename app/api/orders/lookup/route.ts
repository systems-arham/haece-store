import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { order_number, email } = await req.json();
  if (!order_number || !email) {
    return NextResponse.json({ error: "Order number and email are required." }, { status: 400 });
  }
  const rows = await sql`
    SELECT id, order_number, status, total_cents, created_at, tracking_number FROM orders
    WHERE order_number = ${String(order_number).toUpperCase()} AND lower(email) = lower(${String(email)})
    LIMIT 1
  `;
  if (!rows.length) {
    return NextResponse.json({ error: "No order found with those details." }, { status: 404 });
  }
  const order = rows[0] as { id: number; order_number: string; status: string; total_cents: number; created_at: string; tracking_number: string | null };
  const items = await sql`
    SELECT product_name, size, sku FROM order_items WHERE order_id = ${order.id}
  `;
  return NextResponse.json({ ...order, items });
}
