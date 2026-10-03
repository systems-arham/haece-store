import Link from "next/link";
import Image from "next/image";
import sql, { getContent } from "@/lib/db";
import { usd } from "@/lib/format";
import ProductCard from "@/components/ProductCard";
import FounderCarousel from "@/components/FounderCarousel";
import Newsletter from "@/components/Newsletter";
import { storefrontFeatures } from "@/lib/storefront";

export const dynamic = "force-dynamic";

type Product = {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  price_cents: number;
  image: string;
};

async function dropProducts(code: string): Promise<Product[]> {
  const f = await storefrontFeatures();
  const rows = f.images
    ? await sql`
      SELECT p.id, p.name, p.slug, p.tagline, p.price_cents, p.image,
             (SELECT '/api/product-image/' || pi.id FROM product_images pi
              WHERE pi.product_id = p.id AND pi.kind = 'main' ORDER BY pi.id DESC LIMIT 1) AS db_image
      FROM products p
      JOIN collections c ON c.id = p.collection_id
      WHERE c.code = ${code} AND c.visible = true AND p.visible = true
      ORDER BY p.sort
    `
    : await sql`
      SELECT p.id, p.name, p.slug, p.tagline, p.price_cents, p.image,
             NULL AS db_image
      FROM products p
      JOIN collections c ON c.id = p.collection_id
      WHERE c.code = ${code} AND c.visible = true AND p.visible = true
      ORDER BY p.sort
    `;
  return (rows as any[]).map((r) => ({
    id: r.id, name: r.name, slug: r.slug, tagline: r.tagline,
    price_cents: r.price_cents, image: r.db_image || r.image,
  })) as Product[];
}

async function founderGallery(): Promise<string[]> {
  const prows = (await sql`SELECT id, image, gallery FROM products WHERE slug = 'founder-coat' LIMIT 1`) as any[];
  if (!prows.length) return [];
  const p = prows[0];
  const f = await storefrontFeatures();
  const irows = f.images
    ? ((await sql`
      SELECT id, kind FROM product_images WHERE product_id = ${p.id} ORDER BY kind, sort, id
    `) as any[])
    : [];
  if (irows.length) {
    // The gallery SQL refresh inserts only 'gallery' rows (no 'main'),
    // so fall back to the first row instead of crashing on main.id.
    const main = irows.find((r) => r.kind === "main") ?? irows[0];
    const gal = irows.filter((r) => r.kind === "gallery" && r.id !== main.id);
    return [`/api/product-image/${main.id}`, ...gal.map((r) => `/api/product-image/${r.id}`)];
  }
  const g = p.gallery as string[] | null;
  return g && g.length ? g : [p.image];
}

async function founderFeature() {
  const f = await storefrontFeatures();
  const rows = (await (f.preorder
    ? sql`
      SELECT p.name, p.slug, p.tagline, p.price_cents, p.preorder, p.preorder_note,
             (SELECT '/api/product-image/' || pi.id FROM product_images pi
              WHERE pi.product_id = p.id AND pi.kind = 'main' ORDER BY pi.id DESC LIMIT 1) AS db_image,
             p.image AS fallback_image
      FROM products p
      WHERE p.slug = 'founder-coat' AND p.visible = true
      LIMIT 1
    `
    : sql`
      SELECT p.name, p.slug, p.tagline, p.price_cents,
             NULL AS preorder, NULL AS preorder_note,
             NULL AS db_image,
             p.image AS fallback_image
      FROM products p
      WHERE p.slug = 'founder-coat' AND p.visible = true
      LIMIT 1
    `)) as any[];
  if (!rows.length) return null;
  const r = rows[0];
  return {
    name: r.name, slug: r.slug, tagline: r.tagline,
    price_cents: Number(r.price_cents),
    preorder: Boolean(r.preorder), preorder_note: r.preorder_note as string | null,
    image: r.db_image || r.fallback_image,
  };
}

export default async function Home() {
  const drop01 = await dropProducts("FW26");
  const founderImages = await founderGallery();
  const founder = await founderFeature();
  const heroCaption = await getContent("hero_caption", "Fall / Winter 2026");
  const drop02Visible = (await getContent("drop02_visible", "false")) === "true";
  const drop02 = drop02Visible ? await dropProducts("SS27") : [];

  return (
    <>
      <section className="hero">
        <Image src="/images/hero.webp" alt="Haece, Fall Winter 2026" fill priority style={{ objectFit: "cover", objectPosition: "center" }} />
        <div className="hero-caption">
          <span className="micro">{heroCaption}</span>
        </div>
      </section>

      {founder && (
        <section className="founder-feature" id="founder-coat">
          <div className="founder-img">
            <Link href={`/product/${founder.slug}`}>
              <Image src={founder.image} alt={founder.name} width={900} height={1125} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Link>
          </div>
          <div className="founder-copy">
            <span className="micro">01</span>
            <h2>{founder.name}</h2>
            <p className="tagline">{founder.tagline}</p>
            {founder.preorder && (
              <p style={{ margin: "14px 0" }}>
                <span className="badge pending">Pre-order</span>
                {founder.preorder_note && (
                  <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 10 }}>{founder.preorder_note}</span>
                )}
              </p>
            )}
            <p className="price">{usd(founder.price_cents)}</p>
            <Link href={`/product/${founder.slug}`} className="btn-dark" style={{ marginTop: 18, display: "inline-block", textDecoration: "none" }}>
              View the coat
            </Link>
          </div>
        </section>
      )}

      <section className="statement">
        <p className="micro">The House</p>
        <h2>Clothing for people building something. Cut with intent, made in limited runs, finished by hand.</h2>
      </section>

      <section className="drop" id="drop-01">
        <div className="drop-head">
          <span className="micro">Drop 01, Fall / Winter 2026</span>
          <Link href="/drop-01" className="view-all">
            View all
          </Link>
        </div>
        <div className="grid four">
          {drop01.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="craft" id="craft">
        <div className="craft-img">
          <FounderCarousel images={founderImages} name="The Founder Coat" />
        </div>
        <div className="craft-copy">
          <span className="micro">Craft</span>
          <h3>Details you feel before you see.</h3>
          <p>
            Every Haece piece is built like tailoring and worn like uniform. Barrel cuffs with buttons on a
            hoodie. A hidden placket on a layer. One embroidered mark, placed once, never repeated.
          </p>
          <ul className="detail-list">
            <li><span className="n">01</span>Considered silhouette, cut with intent</li>
            <li><span className="n">02</span>Heavyweight fabrics, brushed and finished</li>
            <li><span className="n">03</span>Single embroidered mark at the chest</li>
            <li><span className="n">04</span>Individually numbered editions</li>
          </ul>
        </div>
      </section>

      {drop02.length > 0 && (
        <section className="drop" id="drop-02">
          <div className="drop-head">
            <span className="micro">Drop 02, Summer 2027</span>
            <Link href="/drop-01" className="view-all">
              View all
            </Link>
          </div>
          <div className="grid two">
            {drop02.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="services">
        <div className="service">
          <span className="micro">Worldwide shipping</span>
          <p>Duties included. No surprise fees at the door, wherever you are.</p>
        </div>
        <div className="service">
          <span className="micro">Advance payment</span>
          <p>Secure checkout via Stripe. Your order is confirmed the moment you pay.</p>
        </div>
        <div className="service">
          <span className="micro">Numbered editions</span>
          <p>Limited runs, individually numbered. When a drop sells out, it is gone.</p>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
