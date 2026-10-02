import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { usd, editionLabel } from "@/lib/format";
import { adminBasePath } from "@/lib/admin-path";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Confirmed",
  shipped: "Shipped",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  expired: "Expired",
  refunded: "Refunded",
};

async function setStatus(orderNumber: string, status: string) {
  "use server";
  await sql`UPDATE orders SET status = ${status} WHERE order_number = ${orderNumber}`;
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

async function saveTracking(formData: FormData) {
  "use server";
  const orderNumber = String(formData.get("order_number") || "");
  const tracking = String(formData.get("tracking_number") || "").trim() || null;
  await sql`UPDATE orders SET tracking_number = ${tracking} WHERE order_number = ${orderNumber}`;
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/orders");
}

async function refundOrder(formData: FormData) {
  "use server";
  const orderNumber = String(formData.get("order_number") || "");
  const rows = (await sql`SELECT id, order_number, stripe_session_id FROM orders WHERE order_number = ${orderNumber} LIMIT 1`) as any[];
  if (!rows.length) return;
  const o = rows[0];
  try {
    if (!o.stripe_session_id) throw new Error("No Stripe session recorded on this order.");
    const session = await stripe.checkout.sessions.retrieve(o.stripe_session_id);
    const pi = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as any)?.id;
    if (!pi) throw new Error("No payment found on the Stripe session.");
    await stripe.refunds.create({ payment_intent: pi });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refund failed.";
    redirect(`${adminBasePath()}/orders/${orderNumber}?refund=failed&msg=${encodeURIComponent(msg)}`);
  }
  const units = (await sql`SELECT id, status FROM inventory_units WHERE order_id = ${o.id} AND status IN ('sold','reserved')`) as any[];
  for (const u of units) {
    await sql`INSERT INTO inventory_movements (unit_id, from_status, to_status, order_id) VALUES (${u.id}, ${u.status}, 'in_stock', ${o.id})`;
  }
  await sql`UPDATE inventory_units SET status='in_stock', reserved_until=NULL, order_id=NULL WHERE order_id=${o.id} AND status IN ('sold','reserved')`;
  await sql`UPDATE orders SET status='refunded' WHERE id=${o.id}`;
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect(`${adminBasePath()}/orders/${orderNumber}?refund=done`);
}

async function deleteOrder(formData: FormData) {
  "use server";
  const orderNumber = String(formData.get("order_number") || "");
  const rows = (await sql`SELECT id FROM orders WHERE order_number = ${orderNumber} LIMIT 1`) as any[];
  if (!rows.length) return;
  const orderId = rows[0].id;
  const units = (await sql`SELECT id, status FROM inventory_units WHERE order_id = ${orderId} AND status IN ('sold','reserved')`) as any[];
  for (const u of units) {
    await sql`INSERT INTO inventory_movements (unit_id, from_status, to_status, order_id) VALUES (${u.id}, ${u.status}, 'in_stock', ${orderId})`;
  }
  await sql`UPDATE inventory_units SET status='in_stock', reserved_until=NULL, order_id=NULL WHERE order_id=${orderId} AND status IN ('sold','reserved')`;
  await sql`DELETE FROM order_items WHERE order_id = ${orderId}`;
  await sql`DELETE FROM orders WHERE id = ${orderId}`;
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect(adminBasePath() + "/orders");
}

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirm?: string; refund?: string; msg?: string }>;
}) {
  const { id: orderNumber } = await params;
  const sp = await searchParams;
  const orows = (await sql`SELECT * FROM orders WHERE order_number = ${orderNumber} LIMIT 1`) as any[];
  if (!orows.length) notFound();
  const o = orows[0];

  const items = (await sql`
    SELECT i.product_name, i.sku, i.size, i.price_cents, i.unit_cost_cents, u.unit_code, u.edition_number
    FROM order_items i
    JOIN inventory_units u ON u.id = i.unit_id
    WHERE i.order_id = ${o.id}
  `) as any[];

  const addr = o.shipping_address as any;
  const refundable = ["paid", "shipped", "in_transit", "delivered"].includes(o.status);

  return (
    <>
      <p style={{ marginBottom: 16 }}>
        <Link href={adminBasePath() + "/orders"} style={{ fontSize: 13, color: "var(--muted)" }}>Back to orders</Link>
      </p>
      <h1>{o.order_number}</h1>
      <p className="admin-sub">
        Placed {new Date(o.created_at).toLocaleString()}
        {o.paid_at ? `, paid ${new Date(o.paid_at).toLocaleString()}` : ""}
      </p>

      {sp.refund === "done" && (
        <div className="panel"><div className="panel-body" style={{ color: "var(--ok)" }}>
          Refunded via Stripe. The units are back in stock.
        </div></div>
      )}
      {sp.refund === "failed" && (
        <div className="panel"><div className="panel-body" style={{ color: "var(--bad)" }}>
          Refund failed: {sp.msg || "unknown error."}
        </div></div>
      )}

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="stat"><span className="k">Status</span><p className="v" style={{ fontSize: 20 }}>{STATUS_LABEL[o.status] || o.status.replace(/_/g, " ")}</p></div>
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
            {items.map((i) => (
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

      <div className="panel">
        <div className="panel-head"><h2>Totals</h2></div>
        <div className="panel-body" style={{ fontSize: 14 }}>
          <p>Subtotal {usd(Number(o.subtotal_cents))}</p>
          {Number(o.discount_cents) > 0 && (
            <p>Discount {usd(Number(o.discount_cents))}{o.offer_code ? `, code ${o.offer_code}` : ""}</p>
          )}
          <p>Shipping {usd(Number(o.shipping_cents))}</p>
          <p style={{ fontWeight: 700, marginTop: 8 }}>Total {usd(Number(o.total_cents))}</p>
        </div>
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
          <form action={setStatus.bind(null, o.order_number, "paid")}>
            <button className="mini-btn">Confirmed</button>
          </form>
          <form action={setStatus.bind(null, o.order_number, "shipped")}>
            <button className="mini-btn">Shipped</button>
          </form>
          <form action={setStatus.bind(null, o.order_number, "in_transit")}>
            <button className="mini-btn">In transit</button>
          </form>
          <form action={setStatus.bind(null, o.order_number, "delivered")}>
            <button className="mini-btn">Delivered</button>
          </form>
          <form action={setStatus.bind(null, o.order_number, "cancelled")}>
            <button className="mini-btn danger">Cancel order</button>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Tracking number</h2></div>
        <div className="panel-body">
          <form action={saveTracking} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input type="hidden" name="order_number" value={o.order_number} />
            <input
              name="tracking_number"
              defaultValue={o.tracking_number || ""}
              placeholder="Carrier tracking number"
              style={{ flex: 1, minWidth: 240, padding: "10px 12px", border: "1px solid var(--hairline)", fontSize: 14 }}
            />
            <button className="mini-btn">Save tracking</button>
          </form>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            The client sees this in Find Your Order once the status is Shipped or later.
          </p>
        </div>
      </div>

      {refundable && (
        <div className="panel">
          <div className="panel-head"><h2>Refund</h2></div>
          <div className="panel-body">
            {sp.confirm === "refund" ? (
              <>
                <p style={{ fontSize: 14, marginBottom: 14 }}>
                  This refunds {usd(Number(o.total_cents))} to the client via Stripe and returns the units to stock.
                </p>
                <form action={refundOrder} style={{ display: "flex", gap: 12 }}>
                  <input type="hidden" name="order_number" value={o.order_number} />
                  <button className="mini-btn danger">Confirm refund</button>
                  <Link href={`/admin/orders/${o.order_number}`} className="mini-btn" style={{ textDecoration: "none", padding: "9px 14px" }}>
                    Keep order
                  </Link>
                </form>
              </>
            ) : (
              <Link href={`/admin/orders/${o.order_number}?confirm=refund`} className="mini-btn danger" style={{ textDecoration: "none", padding: "9px 14px" }}>
                Refund via Stripe
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><h2>Delete order</h2></div>
        <div className="panel-body">
          {sp.confirm === "delete" ? (
            <>
              <p style={{ fontSize: 14, marginBottom: 8 }}>
                Deleting returns the units to stock first, then removes the order permanently.
              </p>
              <p style={{ fontSize: 14, marginBottom: 14 }}>
                <a href="/api/admin/orders/export" style={{ textDecoration: "underline" }}>Download the full order history (CSV)</a>
                {" "}before confirming, so the record is kept.
              </p>
              <form action={deleteOrder} style={{ display: "flex", gap: 12 }}>
                <input type="hidden" name="order_number" value={o.order_number} />
                <button className="mini-btn danger">Yes, delete permanently</button>
                <Link href={`/admin/orders/${o.order_number}`} className="mini-btn" style={{ textDecoration: "none", padding: "9px 14px" }}>
                  Keep order
                </Link>
              </form>
            </>
          ) : (
            <Link href={`/admin/orders/${o.order_number}?confirm=delete`} className="mini-btn danger" style={{ textDecoration: "none", padding: "9px 14px" }}>
              Delete order
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
