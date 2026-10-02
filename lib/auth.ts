// Edge-safe admin auth (Web Crypto, no Node modules).

const COOKIE = "haece_admin";
const STEP_COOKIE = "haece_admin_step";
export const SECURITY_QUESTION = "what is not yours?";
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

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function signSession(): Promise<string> {
  return hmacHex("haece-admin");
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return safeEqual(token, await signSession());
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  return expected.length > 0 && safeEqual(password, expected);
}

// Second factor: a shared security question. The answer lives in
// ADMIN_SECURITY_ANSWER (server env only, never in the repo).
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function checkSecurityAnswer(answer: string): boolean {
  const expected = process.env.ADMIN_SECURITY_ANSWER || "";
  if (!expected) return false;
  const a = normalize(answer);
  const e = normalize(expected);
  return a.length > 0 && safeEqual(a, e);
}

// Short-lived proof that step 1 (password) passed. Format: "<expiry>.<hmac>".
export async function issueStepToken(): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const sig = await hmacHex(`step1:${expiresAt}`);
  return { token: `${expiresAt}.${sig}`, expiresAt };
}

export async function verifyStepToken(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot < 0) return false;
  const expiresAt = Number(raw.slice(0, dot));
  const sig = raw.slice(dot + 1);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return safeEqual(sig, await hmacHex(`step1:${expiresAt}`));
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_STEP_COOKIE = STEP_COOKIE;
