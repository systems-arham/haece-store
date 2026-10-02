"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ apiBase, homePath }: { apiBase: string; homePath: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.step === 2) {
        setQuestion(data.question || "");
        setStep(2);
      } else {
        setError(data.error || "Wrong password.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 2, answer }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(homePath);
      } else {
        setError(data.error || "That did not match.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <span className="wordmark">HAECE</span>
        <p>Admin access. This area is private.</p>
        {step === 1 ? (
          <form onSubmit={submitPassword}>
            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                disabled={busy}
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn-dark" style={{ width: "100%" }} disabled={busy}>
              {busy ? "Checking." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitAnswer}>
            <div className="form-field">
              <label>{question || "Security question"}</label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                autoFocus
                required
                disabled={busy}
                autoComplete="off"
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn-dark" style={{ width: "100%" }} disabled={busy}>
              {busy ? "Checking." : "Enter"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
