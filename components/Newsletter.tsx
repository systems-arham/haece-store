"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <section className="newsletter">
      <h3>First access to new drops.</h3>
      <p>One email per drop. Nothing else.</p>
      {done ? (
        <p className="nl-ok">You are on the list. Welcome to the house.</p>
      ) : (
        <form className="nl-form" onSubmit={submit}>
          <input
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
          />
          <button type="submit">Join</button>
        </form>
      )}
      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
    </section>
  );
}
