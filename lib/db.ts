import { neon } from "@neondatabase/serverless";

// Lazy: only throws when a query is actually attempted, so builds and
// non-DB pages never crash on a missing DATABASE_URL.
type SqlFn = (q: TemplateStringsArray, ...params: unknown[]) => Promise<any[]>;
const sql = ((...args: unknown[]) => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const client = neon(process.env.DATABASE_URL) as unknown as SqlFn;
  return client(...(args as [TemplateStringsArray, ...unknown[]]));
}) as SqlFn;

export default sql;

export function orderNumber(n: number): string {
  return "HAE-" + String(n).padStart(4, "0");
}

export async function getContent(key: string, fallback = ""): Promise<string> {
  const rows = await sql`SELECT value FROM site_content WHERE key = ${key} LIMIT 1`;
  return rows.length ? (rows[0] as { value: string }).value : fallback;
}
