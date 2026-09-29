import sql from "@/lib/db";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCustomers() {
  const rows = await sql`
    SELECT c.email, c.name, c.created_at,
           COUNT(o.id) AS orders,
           COALESCE(SUM(o.total_cents) FILTER (WHERE o.status='paid'), 0) AS spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id
    ORDER BY spent DESC
    LIMIT 100
  `;
  const subs = (await sql`SELECT COUNT(*) AS c FROM newsletter_subscribers`) as any[];
  return (
    <>
      <h1>Customers</h1>
      <p className="admin-sub">
        {(rows as any[]).length} customers, {subs[0].c} on the newsletter list.
      </p>
      <div className="panel">
        <table className="data">
          <thead>
            <tr><th>Email</th><th>Name</th><th>Orders</th><th>Total spent</th><th>Since</th></tr>
          </thead>
          <tbody>
            {(rows as any[]).map((c) => (
              <tr key={c.email}>
                <td>{c.email}</td>
                <td>{c.name || "-"}</td>
                <td>{c.orders}</td>
                <td>{usd(Number(c.spent))}</td>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
