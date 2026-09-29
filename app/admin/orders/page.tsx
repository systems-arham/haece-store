import Link from "next/link";
import sql from "@/lib/db";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const rows = await sql`
    SELECT o.order_number, o.email, o.total_cents, o.status, o.created_at,
           (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS items
    FROM orders o
    ORDER BY o.id DESC
    LIMIT 100
  `;
  return (
    <>
      <h1>Orders</h1>
      <p className="admin-sub">Every order, newest first. Failed payments never create orders.</p>
      <div className="panel">
        <table className="data">
          <thead>
            <tr><th>Order</th><th>Email</th><th>Items</th><th>Total</th><th>Status</th><th>Placed</th></tr>
          </thead>
          <tbody>
            {(rows as any[]).map((o) => (
              <tr key={o.order_number}>
                <td>
                  <Link href={`/admin/orders/${o.order_number}`} style={{ textDecoration: "underline", fontWeight: 600 }}>
                    {o.order_number}
                  </Link>
                </td>
                <td>{o.email || "-"}</td>
                <td>{o.items}</td>
                <td>{usd(Number(o.total_cents))}</td>
                <td>
                  <span className={`badge ${o.status === "paid" ? "paid" : o.status === "pending_payment" ? "pending" : o.status === "shipped" || o.status === "delivered" ? "in_stock" : "expired"}`}>
                    {o.status.replace("_", " ")}
                  </span>
                </td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
