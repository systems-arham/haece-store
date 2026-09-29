"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push("/admin");
    else setError("Wrong password.");
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <span className="wordmark">HAECE</span>
        <p>Admin access. This area is private.</p>
        <form onSubmit={submit}>
          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn-dark" style={{ width: "100%" }}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
