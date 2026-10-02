import { revalidatePath } from "next/cache";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

async function createOffer(formData: FormData) {
  "use server";
  const code = String(formData.get("code") || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const percent = Number(formData.get("percent_off"));
  const maxRaw = String(formData.get("max_uses") || "").trim();
  if (!code || !(percent >= 1 && percent <= 90)) return;
  const maxUses = maxRaw === "" ? null : Math.max(1, Math.floor(Number(maxRaw)));
  await sql`
    INSERT INTO offer_codes (code, percent_off, max_uses)
    VALUES (${code}, ${percent}, ${maxUses})
    ON CONFLICT (code) DO NOTHING
  `;
  revalidatePath("/admin/offers");
}

async function toggleOffer(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  if (!id) return;
  await sql`UPDATE offer_codes SET active = ${!active} WHERE id = ${id}`;
  revalidatePath("/admin/offers");
}

async function deleteOffer(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql`DELETE FROM offer_codes WHERE id = ${id}`;
  revalidatePath("/admin/offers");
}

export default async function AdminOffers() {
  const rows = (await sql`
    SELECT id, code, percent_off, active, max_uses, used_count, created_at
    FROM offer_codes ORDER BY id DESC
  `) as any[];

  return (
    <>
      <h1>Private offer codes</h1>
      <p className="admin-sub">
        Codes for selected clients. Percent off, applied at checkout through Stripe.
        Create one only when the house wants it to exist.
      </p>

      <div className="panel">
        <div className="panel-head"><h2>New code</h2></div>
        <div className="panel-body">
          <form action={createOffer} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Code</label>
              <input name="code" required placeholder="ATELIER10" style={{ textTransform: "uppercase" }} />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Percent off (1-90)</label>
              <input name="percent_off" type="number" min={1} max={90} required placeholder="10" style={{ width: 110 }} />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Max uses (empty = unlimited)</label>
              <input name="max_uses" type="number" min={1} placeholder="Unlimited" style={{ width: 130 }} />
            </div>
            <button className="btn-dark">Create code</button>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Codes ({rows.length})</h2></div>
        <table className="data">
          <thead>
            <tr><th>Code</th><th>Off</th><th>Used</th><th>Status</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><strong style={{ fontFamily: "monospace" }}>{c.code}</strong></td>
                <td>{c.percent_off}%</td>
                <td>{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</td>
                <td>
                  <span className={`badge ${c.active ? "in_stock" : "expired"}`}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <form action={toggleOffer} style={{ display: "inline", marginRight: 8 }}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <button className="mini-btn">{c.active ? "Deactivate" : "Activate"}</button>
                  </form>
                  <form action={deleteOffer} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="mini-btn danger">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--muted)" }}>No codes. The house has offered nothing.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
