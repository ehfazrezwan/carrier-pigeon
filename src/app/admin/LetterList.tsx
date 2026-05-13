"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LetterWithReplyCount } from "@/lib/types";

export default function LetterList() {
  const [letters, setLetters] = useState<LetterWithReplyCount[] | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/letters")
      .then((r) => r.json())
      .then((d) => {
        if (d.letters) setLetters(d.letters);
        else setError(d.error || "Could not load letters");
      })
      .catch(() => setError("Network error"));
  }, []);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-header">
          <h1 className="admin-title">THE NEST</h1>
          <button className="btn admin-logout" onClick={logout}>LOG OUT</button>
        </div>

        <Link href="/admin/compose" className="btn primary admin-compose-link">
          + COMPOSE NEW LETTER
        </Link>

        <h2 className="admin-section">SENT LETTERS</h2>

        {error && <div className="admin-error">{error}</div>}
        {!letters && !error && <div className="admin-empty">Loading...</div>}
        {letters && letters.length === 0 && (
          <div className="admin-empty">No letters yet. Send one!</div>
        )}

        <div className="letter-grid">
          {letters?.map((l) => (
            <Link key={l.id} href={`/admin/letters/${l.slug}`} className="letter-item">
              <div className="letter-item-head">
                <span className="letter-slug">{l.slug}</span>
                <span className="letter-reply-count">
                  {l.reply_count} {l.reply_count === 1 ? "reply" : "replies"}
                </span>
              </div>
              <div className="letter-preview">
                {l.body.slice(0, 140)}{l.body.length > 140 ? "..." : ""}
              </div>
              <div className="letter-meta">
                <span className={`letter-theme theme-pill-${l.theme}`}>{l.theme}</span>
                <span className="letter-date">{new Date(l.created_at).toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
