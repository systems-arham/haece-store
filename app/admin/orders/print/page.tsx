import Link from "next/link";
import sql from "@/lib/db";
import { usd } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function OrdersPrint() {
  const orders = (await sql`
    SELECT id, order_number, email, name, subtotal_cents, discount_cents, shipping_cents,
           total_cents, status, tracking_number, offer_code, created_at, shipping_address
    FROM orders
    ORDER BY id DESC
    LIMIT 500
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

  return (
    <div className="print-sheet">
      <p className="no-print" style={{ marginBottom: 16 }}>
        <Link href="/admin/orders" style={{ fontSize: 13, color: "var(--muted)" }}>Back to orders</Link>
      </p>
      <h1>HAECE, Orders</h1>
      <p className="admin-sub">
        {orders.length} orders, printed {new Date().toLocaleString()}. Use your browser print dialog to save as PDF.
      </p>
      <PrintButton />
      {orders.map((o) => (
        <div key={o.order_number} className="print-order">
          <p style={{ fontWeight: 700 }}>
            {o.order_number}
            <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 12 }}>
              {new Date(o.created_at).toLocaleString()}
            </span>
          </p>
          <p style={{ fontSize: 13 }}>
            {o.name ? `${o.name}, ` : ""}{o.email || "-"}
            {" "}· {o.status.replace(/_/g, " ")}
            {o.tracking_number ? ` · Tracking ${o.tracking_number}` : ""}
          </p>
          {o.shipping_address && (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              Ship to: {o.shipping_address.name ? `${o.shipping_address.name}, ` : ""}
              {o.shipping_address.line1 || ""} {o.shipping_address.line2 || ""},{" "}
              {o.shipping_address.city || ""} {o.shipping_address.postal_code || ""},{" "}
              {o.shipping_address.country || ""}
            </p>
          )}
          <table className="data" style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Product</th><th>Size</th><th>SKU</th><th>Price</th></tr>
            </thead>
            <tbody>
              {(byOrder.get(o.id) || []).map((i, idx) => (
                <tr key={idx}>
                  <td>{i.product_name}</td>
                  <td>{i.size}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{i.sku}</td>
                  <td>{usd(Number(i.price_cents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            Subtotal {usd(Number(o.subtotal_cents))}
            {Number(o.discount_cents) > 0 && `, discount ${usd(Number(o.discount_cents))}${o.offer_code ? ` (${o.offer_code})` : ""}`}
            {`, shipping ${usd(Number(o.shipping_cents))}, total `}
            <strong>{usd(Number(o.total_cents))}</strong>
          </p>
        </div>
      ))}
    </div>
  );
}
