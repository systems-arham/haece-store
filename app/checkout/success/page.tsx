"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usd } from "@/lib/format";
import { Suspense } from "react";

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState<{ order_number: string; email: string; total_cents: number; status: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setOrder)
      .catch(() => {});
  }, [sessionId]);

  return (
    <div className="page-narrow" style={{ textAlign: "center" }}>
      <span className="micro">Order confirmed</span>
      <h1 style={{ marginTop: 14 }}>Thank you. It is yours.</h1>
      <p className="lede" style={{ maxWidth: 480, margin: "0 auto" }}>
        Your payment is confirmed and your pieces are being prepared. A confirmation email is on its way.
      </p>
      {order && (
        <div className="confirm-box">
          <span className="order-no">
            Order number<strong>{order.order_number}</strong>
          </span>
          <p style={{ marginTop: 14, fontSize: 14, color: "var(--muted)" }}>
            {usd(order.total_cents)} {order.email ? `, receipt sent to ${order.email}` : ""}
          </p>
        </div>
      )}
      <Link href="/drop-01" className="btn-ghost">
        Continue browsing
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
