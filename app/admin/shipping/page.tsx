import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

async function saveShipping(formData: FormData) {
  "use server";
  const freeOver = Math.max(0, Math.round(Number(formData.get("freeOver")) * 100) || 0);
  const flat = Math.max(0, Math.round(Number(formData.get("flat")) * 100) || 0);
  await sql`
    INSERT INTO site_content (key, value, updated_at) VALUES ('free_ship_threshold_cents', ${String(freeOver)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  await sql`
    INSERT INTO site_content (key, value, updated_at) VALUES ('flat_ship_cents', ${String(flat)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  revalidatePath("/admin/shipping");
}

export default async function AdminShipping() {
  const rows = await sql`SELECT key, value FROM site_content WHERE key IN ('free_ship_threshold_cents','flat_ship_cents')`;
  const map = Object.fromEntries((rows as any[]).map((r) => [r.key, r.value]));
  const freeOver = Number(map["free_ship_threshold_cents"] || 20000);
  const flat = Number(map["flat_ship_cents"] || 1200);

  return (
    <>
      <h1>Shipping</h1>
      <p className="admin-sub">Rates apply at checkout immediately. Duties are included worldwide.</p>
      <div className="panel">
        <div className="panel-head"><h2>Rates</h2></div>
        <div className="panel-body">
          <form action={saveShipping}>
            <div className="admin-form-row">
              <div className="form-field">
                <label>Free shipping over (USD)</label>
                <input name="freeOver" type="number" min="0" step="1" defaultValue={freeOver / 100} />
              </div>
              <div className="form-field">
                <label>Flat rate below threshold (USD)</label>
                <input name="flat" type="number" min="0" step="1" defaultValue={flat / 100} />
              </div>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
              Current: complimentary over {usd(freeOver)}, otherwise {usd(flat)} flat.
            </p>
            <button className="btn-dark">Save rates</button>
          </form>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Fulfilment notes</h2></div>
        <div className="panel-body" style={{ fontSize: 14, color: "var(--muted)" }}>
          <p style={{ marginBottom: 10 }}>Ship via DHL or FedEx through your local consolidator for 30 to 50 percent off retail rates. Aramex for GCC orders.</p>
          <p>Commercial invoices: generate 3 copies per order with HS codes (hoodies 6110.20, vests 6110.10, tees 6109.10, trousers 6103.43).</p>
        </div>
      </div>
    </>
  );
}
