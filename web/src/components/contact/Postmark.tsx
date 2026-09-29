/**
 * A round postmark — "Received", today's date, and LINTAS WAKTU · BALI around the ring —
 * stamped once on the thank-you note (animation: `.stamp-in` in globals.css). Inline SVG,
 * no image to load.
 */
export function Postmark({ label, date, className }: { label: string; date: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={className} fill="none" stroke="currentColor">
      <defs>
        <path id="pm-ring" d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
      </defs>
      <circle cx="60" cy="60" r="57" strokeWidth="1.6" />
      <circle cx="60" cy="60" r="39" strokeWidth=".8" />
      <text fill="currentColor" stroke="none" fontSize="8.4" letterSpacing="1.6" style={{ fontFamily: "var(--font-sans)" }}>
        <textPath href="#pm-ring" textLength="288" lengthAdjust="spacing">LINTAS WAKTU · BALI · INDONESIA ·</textPath>
      </text>
      <text x="60" y="56" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8.5" fontWeight="600" letterSpacing="1.4" style={{ fontFamily: "var(--font-sans)" }}>{label.toUpperCase()}</text>
      <text x="60" y="72" textAnchor="middle" fill="currentColor" stroke="none" fontSize="13.5" fontStyle="italic" fontWeight="600" style={{ fontFamily: "var(--font-serif)" }}>{date}</text>
    </svg>
  );
}
