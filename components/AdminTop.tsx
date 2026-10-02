"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/customers", label: "Customers" },
];

export default function AdminTop() {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="admin-top">
      <Link href="/admin" className="wordmark">
        HAECE ADMIN
      </Link>
      {!isLogin && (
        <nav>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "on" : ""}>
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="keep">
            Logout
          </button>
        </nav>
      )}
    </div>
  );
}
