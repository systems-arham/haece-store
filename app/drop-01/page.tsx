import sql from "@/lib/db";
import ProductCard, { CardProduct } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Drop 01, Fall / Winter 2026, HAECE" };

export default async function Drop01() {
  const rows = await sql`
    SELECT p.id, p.name, p.slug, p.tagline, p.price_cents, p.image,
           (SELECT '/api/product-image/' || pi.id FROM product_images pi
            WHERE pi.product_id = p.id AND pi.kind = 'main' ORDER BY pi.id DESC LIMIT 1) AS db_image
    FROM products p
    JOIN collections c ON c.id = p.collection_id
    WHERE c.code = 'FW26' AND c.visible = true AND p.visible = true
    ORDER BY p.sort
  `;
  const products = (rows as any[]).map((r) => ({
    id: r.id, name: r.name, slug: r.slug, tagline: r.tagline,
    price_cents: r.price_cents, image: r.db_image || r.image,
  })) as CardProduct[];
  return (
    <>
      <div className="crumbs">
        <span>Collection</span>
      </div>
      <section className="drop" style={{ paddingTop: 10 }}>
        <div className="drop-head">
          <span className="micro">Drop 01, Fall / Winter 2026</span>
          <span className="micro">{products.length} pieces</span>
        </div>
        <div className="grid four">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
