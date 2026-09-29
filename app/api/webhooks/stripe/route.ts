import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function releaseOrder(orderId: number, toStatus: string) {
  const units = await sql`SELECT id FROM inventory_units WHERE order_id = ${orderId} AND status = 'reserved'`;
  for (const u of units as any[]) {
    await sql`INSERT INTO inventory_movements (unit_id, from_status, to_status, order_id) VALUES (${u.id}, 'reserved', 'in_stock', ${orderId})`;
  }
  await sql`UPDATE inventory_units SET status='in_stock', reserved_until=NULL, order_id=NULL WHERE order_id=${orderId} AND status='reserved'`;
  await sql`UPDATE orders SET status=${toStatus} WHERE id=${orderId}`;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  let event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("webhook signature failed", e);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const orderId = Number(session.metadata?.order_id);
      if (!orderId) return NextResponse.json({ received: true });

      const orows = await sql`SELECT id, status FROM orders WHERE id = ${orderId} LIMIT 1`;
      if (!orows.length) return NextResponse.json({ received: true });
      const order = orows[0] as { id: number; status: string };
      if (order.status !== "pending_payment") return NextResponse.json({ received: true }); // idempotent

      const email: string | null = session.customer_details?.email || session.customer_email || null;
      const name: string | null = session.customer_details?.name || null;
      const address = session.shipping_details?.address
        ? {
            name: session.shipping_details.name,
            ...session.shipping_details.address,
          }
        : session.customer_details?.address || null;

      let customerId: number | null = null;
      if (email) {
        const crows = await sql`
          INSERT INTO customers (email, name) VALUES (${email}, ${name})
          ON CONFLICT (email) DO UPDATE SET name = COALESCE(customers.name, EXCLUDED.name)
          RETURNING id
        `;
        customerId = (crows[0] as { id: number }).id;
      }

      await sql`
        UPDATE orders
        SET status='paid', email=${email}, name=${name}, customer_id=${customerId},
            shipping_address=${address ? JSON.stringify(address) : null}::jsonb,
            paid_at=now()
        WHERE id=${orderId}
      `;

      const units = await sql`SELECT id FROM inventory_units WHERE order_id=${orderId} AND status='reserved'`;
      for (const u of units as any[]) {
        await sql`INSERT INTO inventory_movements (unit_id, from_status, to_status, order_id) VALUES (${u.id}, 'reserved', 'sold', ${orderId})`;
      }
      await sql`UPDATE inventory_units SET status='sold', reserved_until=NULL WHERE order_id=${orderId} AND status='reserved'`;
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as any;
      const orderId = Number(session.metadata?.order_id);
      if (orderId) {
        const orows = await sql`SELECT status FROM orders WHERE id=${orderId} LIMIT 1`;
        if (orows.length && (orows[0] as { status: string }).status === "pending_payment") {
          await releaseOrder(orderId, "expired");
        }
      }
    }
  } catch (e) {
    console.error("webhook handler failed", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
