import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const clean = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  await sql`INSERT INTO newsletter_subscribers (email) VALUES (${clean}) ON CONFLICT (email) DO NOTHING`;
  return NextResponse.json({ ok: true });
}
