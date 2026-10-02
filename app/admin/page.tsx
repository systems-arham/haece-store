import Link from "next/link";
import sql from "@/lib/db";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const FULFILLED = ["paid", "shipped", "in_transit", "delivered"];
  const rev = await sql`SELECT COALESCE(SUM(total_cents),0) AS s FROM orders WHERE status = ANY(${FULFILLED})`;
  const paidCount = await sql`SELECT COUNT(*) AS c FROM orders WHERE status = ANY(${FULFILLED})`;
  const pendingCount = await sql`SELECT COUNT(*) AS c FROM orders WHERE status='pending_payment'`;
  const units = await sql`
    SELECT status, COUNT(*) AS c FROM inventory_units GROUP BY status
  `;
  const low = await sql`
    SELECT p.name, v.size, v.sku, COUNT(u.id) AS stock
    FROM variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN inventory_units u ON u.variant_id = v.id AND u.status = 'in_stock'
    GROUP BY p.name, v.size, v.sku
    HAVING COUNT(u.id) < 20
    ORDER BY COUNT(u.id)
    LIMIT 10
  `;
  const recent = await sql`
    SELECT order_number, email, total_cents, status, created_at FROM orders
    ORDER BY id DESC LIMIT 8
  `;

  const revenue = Number((rev[0] as { s: string }).s);
  const unitMap = Object.fromEntries((units as any[]).map((u) => [u.status, Number(u.c)]));

  const stats = [
    { k: "Revenue", v: usd(revenue) },
    { k: "Fulfilled orders", v: String(Number((paidCount[0] as { c: string }).c)) },
    { k: "Awaiting payment", v: String(Number((pendingCount[0] as { c: string }).c)) },
    { k: "Units in stock", v: String(unitMap["in_stock"] || 0) },
  ];

  return (
    <>
      <h1>Dashboard</h1>
      <p className="admin-sub">The house at a glance.</p>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat" key={s.k}>
            <span className="k">{s.k}</span>
            <p className="v">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Recent orders</h2>
          <Link href="/admin/orders" className="mini-btn">All orders</Link>
        </div>
        <table className="data">
          <thead>
            <tr><th>Order</th><th>Email</th><th>Total</th><th>Status</th><th>Placed</th></tr>
          </thead>
          <tbody>
            {(recent as any[]).map((o) => (
              <tr key={o.order_number}>
                <td><Link href={`/admin/orders/${o.order_number}`} style={{ textDecoration: "underline" }}>{o.order_number}</Link></td>
                <td>{o.email || "-"}</td>
                <td>{usd(Number(o.total_cents))}</td>
                <td><span className={`badge ${o.status === "paid" ? "paid" : o.status === "pending_payment" ? "pending" : o.status === "shipped" || o.status === "in_transit" || o.status === "delivered" ? "in_stock" : "expired"}`}>{o.status.replace(/_/g, " ")}</span></td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Low stock variants</h2></div>
        <table className="data">
          <thead>
            <tr><th>Product</th><th>Size</th><th>SKU</th><th>In stock</th></tr>
          </thead>
          <tbody>
            {(low as any[]).length === 0 && (
              <tr><td colSpan={4} style={{ color: "var(--muted)" }}>All variants are healthy.</td></tr>
            )}
            {(low as any[]).map((l) => (
              <tr key={l.sku}>
                <td>{l.name}</td>
                <td>{l.size}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{l.sku}</td>
                <td><strong>{l.stock}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
