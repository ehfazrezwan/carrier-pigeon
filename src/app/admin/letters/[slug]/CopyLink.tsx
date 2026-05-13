"use client";

import { useState, useEffect } from "react";

export default function CopyLink({ slug }: { slug: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/letter/${slug}`);
  }, [slug]);

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="url-display">
      <span className="url-text">{url || `/letter/${slug}`}</span>
      <button className="btn copy-btn" onClick={copy}>
        {copied ? "COPIED!" : "COPY"}
      </button>
    </div>
  );
}
