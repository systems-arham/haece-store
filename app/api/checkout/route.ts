import { NextRequest, NextResponse } from "next/server";
import sql, { orderNumber } from "@/lib/db";
import { stripe, baseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type ReqItem = { sku: string; qty: number };

async function releaseExpired() {
  await sql`
    UPDATE inventory_units
    SET status = 'in_stock', reserved_until = NULL, order_id = NULL
    WHERE status = 'reserved' AND reserved_until < now()
  `;
}

async function shippingRates() {
  const rows = await sql`SELECT key, value FROM site_content WHERE key IN ('free_ship_threshold_cents','flat_ship_cents')`;
  const map = Object.fromEntries((rows as any[]).map((r) => [r.key, r.value]));
  return {
    freeOver: Number(map["free_ship_threshold_cents"] || 20000),
    flat: Number(map["flat_ship_cents"] || 1200),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items: ReqItem[] };
    const items = (body.items || []).filter((i) => i.sku && i.qty > 0);
    if (!items.length) {
      return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
    }

    await releaseExpired();

    // Load variants with live stock
    const skus = items.map((i) => i.sku);
    const vrows = await sql`
      SELECT v.id, v.sku, v.size, p.name AS product_name, p.price_cents, p.cost_cents, p.image, p.slug,
             (SELECT COUNT(*) FROM inventory_units u WHERE u.variant_id = v.id AND u.status = 'in_stock') AS stock
      FROM variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.sku = ANY(${skus})
    `;
    const bySku = new Map((vrows as any[]).map((v) => [v.sku, v]));
    for (const i of items) {
      const v = bySku.get(i.sku);
      if (!v) return NextResponse.json({ error: `Unknown item: ${i.sku}` }, { status: 400 });
      if (Number(v.stock) < i.qty) {
        return NextResponse.json(
          { error: `${v.product_name} in size ${v.size} only has ${v.stock} left.` },
          { status: 409 }
        );
      }
    }

    const subtotal = items.reduce((n, i) => n + Number(bySku.get(i.sku).price_cents) * i.qty, 0);
    const rates = await shippingRates();
    const shipping = subtotal >= rates.freeOver ? 0 : rates.flat;
    const total = subtotal + shipping;

    const seq = await sql`SELECT nextval('order_number_seq') AS n`;
    const on = orderNumber(Number((seq[0] as { n: string }).n));

    const orows = await sql`
      INSERT INTO orders (order_number, status, subtotal_cents, shipping_cents, total_cents)
      VALUES (${on}, 'pending_payment', ${subtotal}, ${shipping}, ${total})
      RETURNING id
    `;
    const orderId = (orows[0] as { id: number }).id;

    // Reserve exact serialized units, atomically per variant
    const claimed: { unitId: number; unitCode: string; sku: string }[] = [];
    try {
      for (const i of items) {
        const v = bySku.get(i.sku);
        const units = await sql`
          UPDATE inventory_units
          SET status = 'reserved', reserved_until = now() + interval '30 minutes', order_id = ${orderId}
          WHERE id IN (
            SELECT id FROM inventory_units
            WHERE variant_id = ${v.id} AND status = 'in_stock'
            ORDER BY edition_number
            LIMIT ${i.qty}
          )
          RETURNING id, unit_code
        `;
        if (units.length < i.qty) throw new Error(`Insufficient stock for ${v.product_name} (${v.size})`);
        for (const u of units as any[]) {
          claimed.push({ unitId: u.id, unitCode: u.unit_code, sku: i.sku });
          await sql`
            INSERT INTO inventory_movements (unit_id, from_status, to_status, order_id)
            VALUES (${u.id}, 'in_stock', 'reserved', ${orderId})
          `;
        }
      }
    } catch (e) {
      // Roll back this attempt: release what we claimed, remove the order
      await sql`UPDATE inventory_units SET status='in_stock', reserved_until=NULL, order_id=NULL WHERE order_id=${orderId} AND status='reserved'`;
      await sql`DELETE FROM orders WHERE id=${orderId}`;
      throw e;
    }

    // Order items reference the exact serialized units.
    // unit_cost_cents is snapshotted now, so later cost edits never rewrite history.
    for (const c of claimed) {
      const v = bySku.get(c.sku);
      const unitCost = v.cost_cents != null ? Number(v.cost_cents) : null;
      await sql`
        INSERT INTO order_items (order_id, variant_id, unit_id, product_name, sku, size, price_cents, unit_cost_cents)
        VALUES (${orderId}, ${v.id}, ${c.unitId}, ${v.product_name}, ${v.sku}, ${v.size}, ${v.price_cents}, ${unitCost})
      `;
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((i) => {
        const v = bySku.get(i.sku);
        return {
          price_data: {
            currency: "usd",
            product_data: { name: `${v.product_name} (${v.size})`, metadata: { sku: v.sku } },
            unit_amount: Number(v.price_cents),
          },
          quantity: i.qty,
        };
      }),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shipping, currency: "usd" },
            display_name: shipping === 0 ? "Complimentary shipping" : "Worldwide shipping",
            delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ["US", "GB", "CA", "AU", "AE", "SA", "PK", "IN", "DE", "FR", "NL", "IT", "ES", "SE", "NO", "DK", "FI", "IE", "CH", "AT", "BE", "PT", "GR", "SG", "MY", "QA", "KW", "BH", "OM", "NZ", "JP"] },
      success_url: `${baseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}/bag`,
      metadata: { order_id: String(orderId), order_number: on },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    await sql`UPDATE orders SET stripe_session_id = ${session.id} WHERE id = ${orderId}`;

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout error", e);
    const msg = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
