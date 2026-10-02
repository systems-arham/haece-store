import Link from "next/link";
import sql from "@/lib/db";
import { usd } from "@/lib/format";
import { adminBasePath } from "@/lib/admin-path";

export const dynamic = "force-dynamic";

const FULFILLED = ["paid", "shipped", "in_transit", "delivered"];

function monthStart(param?: string): string {
  if (param && /^\d{4}-\d{2}$/.test(param)) return `${param}-01`;
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}

function shiftMonth(start: string, delta: number): string {
  const d = new Date(start + "T00:00:00");
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function AdminReports({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const start = monthStart(m);
  const ym = start.slice(0, 7);
  const d = new Date(start + "T00:00:00");
  const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

  const totals = (await sql`
    SELECT COUNT(*) AS orders, COALESCE(SUM(total_cents),0) AS revenue,
           COALESCE(SUM(subtotal_cents),0) AS subtotal, COALESCE(SUM(discount_cents),0) AS discount,
           COALESCE(SUM(shipping_cents),0) AS shipping
    FROM orders
    WHERE status = ANY(${FULFILLED}) AND date_trunc('month', paid_at) = ${start}::date
  `) as any[];
  const t = totals[0];

  const costRows = (await sql`
    SELECT COALESCE(SUM(i.unit_cost_cents),0) AS cost,
           COUNT(*) FILTER (WHERE i.unit_cost_cents IS NULL) AS missing
    FROM order_items i
    JOIN orders o ON o.id = i.order_id
    WHERE o.status = ANY(${FULFILLED}) AND date_trunc('month', o.paid_at) = ${start}::date
  `) as any[];
  const cost = Number(costRows[0].cost);
  const missingCosts = Number(costRows[0].missing);

  const perProduct = (await sql`
    SELECT i.product_name AS name, COUNT(*) AS units,
           COALESCE(SUM(i.price_cents),0) AS revenue,
           COALESCE(SUM(i.unit_cost_cents),0) AS cost,
           COUNT(*) FILTER (WHERE i.unit_cost_cents IS NULL) AS missing
    FROM order_items i
    JOIN orders o ON o.id = i.order_id
    WHERE o.status = ANY(${FULFILLED}) AND date_trunc('month', o.paid_at) = ${start}::date
    GROUP BY i.product_name
    ORDER BY revenue DESC
  `) as any[];

  const revenue = Number(t.revenue);
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const cut = profit * 0.045;
  const afterCut = profit - cut;

  const boxes = [
    { k: "Revenue generated", v: usd(revenue) },
    { k: "Production cost", v: usd(cost) },
    { k: "Profit generated", v: usd(profit) },
    { k: "Margin", v: `${margin.toFixed(1)}%` },
    { k: "4.5% of profit", v: usd(cut) },
    { k: "Profit after 4.5%", v: usd(afterCut) },
  ];

  return (
    <>
      <h1>Reports</h1>
      <p className="admin-sub">
        Revenue and profit per month. Costs are snapshotted at sale time, so editing a cost later never rewrites a past month.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <Link href={`/admin/reports?m=${shiftMonth(start, -1)}`} className="mini-btn" style={{ textDecoration: "none" }}>Previous</Link>
        <strong style={{ fontSize: 15 }}>{label}</strong>
        <Link href={`/admin/reports?m=${shiftMonth(start, 1)}`} className="mini-btn" style={{ textDecoration: "none" }}>Next</Link>
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 8 }}>
          {Number(t.orders)} paid {Number(t.orders) === 1 ? "order" : "orders"}
        </span>
      </div>

      {missingCosts > 0 && (
        <div className="panel"><div className="panel-body" style={{ color: "var(--warn)", fontSize: 14 }}>
          {missingCosts} sold {missingCosts === 1 ? "piece has" : "pieces have"} no production cost recorded.
          Set the cost per piece on the <Link href={adminBasePath() + "/products"} style={{ textDecoration: "underline" }}>Products</Link> page
          for complete profit figures. New sales snapshot the cost automatically.
        </div></div>
      )}

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {boxes.map((b) => (
          <div className="stat" key={b.k}>
            <span className="k">{b.k}</span>
            <p className="v" style={{ fontSize: 22 }}>{b.v}</p>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Per product, {label}</h2></div>
        <table className="data">
          <thead>
            <tr><th>Product</th><th>Units</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin</th></tr>
          </thead>
          <tbody>
            {perProduct.map((p: any) => {
              const rev = Number(p.revenue);
              const c = Number(p.cost);
              const pr = rev - c;
              const mg = rev > 0 ? (pr / rev) * 100 : 0;
              return (
                <tr key={p.name}>
                  <td><strong>{p.name}</strong>{Number(p.missing) > 0 && <span style={{ color: "var(--warn)", fontSize: 11 }}> , cost incomplete</span>}</td>
                  <td>{p.units}</td>
                  <td>{usd(rev)}</td>
                  <td>{usd(c)}</td>
                  <td>{usd(pr)}</td>
                  <td>{mg.toFixed(1)}%</td>
                </tr>
              );
            })}
            {perProduct.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--muted)" }}>No sales this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
