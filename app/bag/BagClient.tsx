"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/CartProvider";
import { usd } from "@/lib/format";

export default function BagClient({ copy }: { copy: Record<string, string> }) {
  const { items, subtotal, setQty, remove, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shipCfg, setShipCfg] = useState({ freeOver: 20000, flat: 1200 });
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; percent_off: number } | null>(null);
  const [codeError, setCodeError] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);

  useEffect(() => {
    fetch("/api/config/shipping")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setShipCfg(d))
      .catch(() => {});
    try {
      const saved = localStorage.getItem("haece_offer_code");
      if (saved) {
        fetch("/api/offers/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: saved }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d && d.ok) setApplied({ code: d.code, percent_off: d.percent_off });
            else localStorage.removeItem("haece_offer_code");
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const shipping = subtotal >= shipCfg.freeOver || subtotal === 0 ? 0 : shipCfg.flat;
  const discount = applied ? Math.round((subtotal * applied.percent_off) / 100) : 0;
  const total = subtotal - discount + shipping;

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeBusy(true);
    setCodeError("");
    try {
      const res = await fetch("/api/offers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "This code is not valid.");
      setApplied({ code: data.code, percent_off: data.percent_off });
      try { localStorage.setItem("haece_offer_code", data.code); } catch {}
      setCodeInput("");
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : "This code is not valid.");
    }
    setCodeBusy(false);
  }

  function removeCode() {
    setApplied(null);
    setCodeError("");
    try { localStorage.removeItem("haece_offer_code"); } catch {}
  }

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ sku: i.sku, qty: i.qty })),
          offer_code: applied ? applied.code : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      clear();
      try { localStorage.removeItem("haece_offer_code"); } catch {}
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="page-narrow">
        <h1>{copy.copy_bag_empty_heading}</h1>
        <div className="empty-bag">
          <p>{copy.copy_bag_empty_sub}</p>
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
        {applied && (
          <div className="total-row">
            <span>Private code {applied.code} ({applied.percent_off}%)</span>
            <span>-{usd(discount)} <button className="link-btn" onClick={removeCode} style={{ marginLeft: 8 }}>Remove</button></span>
          </div>
        )}
        <div className="total-row">
          <span>Shipping</span>
          <span>{shipping === 0 ? "Complimentary" : usd(shipping)}</span>
        </div>
        <div className="total-row grand">
          <span>Total</span>
          <span>{usd(total)}</span>
        </div>
      </div>

      {!applied && (
        <form onSubmit={applyCode} style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Private code"
            aria-label="Private code"
            style={{ flex: 1, padding: "12px 14px", border: "1px solid var(--hairline)", fontSize: 14, textTransform: "uppercase" }}
          />
          <button className="btn-ghost" disabled={codeBusy || !codeInput.trim()}>
            {codeBusy ? "Checking" : "Apply"}
          </button>
        </form>
      )}
      {codeError ? <p className="form-error">{codeError}</p> : null}

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
