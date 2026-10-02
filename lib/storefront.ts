import sql from "./db";

// Optional production migrations the storefront degrades without:
//   002: product_images table (uploaded photography)
//   004: products.preorder / products.preorder_note (pre-order badges)
// Probed once per server instance. A migration that hasn't been run yet
// hides its feature instead of crashing the page.
type Features = { images: boolean; preorder: boolean };
let cache: Features | null = null;

export async function storefrontFeatures(): Promise<Features> {
  if (!cache) {
    const t = (await sql`SELECT to_regclass('public.product_images') AS tbl`) as Array<{ tbl: string | null }>;
    const cols = (await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'products'
    `) as Array<{ column_name: string }>;
    cache = {
      images: !!t[0]?.tbl,
      preorder: cols.some((c) => c.column_name === "preorder"),
    };
  }
  return cache;
}
