import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

async function setSizeStatus(formData: FormData) {
  "use server";
  const variantId = Number(formData.get("variant_id"));
  const to = String(formData.get("to"));
  if (!variantId || (to !== "discontinued" && to !== "in_stock")) return;
  const from = to === "discontinued" ? "in_stock" : "discontinued";
  try {
    const units = (await sql`
      SELECT id FROM inventory_units WHERE variant_id = ${variantId} AND status = ${from}
    `) as any[];
    for (const u of units) {
      await sql`INSERT INTO inventory_movements (unit_id, from_status, to_status) VALUES (${u.id}, ${from}, ${to})`;
    }
    await sql`
      UPDATE inventory_units
      SET status = ${to}, reserved_until = NULL, order_id = NULL
      WHERE variant_id = ${variantId} AND status = ${from}
    `;
  } catch (e) {
    redirect("/admin/inventory?sellout=failed");
  }
  revalidatePath("/admin/inventory");
}

export default async function AdminInventory({
  searchParams,
}: {
  searchParams: Promise<{ sellout?: string }>;
}) {
  const sp = await searchParams;
  const rows = (await sql`
    SELECT v.id AS variant_id, p.name AS product, v.size, v.sku,
           COUNT(u.id) FILTER (WHERE u.status='in_stock') AS in_stock,
           COUNT(u.id) FILTER (WHERE u.status='reserved') AS reserved,
           COUNT(u.id) FILTER (WHERE u.status='sold') AS sold,
           COUNT(u.id) FILTER (WHERE u.status='discontinued') AS discontinued
    FROM variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN inventory_units u ON u.variant_id = v.id
    GROUP BY v.id, p.name, p.sort, v.size, v.sku, v.sort_order
    ORDER BY p.sort, v.sort_order
  `) as any[];
  return (
    <>
      <h1>Inventory</h1>
      <p className="admin-sub">
        Serialized units. Stock is always the count of in stock units, never a typed number.
        Sell out removes a size from sale (units become discontinued). Restock brings them back.
      </p>
      {sp.sellout === "failed" && (
        <div className="panel"><div className="panel-body" style={{ color: "var(--bad)", fontSize: 14 }}>
          Sell out failed. The database is missing the discontinued status. Run
          db/migrations/002-admin-controls.sql in the Neon SQL editor, then try again.
        </div></div>
      )}
      <div className="panel">
        <table className="data">
          <thead>
            <tr><th>Product</th><th>Size</th><th>SKU</th><th>In stock</th><th>Reserved</th><th>Sold</th><th>Off sale</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const inStock = Number(r.in_stock);
              const off = Number(r.discontinued);
              return (
                <tr key={r.sku}>
                  <td>{r.product}</td>
                  <td>{r.size}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.sku}</td>
                  <td>
                    <span className={`badge ${inStock === 0 ? "expired" : inStock < 20 ? "reserved" : "in_stock"}`}>
                      {r.in_stock}
                    </span>
                  </td>
                  <td>{r.reserved}</td>
                  <td>{r.sold}</td>
                  <td>{r.discontinued}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {inStock > 0 && (
                      <form action={setSizeStatus} style={{ display: "inline" }}>
                        <input type="hidden" name="variant_id" value={r.variant_id} />
                        <input type="hidden" name="to" value="discontinued" />
                        <button className="mini-btn" title="Remove this size from sale">Sell out</button>
                      </form>
                    )}
                    {off > 0 && (
                      <form action={setSizeStatus} style={{ display: "inline", marginLeft: 6 }}>
                        <input type="hidden" name="variant_id" value={r.variant_id} />
                        <input type="hidden" name="to" value="in_stock" />
                        <button className="mini-btn" title="Put this size back on sale">Restock</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
