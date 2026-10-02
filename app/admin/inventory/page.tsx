import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { adminBasePath } from "@/lib/admin-path";

export const dynamic = "force-dynamic";

// Set the exact number of in stock units for a size. Lowering moves units
// off sale (discontinued); raising brings off sale units back. Sold and
// reserved units are never touched, and no new serials are ever minted,
// so the edition numbering stays intact.
async function setStock(formData: FormData) {
  "use server";
  const variantId = Number(formData.get("variant_id"));
  const rawTarget = Number(formData.get("target"));
  if (!variantId || !Number.isFinite(rawTarget)) return;
  try {
    const counts = (await sql`
      SELECT COUNT(*) FILTER (WHERE status = 'in_stock') AS in_stock,
             COUNT(*) FILTER (WHERE status = 'discontinued') AS discontinued
      FROM inventory_units WHERE variant_id = ${variantId}
    `) as any[];
    const cur = Number(counts[0]?.in_stock || 0);
    const disc = Number(counts[0]?.discontinued || 0);
    const target = Math.min(Math.max(0, Math.floor(rawTarget)), cur + disc);
    if (target === cur) return;
    if (target < cur) {
      const n = cur - target;
      await sql`
        INSERT INTO inventory_movements (unit_id, from_status, to_status)
        SELECT id, 'in_stock', 'discontinued' FROM inventory_units
        WHERE variant_id = ${variantId} AND status = 'in_stock'
        ORDER BY id DESC LIMIT ${n}`;
      await sql`
        UPDATE inventory_units SET status = 'discontinued', reserved_until = NULL, order_id = NULL
        WHERE id IN (
          SELECT id FROM inventory_units
          WHERE variant_id = ${variantId} AND status = 'in_stock'
          ORDER BY id DESC LIMIT ${n}
        )`;
    } else {
      const n = target - cur;
      await sql`
        INSERT INTO inventory_movements (unit_id, from_status, to_status)
        SELECT id, 'discontinued', 'in_stock' FROM inventory_units
        WHERE variant_id = ${variantId} AND status = 'discontinued'
        ORDER BY id LIMIT ${n}`;
      await sql`
        UPDATE inventory_units SET status = 'in_stock'
        WHERE id IN (
          SELECT id FROM inventory_units
          WHERE variant_id = ${variantId} AND status = 'discontinued'
          ORDER BY id LIMIT ${n}
        )`;
    }
  } catch (e) {
    redirect(adminBasePath() + "/inventory?stock=failed");
  }
  revalidatePath("/admin/inventory");
}

export default async function AdminInventory({
  searchParams,
}: {
  searchParams: Promise<{ stock?: string }>;
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
        Serialized units. Type the exact number of in stock units per size and press Set.
        Lowering the number moves units off sale; raising it brings off sale units back.
        Sold and reserved units are never touched.
      </p>
      {sp.stock === "failed" && (
        <div className="panel"><div className="panel-body" style={{ color: "var(--bad)", fontSize: 14 }}>
          Stock update failed. The database is missing the discontinued status. Run
          db/migrations/002-admin-controls.sql in the Neon SQL editor, then try again.
        </div></div>
      )}
      <div className="panel">
        <table className="data">
          <thead>
            <tr><th>Product</th><th>Size</th><th>SKU</th><th>In stock</th><th>Reserved</th><th>Sold</th><th>Off sale</th><th>Set stock</th></tr>
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
                  <td>
                    <form action={setStock} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="hidden" name="variant_id" value={r.variant_id} />
                      <input
                        name="target"
                        type="number"
                        min={0}
                        max={inStock + off}
                        step={1}
                        defaultValue={inStock}
                        title={`Set in stock units (0 to ${inStock + off})`}
                        style={{ width: 80, padding: "8px 10px", border: "1px solid var(--hairline)", fontSize: 13 }}
                      />
                      <button className="mini-btn">Set</button>
                    </form>
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
