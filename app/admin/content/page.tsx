import { revalidatePath } from "next/cache";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "hero_caption", label: "Hero caption", hint: "Small text on the hero image" },
  { key: "announcement", label: "Announcement bar", hint: "Shown above the header. Empty hides it." },
  { key: "contact_email", label: "Contact email", hint: "Shown on Client Care" },
  { key: "shipping_note", label: "Shipping note", hint: "Short shipping promise" },
];

async function saveContent(formData: FormData) {
  "use server";
  for (const f of FIELDS) {
    const v = String(formData.get(f.key) || "");
    await sql`
      INSERT INTO site_content (key, value, updated_at) VALUES (${f.key}, ${v}, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  }
  const drop02 = formData.get("drop02_visible") === "on" ? "true" : "false";
  await sql`
    INSERT INTO site_content (key, value, updated_at) VALUES ('drop02_visible', ${drop02}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  revalidatePath("/", "layout");
}

export default async function AdminContent() {
  const rows = await sql`SELECT key, value FROM site_content`;
  const map = Object.fromEntries((rows as any[]).map((r) => [r.key, r.value]));
  const drop02 = map["drop02_visible"] === "true";

  return (
    <>
      <h1>Content</h1>
      <p className="admin-sub">Homepage copy and drop visibility. Changes apply to the store immediately.</p>

      <form action={saveContent}>
        <div className="panel">
          <div className="panel-head"><h2>Drop 02 visibility</h2></div>
          <div className="panel-body" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <input type="checkbox" name="drop02_visible" defaultChecked={drop02} id="drop02" style={{ width: 18, height: 18 }} />
            <label htmlFor="drop02" style={{ fontSize: 14 }}>
              Show Drop 02 (Summer 2027) on the homepage
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Copy</h2></div>
          <div className="panel-body">
            {FIELDS.map((f) => (
              <div className="form-field" key={f.key}>
                <label>{f.label}</label>
                <input name={f.key} defaultValue={map[f.key] || ""} placeholder={f.hint} />
              </div>
            ))}
            <button className="btn-dark">Save changes</button>
          </div>
        </div>
      </form>
    </>
  );
}
