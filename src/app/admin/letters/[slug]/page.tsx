import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import CopyLink from "./CopyLink";

export default async function LetterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAuth();
  const { slug } = await params;

  const db = await getDB();
  const letter = await db.getLetterBySlug(slug);
  if (!letter) notFound();

  const list = await db.getRepliesForLetter(letter.id);

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-header">
          <h1 className="admin-title">{letter.slug}</h1>
          <Link href="/admin" className="btn admin-logout">&lt;&lt; BACK</Link>
        </div>

        <div className="detail-section">
          <div className="field-label">SHAREABLE LINK</div>
          <CopyLink slug={letter.slug} />
        </div>

        <div className="detail-section">
          <div className="field-label">META</div>
          <div className="detail-meta">
            <span className={`letter-theme theme-pill-${letter.theme}`}>{letter.theme}</span>
            <span>Sent: {new Date(letter.created_at).toLocaleString()}</span>
            <span>Seal: {letter.sender_name}</span>
          </div>
        </div>

        <div className="detail-section">
          <div className="field-label">GREETING</div>
          <div className="detail-text">{letter.dialogue}</div>
        </div>

        <div className="detail-section">
          <div className="field-label">LETTER BODY</div>
          <div className="detail-text detail-letter">{letter.body}</div>
        </div>

        <div className="detail-section">
          <div className="field-label">REPLIES ({list.length})</div>
          {list.length === 0 && (
            <div className="admin-empty">No replies yet. The pigeon hasn&apos;t returned.</div>
          )}
          <div className="reply-grid">
            {list.map((r) => (
              <div key={r.id} className="reply-card">
                <div className="reply-head">
                  <span className="reply-name">{r.reader_name}</span>
                  <span className="reply-date">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="reply-body">{r.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
