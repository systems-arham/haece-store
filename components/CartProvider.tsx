"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  sku: string;
  name: string;
  size: string;
  priceCents: number;
  image: string;
  slug: string;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "haece_bag_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((n, i) => n + i.qty * i.priceCents, 0);
    return {
      items,
      count,
      subtotal,
      add: (item, qty = 1) =>
        setItems((prev) => {
          const found = prev.find((p) => p.sku === item.sku);
          if (found) {
            return prev.map((p) => (p.sku === item.sku ? { ...p, qty: p.qty + qty } : p));
          }
          return [...prev, { ...item, qty }];
        }),
      remove: (sku) => setItems((prev) => prev.filter((p) => p.sku !== sku)),
      setQty: (sku, qty) =>
        setItems((prev) =>
          qty <= 0 ? prev.filter((p) => p.sku !== sku) : prev.map((p) => (p.sku === sku ? { ...p, qty } : p))
        ),
      clear: () => setItems([]),
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
