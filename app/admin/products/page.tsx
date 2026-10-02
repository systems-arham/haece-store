import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

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

async function setCost(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  const raw = String(formData.get("cost") || "").trim();
  if (!id) return;
  const cents = raw === "" ? null : Math.round(Number(raw) * 100);
  if (cents !== null && !(cents >= 0)) return;
  await sql`UPDATE products SET cost_cents = ${cents} WHERE id = ${id}`;
  revalidatePath("/admin/products");
}

async function uploadImage(formData: FormData) {
  "use server";
  const productId = Number(formData.get("product_id"));
  const kind = String(formData.get("kind")) === "gallery" ? "gallery" : "main";
  const file = formData.get("file") as unknown as File | null;
  if (!productId || !file || file.size === 0) return;
  if (file.size > MAX_BYTES) return;
  if (!ALLOWED_MIME.includes(file.type)) return;
  const buf = Buffer.from(await file.arrayBuffer());
  if (kind === "main") {
    await sql`DELETE FROM product_images WHERE product_id = ${productId} AND kind = 'main'`;
    await sql`INSERT INTO product_images (product_id, kind, mime, data, sort)
              VALUES (${productId}, 'main', ${file.type}, ${buf}, 0)`;
  } else {
    const r = (await sql`SELECT COALESCE(MAX(sort), -1) + 1 AS s FROM product_images
                         WHERE product_id = ${productId} AND kind = 'gallery'`) as any[];
    const s = Number(r[0]?.s ?? 0);
    await sql`INSERT INTO product_images (product_id, kind, mime, data, sort)
              VALUES (${productId}, 'gallery', ${file.type}, ${buf}, ${s})`;
  }
  revalidatePath("/admin/products");
}

async function deleteImage(formData: FormData) {
  "use server";
  const id = Number(formData.get("image_id"));
  if (!id) return;
  await sql`DELETE FROM product_images WHERE id = ${id}`;
  revalidatePath("/admin/products");
}

type DbImage = { id: number; product_id: number; kind: string };

export default async function AdminProducts() {
  const rows = (await sql`
    SELECT p.id, p.name, p.slug, p.image, p.price_cents, p.cost_cents, p.visible, c.code AS collection, c.visible AS collection_visible,
           (SELECT COUNT(*) FROM inventory_units u JOIN variants v ON v.id = u.variant_id
            WHERE v.product_id = p.id AND u.status = 'in_stock') AS stock
    FROM products p
    JOIN collections c ON c.id = p.collection_id
    ORDER BY c.code, p.sort
  `) as any[];
  const images = (await sql`
    SELECT id, product_id, kind FROM product_images ORDER BY product_id, kind, sort, id
  `) as DbImage[];
  const byProduct = new Map<number, DbImage[]>();
  for (const img of images) {
    const list = byProduct.get(img.product_id) || [];
    list.push(img);
    byProduct.set(img.product_id, list);
  }
  const srcFor = (p: any, kind: string) => {
    const hit = (byProduct.get(p.id) || []).find((i) => i.kind === kind);
    return hit ? `/api/product-image/${hit.id}` : null;
  };
  return (
    <>
      <h1>Products</h1>
      <p className="admin-sub">Prices, production costs, visibility, and stock. Changes apply to the store immediately. Production cost feeds the profit report; it is never shown to clients.</p>
      <div className="panel">
        <table className="data">
          <thead>
            <tr><th>Product</th><th>Collection</th><th>Price</th><th>Cost per piece</th><th>In stock</th><th>Visible</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
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
                <td>
                  <form action={setCost} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="cost"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Not set"
                      defaultValue={p.cost_cents != null ? Math.round(Number(p.cost_cents) / 100) : ""}
                      style={{ width: 80, padding: "8px 10px", border: "1px solid var(--hairline)", fontSize: 13 }}
                    />
                    <button className="mini-btn">Set</button>
                  </form>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    {p.cost_cents != null ? usd(Number(p.cost_cents)) : "Not set"}
                  </span>
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

      <h1 style={{ marginTop: 40 }}>Photography</h1>
      <p className="admin-sub">
        Main image is the card and the first gallery photo. Gallery images follow it on the product page.
        JPG, PNG, or WebP, up to 8 MB. Uploading a new main image replaces the old one.
      </p>
      {rows.map((p) => {
        const mainSrc = srcFor(p, "main") || p.image;
        const gallery = (byProduct.get(p.id) || []).filter((i) => i.kind === "gallery");
        return (
          <div className="panel" key={p.id} style={{ marginBottom: 20, padding: 22 }}>
            <h3 style={{ margin: "0 0 12px" }}>{p.name}</h3>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <p className="micro" style={{ margin: "0 0 8px" }}>Main image</p>
                <img src={mainSrc} alt={p.name} style={{ width: 160, height: 200, objectFit: "cover", display: "block", background: "#eee" }} />
                <form action={uploadImage} style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="hidden" name="product_id" value={p.id} />
                  <input type="hidden" name="kind" value="main" />
                  <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required style={{ fontSize: 12, maxWidth: 200 }} />
                  <button className="mini-btn">Upload</button>
                </form>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <p className="micro" style={{ margin: "0 0 8px" }}>Gallery ({gallery.length})</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {gallery.map((g) => (
                    <div key={g.id} style={{ position: "relative" }}>
                      <img src={`/api/product-image/${g.id}`} alt="" style={{ width: 96, height: 120, objectFit: "cover", display: "block", background: "#eee" }} />
                      <form action={deleteImage}>
                        <input type="hidden" name="image_id" value={g.id} />
                        <button className="mini-btn" style={{ marginTop: 4 }}>Remove</button>
                      </form>
                    </div>
                  ))}
                  {gallery.length === 0 && <span style={{ color: "var(--muted)", fontSize: 12 }}>No gallery images yet.</span>}
                </div>
                <form action={uploadImage} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="hidden" name="product_id" value={p.id} />
                  <input type="hidden" name="kind" value="gallery" />
                  <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required style={{ fontSize: 12, maxWidth: 200 }} />
                  <button className="mini-btn">Add photo</button>
                </form>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
