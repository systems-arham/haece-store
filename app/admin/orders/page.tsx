import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import { usd } from "@/lib/format";
import { adminBasePath } from "@/lib/admin-path";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
const FULFILLMENT = ["paid", "shipped", "in_transit", "delivered"] as const;
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

function badgeClass(status: string) {
  if (status === "paid") return "paid";
  if (status === "pending_payment") return "pending";
  if (status === "shipped" || status === "in_transit" || status === "delivered") return "in_stock";
  return "expired";
}

async function setStatus(formData: FormData) {
  "use server";
  const orderNumber = String(formData.get("order_number") || "");
  const status = String(formData.get("status") || "");
  const page = String(formData.get("page") || "1");
  if (!orderNumber || !(FULFILLMENT as readonly string[]).includes(status)) return;
  await sql`UPDATE orders SET status = ${status} WHERE order_number = ${orderNumber}`;
  revalidatePath("/admin/orders");
  redirect(`${adminBasePath()}/orders?page=${page}`);
}

async function resetCounter() {
  "use server";
  const c = (await sql`SELECT COUNT(*) AS c FROM orders`) as { c: string }[];
  if (Number(c[0].c) > 0) return;
  await sql`ALTER SEQUENCE order_number_seq RESTART WITH 1`;
  revalidatePath("/admin/orders");
}

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const totalRows = (await sql`SELECT COUNT(*) AS c FROM orders`) as { c: string }[];
  const total = Number(totalRows[0].c);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), pages);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = (await sql`
    SELECT o.order_number, o.email, o.total_cents, o.status, o.created_at, o.tracking_number,
           (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS items
    FROM orders o
    ORDER BY o.id DESC
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `) as any[];

  return (
    <>
      <h1>Orders</h1>
      <p className="admin-sub">
        {total} {total === 1 ? "order" : "orders"}, newest first. Failed payments never create orders.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href={adminBasePath() + "/orders/print"} className="mini-btn" style={{ textDecoration: "none", padding: "9px 14px" }}>
          Print list
        </Link>
        <a href="/api/admin/orders/export" className="mini-btn" style={{ textDecoration: "none", padding: "9px 14px" }}>
          Export CSV
        </a>
      </div>

      <div className="panel">
        <table className="data">
          <thead>
            <tr><th>Order</th><th>Email</th><th>Items</th><th>Total</th><th>Status</th><th>Placed</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.order_number}>
                <td>
                  <Link href={`/admin/orders/${o.order_number}`} style={{ textDecoration: "underline", fontWeight: 600 }}>
                    {o.order_number}
                  </Link>
                  {o.tracking_number && (
                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>{o.tracking_number}</div>
                  )}
                </td>
                <td>{o.email || "-"}</td>
                <td>{o.items}</td>
                <td>{usd(Number(o.total_cents))}</td>
                <td>
                  <span className={`badge ${badgeClass(o.status)}`}>
                    {STATUS_LABEL[o.status] || o.status.replace(/_/g, " ")}
                  </span>
                  {FULFILLMENT.includes(o.status) && (
                    <form action={setStatus} style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <input type="hidden" name="order_number" value={o.order_number} />
                      <input type="hidden" name="page" value={page} />
                      <select
                        name="status"
                        defaultValue={o.status}
                        style={{ fontSize: 12, padding: "5px 8px", border: "1px solid var(--hairline)" }}
                        aria-label={`Update status for ${o.order_number}`}
                      >
                        {FULFILLMENT.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                      <button className="mini-btn" type="submit">Set</button>
                    </form>
                  )}
                </td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--muted)" }}>No orders yet.</td></tr>
            )}
          </tbody>
        </table>
        {pages > 1 && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 22px", borderTop: "1px solid var(--hairline)" }}>
            {page > 1 ? (
              <Link href={`/admin/orders?page=${page - 1}`} className="mini-btn" style={{ textDecoration: "none" }}>Previous</Link>
            ) : (
              <span className="mini-btn" style={{ opacity: 0.4 }}>Previous</span>
            )}
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Page {page} of {pages}</span>
            {page < pages ? (
              <Link href={`/admin/orders?page=${page + 1}`} className="mini-btn" style={{ textDecoration: "none" }}>Next</Link>
            ) : (
              <span className="mini-btn" style={{ opacity: 0.4 }}>Next</span>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Order counter</h2></div>
        <div className="panel-body">
          {total === 0 ? (
            <>
              <p style={{ fontSize: 14, marginBottom: 14 }}>
                No orders in the table. You can safely restart numbering at HAE-0001.
              </p>
              <form action={resetCounter}>
                <button className="mini-btn danger">Reset counter to HAE-0001</button>
              </form>
            </>
          ) : (
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              Locked while orders exist. Delete every order first, then the counter can restart at HAE-0001.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
