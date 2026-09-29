import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

async function toggleVisible(id: number, visible: boolean) {
  "use server";
  await sql`UPDATE products SET visible = ${!visible} WHERE id = ${id}`;
  revalidatePath("/admin/products");
}

async function setPrice(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  const dollars = Number(formData.get("price"));
  if (!id || !(dollars > 0)) return;
  await sql`UPDATE products SET price_cents = ${Math.round(dollars * 100)} WHERE id = ${id}`;
  revalidatePath("/admin/products");
}

export default async function AdminProducts() {
  const rows = await sql`
    SELECT p.id, p.name, p.slug, p.price_cents, p.visible, c.code AS collection, c.visible AS collection_visible,
           (SELECT COUNT(*) FROM inventory_units u JOIN variants v ON v.id = u.variant_id
            WHERE v.product_id = p.id AND u.status = 'in_stock') AS stock
    FROM products p
    JOIN collections c ON c.id = p.collection_id
    ORDER BY c.code, p.sort
  `;
  return (
    <>
      <h1>Products</h1>
      <p className="admin-sub">Prices, visibility, and stock. Changes apply to the store immediately.</p>
      <div className="panel">
        <table className="data">
          <thead>
            <tr><th>Product</th><th>Collection</th><th>Price</th><th>In stock</th><th>Visible</th></tr>
          </thead>
          <tbody>
            {(rows as any[]).map((p) => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong><br /><span style={{ color: "var(--muted)", fontSize: 12 }}>{p.slug}</span></td>
                <td>
                  {p.collection}
                  {!p.collection_visible && <span className="badge expired" style={{ marginLeft: 8 }}>hidden drop</span>}
                </td>
                <td>
                  <form action={setPrice} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="price"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={Math.round(Number(p.price_cents) / 100)}
                      style={{ width: 80, padding: "8px 10px", border: "1px solid var(--hairline)", fontSize: 13 }}
                    />
                    <button className="mini-btn">Set</button>
                  </form>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{usd(Number(p.price_cents))}</span>
                </td>
                <td>{p.stock}</td>
                <td>
                  <form action={toggleVisible.bind(null, p.id, p.visible)}>
                    <button className={`toggle${p.visible ? " on" : ""}`} aria-label="Toggle visibility" />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
