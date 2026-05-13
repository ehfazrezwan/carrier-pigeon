"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Theme } from "@/lib/types";
import { generateSlug, slugify } from "@/lib/slugs";

const DEFAULT_DIALOGUE =
  "*PHEW!*  That was a long flight...\nI've come a long way to find YOU.\nI'm carrying a letter — sealed, just for you. Shall I deliver it?";

const THEMES: Theme[] = ["day", "dusk", "dawn", "night"];

export default function ComposeForm() {
  const [dialogue, setDialogue] = useState(DEFAULT_DIALOGUE);
  const [body, setBody] = useState("");
  const [theme, setTheme] = useState<Theme>("dusk");
  const [senderName, setSenderName] = useState("The Carrier");
  const [slug, setSlug] = useState("");
  const [sending, setSending] = useState(false);
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Pre-populate slug on mount (client-side only so SSR/hydration matches)
  useEffect(() => {
    setSlug(generateSlug());
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    const res = await fetch("/api/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dialogue, body, theme, sender_name: senderName, slug }),
    });
    setSending(false);
    const data = await res.json();
    if (res.ok && data.letter) {
      const url = `${window.location.origin}/letter/${data.letter.slug}`;
      setSentUrl(url);
    } else {
      setError(data.error || "Could not send.");
    }
  }

  function reroll() {
    setSlug(generateSlug());
    setError("");
  }

  async function copy() {
    if (!sentUrl) return;
    await navigator.clipboard.writeText(sentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function reset() {
    setSentUrl(null);
    setBody("");
    setDialogue(DEFAULT_DIALOGUE);
    setTheme("dusk");
    setSenderName("The Carrier");
    setSlug(generateSlug());
  }

  if (sentUrl) {
    return (
      <div className="admin-page">
        <div className="admin-shell">
          <div className="sent-card">
            <h1 className="sent-title">YOUR LETTER IS READY TO FLY</h1>
            <p className="sent-sub">Share this URL with the reader:</p>
            <div className="url-display">
              <span className="url-text">{sentUrl}</span>
              <button className="btn copy-btn" onClick={copy}>
                {copied ? "COPIED!" : "COPY"}
              </button>
            </div>
            <div className="sent-actions">
              <Link href={sentUrl} className="btn">PREVIEW</Link>
              <button className="btn primary" onClick={reset}>WRITE ANOTHER</button>
              <Link href="/admin" className="btn">BACK TO NEST</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-header">
          <h1 className="admin-title">COMPOSE A LETTER</h1>
          <Link href="/admin" className="btn admin-logout">&lt;&lt; BACK</Link>
        </div>

        <form className="compose-form" onSubmit={send}>
          <label className="field-label">PIGEON&apos;S GREETING</label>
          <p className="field-hint">Each line is a separate speech bubble.</p>
          <textarea
            className="pixel-textarea compose-dialogue"
            value={dialogue}
            onChange={(e) => setDialogue(e.target.value)}
            rows={4}
            required
          />

          <label className="field-label">LETTER BODY</label>
          <p className="field-hint">This is what unfurls on the scroll.</p>
          <textarea
            className="pixel-textarea compose-letter"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="Dear reader, ..."
            required
          />

          <label className="field-label">SKY</label>
          <div className="pill-row">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                className={`pill${theme === t ? " active" : ""}`}
                data-theme-pill={t}
                onClick={() => setTheme(t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <label className="field-label">SEAL NAME</label>
          <p className="field-hint">Appears on the wax seal (max 6 chars works best).</p>
          <input
            className="pixel-input"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            maxLength={20}
          />

          <label className="field-label">SHAREABLE SLUG</label>
          <p className="field-hint">
            The URL ending. Letters, numbers, and hyphens only. Make it your own or reroll for a random one.
          </p>
          <div className="slug-row">
            <span className="slug-prefix">/letter/</span>
            <input
              className="pixel-input slug-input"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              maxLength={60}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              required
            />
            <button type="button" className="btn slug-reroll" onClick={reroll} title="Generate a new random slug">
              REROLL
            </button>
          </div>

          {error && <div className="admin-error">{error}</div>}

          <button type="submit" className="btn primary compose-submit" disabled={sending}>
            {sending ? "SENDING..." : "SEND PIGEON"}
          </button>
        </form>
      </div>
    </div>
  );
}
