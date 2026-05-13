"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PasswordGate() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Wrong secret word.");
      setPw("");
    }
  }

  return (
    <div className="gate-page">
      <form className="gate-card" onSubmit={submit}>
        <h1 className="gate-title">CARRIER PIGEON</h1>
        <p className="gate-subtitle">A private nest for letter writers.</p>
        <label className="gate-label">SECRET WORD</label>
        <input
          type="password"
          className="pixel-input"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
        {error && <div className="gate-error">{error}</div>}
        <button type="submit" className="btn primary gate-submit" disabled={loading}>
          {loading ? "CHECKING..." : "ENTER"}
        </button>
      </form>
    </div>
  );
}
