import { notFound } from "next/navigation";
import Link from "next/link";
import sql from "@/lib/db";
import ProductView from "./ProductView";
import { storefrontFeatures } from "@/lib/storefront";

export const dynamic = "force-dynamic";

type Variant = { id: number; sku: string; size: string; stock: number };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await sql`SELECT name FROM products WHERE slug = ${slug} LIMIT 1`;
  const name = rows.length ? (rows[0] as { name: string }).name : "Piece";
  return { title: `${name}, HAECE` };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await storefrontFeatures();
  const prows = await (f.preorder
    ? sql`
      SELECT p.id, p.name, p.tagline, p.description, p.details, p.price_cents, p.image, p.gallery,
             p.preorder, p.preorder_note,
             c.name AS collection_name
      FROM products p
      JOIN collections c ON c.id = p.collection_id
      WHERE p.slug = ${slug} AND p.visible = true AND c.visible = true
      LIMIT 1
    `
    : sql`
      SELECT p.id, p.name, p.tagline, p.description, p.details, p.price_cents, p.image, p.gallery,
             NULL AS preorder, NULL AS preorder_note,
             c.name AS collection_name
      FROM products p
      JOIN collections c ON c.id = p.collection_id
      WHERE p.slug = ${slug} AND p.visible = true AND c.visible = true
      LIMIT 1
    `);
  if (!prows.length) notFound();
  const p = prows[0] as {
    id: number; name: string; tagline: string; description: string;
    details: string[]; price_cents: number; image: string; gallery: string[]; collection_name: string;
    preorder: boolean; preorder_note: string | null;
  };

  const vrows = await sql`
    SELECT v.id, v.sku, v.size,
           (SELECT COUNT(*) FROM inventory_units u WHERE u.variant_id = v.id AND u.status = 'in_stock') AS stock
    FROM variants v
    WHERE v.product_id = ${p.id} AND v.visible = true
    ORDER BY v.sort_order
  `;
  const variants = (vrows as Array<{ id: number; sku: string; size: string; stock: string }>).map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    stock: Number(v.stock),
  })) as Variant[];

  const gallery: string[] = p.gallery && p.gallery.length ? p.gallery : [p.image];

  const irows = f.images
    ? ((await sql`
      SELECT id, kind FROM product_images WHERE product_id = ${p.id} ORDER BY kind, sort, id
    `) as any[])
    : [];
  const mainDb = irows.find((r) => r.kind === "main");
  const galDb = irows.filter((r) => r.kind === "gallery");
  const mainSrc = mainDb ? `/api/product-image/${mainDb.id}` : p.image;
  const gallerySrcs: string[] = irows.length
    ? [mainSrc, ...galDb.map((r) => `/api/product-image/${r.id}`)]
    : gallery;

  return (
    <>
      <div className="crumbs">
        <Link href="/drop-01">{p.collection_name}</Link> <span> / </span> <span>{p.name}</span>
      </div>
      <ProductView
        product={{
          name: p.name,
          tagline: p.tagline,
          description: p.description,
          details: p.details || [],
          priceCents: p.price_cents,
          image: mainSrc,
          slug,
          preorder: p.preorder,
          preorderNote: p.preorder_note,
        }}
        gallery={gallerySrcs}
        variants={variants}
      />
    </>
  );
}
