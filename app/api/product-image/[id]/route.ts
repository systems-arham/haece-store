import sql from "@/lib/db";

export const dynamic = "force-dynamic";

function toBuffer(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === "string") {
    const hex = data.startsWith("\\x") ? data.slice(2) : data;
    return Buffer.from(hex, "hex");
  }
  throw new Error("unrecognized image data");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = (await sql`SELECT mime, data FROM product_images WHERE id = ${Number(id)} LIMIT 1`) as any[];
  if (!rows.length) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(toBuffer(rows[0].data)), {
    headers: {
      "Content-Type": rows[0].mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
