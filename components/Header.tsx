"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";

export default function Header({ announcement }: { announcement: string }) {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const links = [
    { href: "/drop-01", label: "Drop 01" },
    { href: "/craft", label: "Craft" },
    { href: "/house", label: "The House" },
  ];
  const menuLinks = [
    ...links,
    { href: "/track-order", label: "Find Your Order" },
    { href: "/client-care", label: "Client Care" },
  ];
  return (
    <header className="site-header">
      {announcement ? <div className="announce">{announcement}</div> : null}
      <div className="header-inner">
        <button className="menu-btn" aria-label="Menu" onClick={() => setOpen(!open)}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav className="nav-left">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="wordmark">
          HAECE
        </Link>
        <nav className="nav-right">
          <Link href="/track-order" className="hide-m">
            Find Order
          </Link>
          <Link href="/bag">Bag ({count})</Link>
        </nav>
      </div>
      <nav className={`mobile-menu${open ? " open" : ""}`}>
        {menuLinks.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
