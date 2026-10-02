import { getContent } from "./db";

// Editable copy blocks. Defaults are the house voice; the admin content
// page can override any of them without a rebuild.
export const COPY_DEFAULTS: Record<string, string> = {
  copy_bag_empty_heading: "Your bag is empty.",
  copy_bag_empty_sub: "Considered pieces, waiting.",
  copy_success_heading: "Thank you. It is yours.",
  copy_success_sub:
    "Your payment is confirmed and your pieces are being prepared. A confirmation email is on its way.",
  copy_success_cta: "Return to the House",
  copy_track_heading: "Find your order.",
  copy_track_lede: "Enter your order number and the email used at checkout.",
};

export async function getCopy(keys: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = await getContent(k, "");
    out[k] = v.trim() === "" ? COPY_DEFAULTS[k] ?? "" : v;
  }
  return out;
}
