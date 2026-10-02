"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminTop({ basePath, apiBase }: { basePath: string; apiBase: string }) {
  const links = [
    { href: `${basePath}`, label: "Dashboard", internal: "/admin" },
    { href: `${basePath}/orders`, label: "Orders", internal: "/admin/orders" },
    { href: `${basePath}/reports`, label: "Reports", internal: "/admin/reports" },
    { href: `${basePath}/inventory`, label: "Inventory", internal: "/admin/inventory" },
    { href: `${basePath}/products`, label: "Products", internal: "/admin/products" },
    { href: `${basePath}/content`, label: "Content", internal: "/admin/content" },
    { href: `${basePath}/shipping`, label: "Shipping", internal: "/admin/shipping" },
    { href: `${basePath}/customers`, label: "Customers", internal: "/admin/customers" },
  ];

  const pathname = usePathname();
  const router = useRouter();
  // usePathname returns the rewritten path (e.g. /admin/orders).
  const isLogin = pathname === "/admin/login";

  async function logout() {
    await fetch(`${apiBase}/logout`, { method: "POST" });
    router.push(`${basePath}/login`);
  }

  return (
    <div className="admin-top">
      <Link href={basePath} className="wordmark">
        HAECE ADMIN
      </Link>
      {!isLogin && (
        <nav>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.internal ? "on" : ""}>
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
