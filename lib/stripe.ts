import Stripe from "stripe";

let client: Stripe | null = null;

// Lazy: only throws when Stripe is actually used, so builds never crash.
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Backwards-compatible eager export for code that already imports { stripe }.
// Accessing it throws only when touched.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    const s = getStripe() as unknown as Record<string | symbol, unknown>;
    const v = s[prop];
    return typeof v === "function" ? (v as Function).bind(s) : v;
  },
});

export function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.URL || // Netlify provides this automatically
    "http://localhost:3000"
  );
}
