import AdminTop from "@/components/AdminTop";
import { adminBasePath, adminApiBase } from "@/lib/admin-path";

export const metadata = {
  title: "Admin, HAECE",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminTop basePath={adminBasePath()} apiBase={adminApiBase()} />
      <div className="admin-body">{children}</div>
    </div>
  );
}
