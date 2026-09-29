"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/CartProvider";
import { usd } from "@/lib/format";

export default function BagPage() {
  const { items, subtotal, setQty, remove, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shipCfg, setShipCfg] = useState({ freeOver: 20000, flat: 1200 });

  useEffect(() => {
    fetch("/api/config/shipping")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setShipCfg(d))
      .catch(() => {});
  }, []);

  const shipping = subtotal >= shipCfg.freeOver || subtotal === 0 ? 0 : shipCfg.flat;
  const total = subtotal + shipping;

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ sku: i.sku, qty: i.qty })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      clear();
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="page-narrow">
        <h1>Your bag is empty.</h1>
        <div className="empty-bag">
          <p>Considered pieces, waiting.</p>
          <Link href="/drop-01" className="btn-dark">
            View Drop 01
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <h1>Your bag</h1>
      <p className="lede">{items.length} {items.length === 1 ? "piece" : "pieces"}, chosen with intent.</p>

      {items.map((i) => (
        <div className="bag-line" key={i.sku}>
          <div className="thumb">
            <Image src={i.image} alt={i.name} width={200} height={250} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <p className="lname">{i.name}</p>
            <p className="lmeta">Size {i.size} / Black</p>
            <div className="qty">
              <button onClick={() => setQty(i.sku, i.qty - 1)} aria-label="Decrease">-</button>
              <span>{i.qty}</span>
              <button onClick={() => setQty(i.sku, i.qty + 1)} aria-label="Increase">+</button>
            </div>
          </div>
          <div className="line-right">
            <p className="lprice">{usd(i.priceCents * i.qty)}</p>
            <button className="link-btn" onClick={() => remove(i.sku)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="totals">
        <div className="total-row">
          <span>Subtotal</span>
          <span>{usd(subtotal)}</span>
        </div>
        <div className="total-row">
          <span>Shipping</span>
          <span>{shipping === 0 ? "Complimentary" : usd(shipping)}</span>
        </div>
        <div className="total-row grand">
          <span>Total</span>
          <span>{usd(total)}</span>
        </div>
      </div>

      <p className="checkout-note">
        Advance payment via Stripe. Your pieces are reserved for 30 minutes while you complete checkout.
        Duties included worldwide.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn-dark" onClick={checkout} disabled={busy} style={{ width: "100%" }}>
        {busy ? "Preparing checkout" : "Proceed to secure checkout"}
      </button>
    </div>
  );
}
