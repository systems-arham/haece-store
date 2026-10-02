import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit(`newsletter:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many signups. Try again later." }, { status: 429 });
  }
  const { email } = await req.json();
  const clean = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  await sql`INSERT INTO newsletter_subscribers (email) VALUES (${clean}) ON CONFLICT (email) DO NOTHING`;
  return NextResponse.json({ ok: true });
}
