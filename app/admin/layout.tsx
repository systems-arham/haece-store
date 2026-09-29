import AdminTop from "@/components/AdminTop";

export const metadata = { title: "Admin, HAECE" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminTop />
      <div className="admin-body">{children}</div>
    </div>
  );
}
