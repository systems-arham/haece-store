import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import sql from "@/lib/db";
import { verifySession, ADMIN_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySession(token))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const orders = (await sql`
    SELECT id, order_number, email, name, subtotal_cents, discount_cents, shipping_cents,
           total_cents, status, tracking_number, offer_code, created_at, paid_at
    FROM orders
    ORDER BY id DESC
  `) as any[];
  const items = (await sql`
    SELECT order_id, product_name, size, sku, price_cents
    FROM order_items
    ORDER BY order_id, id
  `) as any[];
  const byOrder = new Map<number, any[]>();
  for (const i of items) {
    const list = byOrder.get(i.order_id) || [];
    list.push(i);
    byOrder.set(i.order_id, list);
  }

  const lines = [
    ["order_number", "email", "name", "status", "items", "subtotal_usd", "discount_usd", "shipping_usd", "total_usd", "offer_code", "tracking_number", "placed", "paid"]
      .map(csvCell)
      .join(","),
  ];
  for (const o of orders) {
    const desc = (byOrder.get(o.id) || [])
      .map((i) => `${i.product_name} (${i.size})`)
      .join("; ");
    lines.push(
      [
        o.order_number,
        o.email,
        o.name,
        o.status,
        desc,
        (Number(o.subtotal_cents) / 100).toFixed(2),
        (Number(o.discount_cents) / 100).toFixed(2),
        (Number(o.shipping_cents) / 100).toFixed(2),
        (Number(o.total_cents) / 100).toFixed(2),
        o.offer_code,
        o.tracking_number,
        o.created_at,
        o.paid_at,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="haece-orders-${stamp}.csv"`,
    },
  });
}
