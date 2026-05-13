import Link from "next/link";

export default function NotFound() {
  return (
    <div className="admin-page">
      <div className="gate-card">
        <h1 className="gate-title">LOST IN THE SKY</h1>
        <p className="gate-subtitle">This pigeon never made it home. The letter you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="btn primary gate-submit">GO HOME</Link>
      </div>
    </div>
  );
}
