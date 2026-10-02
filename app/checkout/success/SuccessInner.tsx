"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usd } from "@/lib/format";

export default function SuccessInner({ copy }: { copy: Record<string, string> }) {
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
      <h1 style={{ marginTop: 14 }}>{copy.copy_success_heading}</h1>
      <p className="lede" style={{ maxWidth: 480, margin: "0 auto" }}>
        {copy.copy_success_sub}
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
        {copy.copy_success_cta}
      </Link>
    </div>
  );
}
