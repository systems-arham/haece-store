"use client";

import { useState } from "react";
import { usd } from "@/lib/format";

type Lookup = {
  order_number: string;
  status: string;
  total_cents: number;
  created_at: string;
  tracking_number: string | null;
  items: { product_name: string; size: string; sku: string }[];
};

const statusLabel: Record<string, string> = {
  paid: "Confirmed, being prepared",
  pending_payment: "Awaiting payment",
  shipped: "Shipped",
  in_transit: "In transit",
  delivered: "Delivered",
  expired: "Expired",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default function TrackOrderClient({ copy }: { copy: Record<string, string> }) {
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Lookup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_number: orderNo.trim(), email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Order not found.");
    else setResult(data);
    setBusy(false);
  }

  return (
    <div className="page-narrow" style={{ maxWidth: 640 }}>
      <span className="micro">Client Care</span>
      <h1 style={{ marginTop: 12 }}>{copy.copy_track_heading}</h1>
      <p className="lede">{copy.copy_track_lede}</p>
      <form onSubmit={submit}>
        <div className="form-field">
          <label>Order number</label>
          <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="HAE-0001" required />
        </div>
        <div className="form-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn-dark" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Looking up" : "Find order"}
        </button>
      </form>

      {result && (
        <div className="confirm-box">
          <span className="order-no">Order<strong>{result.order_number}</strong></span>
          <p style={{ marginTop: 12 }}>
            <span className={`badge ${result.status === "paid" ? "paid" : "pending"}`}>
              {statusLabel[result.status] || result.status}
            </span>
          </p>
          {result.tracking_number && (
            <p style={{ marginTop: 12, fontSize: 14 }}>
              Tracking number <strong style={{ fontFamily: "monospace" }}>{result.tracking_number}</strong>
            </p>
          )}
          <div style={{ marginTop: 18 }}>
            {result.items.map((i, idx) => (
              <p key={idx} style={{ fontSize: 14, marginBottom: 6 }}>
                {i.product_name} <span style={{ color: "var(--muted)" }}>, size {i.size}</span>
              </p>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 14, color: "var(--muted)" }}>
            Total {usd(result.total_cents)} , placed {new Date(result.created_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
