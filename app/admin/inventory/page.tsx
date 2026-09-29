import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminInventory() {
  const rows = await sql`
    SELECT p.name AS product, v.size, v.sku,
           COUNT(u.id) FILTER (WHERE u.status='in_stock') AS in_stock,
           COUNT(u.id) FILTER (WHERE u.status='reserved') AS reserved,
           COUNT(u.id) FILTER (WHERE u.status='sold') AS sold
    FROM variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN inventory_units u ON u.variant_id = v.id
    GROUP BY p.name, p.sort, v.size, v.sku, v.sort_order
    ORDER BY p.sort, v.sort_order
  `;
  return (
    <>
      <h1>Inventory</h1>
      <p className="admin-sub">Serialized units. Stock is always the count of in stock units, never a typed number.</p>
      <div className="panel">
        <table className="data">
          <thead>
            <tr><th>Product</th><th>Size</th><th>SKU</th><th>In stock</th><th>Reserved</th><th>Sold</th></tr>
          </thead>
          <tbody>
            {(rows as any[]).map((r) => (
              <tr key={r.sku}>
                <td>{r.product}</td>
                <td>{r.size}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.sku}</td>
                <td>
                  <span className={`badge ${Number(r.in_stock) === 0 ? "expired" : Number(r.in_stock) < 20 ? "reserved" : "in_stock"}`}>
                    {r.in_stock}
                  </span>
                </td>
                <td>{r.reserved}</td>
                <td>{r.sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
