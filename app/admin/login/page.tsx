import { adminBasePath, adminApiBase } from "@/lib/admin-path";
import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return <LoginForm apiBase={adminApiBase()} homePath={adminBasePath()} />;
}
