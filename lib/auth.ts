// Edge-safe admin auth (Web Crypto, no Node modules).

const COOKIE = "haece_admin";
const enc = new TextEncoder();

function secret(): string {
  if (!process.env.ADMIN_SECRET) throw new Error("ADMIN_SECRET is not set");
  return process.env.ADMIN_SECRET;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("haece-admin"));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return safeEqual(token, await signSession());
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  return expected.length > 0 && safeEqual(password, expected);
}

export const ADMIN_COOKIE = COOKIE;
