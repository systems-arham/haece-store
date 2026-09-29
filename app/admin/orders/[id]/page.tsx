import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { usd, editionLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

async function setStatus(orderNumber: string, status: string) {
  "use server";
  await sql`UPDATE orders SET status = ${status} WHERE order_number = ${orderNumber}`;
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderNumber } = await params;
  const orows = await sql`SELECT * FROM orders WHERE order_number = ${orderNumber} LIMIT 1`;
  if (!orows.length) notFound();
  const o = orows[0] as any;

  const items = await sql`
    SELECT i.product_name, i.sku, i.size, i.price_cents, u.unit_code, u.edition_number
    FROM order_items i
    JOIN inventory_units u ON u.id = i.unit_id
    WHERE i.order_id = ${o.id}
  `;

  const addr = o.shipping_address as any;

  return (
    <>
      <p style={{ marginBottom: 16 }}>
        <Link href="/admin/orders" style={{ fontSize: 13, color: "var(--muted)" }}>Back to orders</Link>
      </p>
      <h1>{o.order_number}</h1>
      <p className="admin-sub">
        Placed {new Date(o.created_at).toLocaleString()}
        {o.paid_at ? `, paid ${new Date(o.paid_at).toLocaleString()}` : ""}
      </p>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="stat"><span className="k">Status</span><p className="v" style={{ fontSize: 20 }}>{o.status.replace("_", " ")}</p></div>
        <div className="stat"><span className="k">Total</span><p className="v" style={{ fontSize: 20 }}>{usd(Number(o.total_cents))}</p></div>
        <div className="stat"><span className="k">Customer</span><p className="v" style={{ fontSize: 16 }}>{o.email || "-"}</p></div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Units in this order</h2></div>
        <table className="data">
          <thead>
            <tr><th>Product</th><th>Size</th><th>SKU</th><th>Unit code</th><th>Edition</th><th>Price</th></tr>
          </thead>
          <tbody>
            {(items as any[]).map((i) => (
              <tr key={i.unit_code}>
                <td>{i.product_name}</td>
                <td>{i.size}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{i.sku}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{i.unit_code}</td>
                <td>{editionLabel(Number(i.edition_number))}</td>
                <td>{usd(Number(i.price_cents))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addr && (
        <div className="panel">
          <div className="panel-head"><h2>Shipping address</h2></div>
          <div className="panel-body">
            <p style={{ fontSize: 14 }}>
              {addr.name}<br />
              {addr.line1} {addr.line2 || ""}<br />
              {addr.city}, {addr.state || ""} {addr.postal_code}<br />
              {addr.country}
            </p>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><h2>Update status</h2></div>
        <div className="panel-body" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <form action={setStatus.bind(null, o.order_number, "shipped")}>
            <button className="mini-btn">Mark shipped</button>
          </form>
          <form action={setStatus.bind(null, o.order_number, "delivered")}>
            <button className="mini-btn">Mark delivered</button>
          </form>
          <form action={setStatus.bind(null, o.order_number, "cancelled")}>
            <button className="mini-btn danger">Cancel order</button>
          </form>
        </div>
      </div>
    </>
  );
}
