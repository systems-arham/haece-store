import Link from "next/link";
import Image from "next/image";
import sql, { getContent } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import FounderCarousel from "@/components/FounderCarousel";
import Newsletter from "@/components/Newsletter";

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
  const rows = await sql`
    SELECT p.id, p.name, p.slug, p.tagline, p.price_cents, p.image,
           (SELECT '/api/product-image/' || pi.id FROM product_images pi
            WHERE pi.product_id = p.id AND pi.kind = 'main' ORDER BY pi.id DESC LIMIT 1) AS db_image
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
  const irows = (await sql`
    SELECT id, kind FROM product_images WHERE product_id = ${p.id} ORDER BY kind, sort, id
  `) as any[];
  if (irows.length) {
    const main = irows.find((r) => r.kind === "main");
    const gal = irows.filter((r) => r.kind === "gallery");
    return [`/api/product-image/${main.id}`, ...gal.map((r) => `/api/product-image/${r.id}`)];
  }
  const g = p.gallery as string[] | null;
  return g && g.length ? g : [p.image];
}

export default async function Home() {
  const drop01 = await dropProducts("FW26");
  const founderImages = await founderGallery();
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
