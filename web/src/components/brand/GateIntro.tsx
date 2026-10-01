import { GATE, GOLD, WORD_H, WORD_W } from "./Logo";

/*
 * "Terbit" — the logo animation for the client-gallery title card
 * (same motion as the Terbit video, docs/BRAND.md → 1b). The gate appears, the path is
 * laid from the bottom to the horizon, the sun rises where it ends, then the name
 * is set letter by letter. CSS only (globals.css → .ti-*), transform and opacity only;
 * the wordmark is the page's <BrandSprite/> path, clipped per letter.
 */

const [ARCH, ROAD] = (() => { const i = GATE.indexOf(" M"); return [GATE.slice(0, i), GATE.slice(i + 1)]; })();
/** Cuts between the letters of LINTAS WAKTU, in wordmark units (from Marcellus glyph bounds). */
const CUTS = [-10, 56.7, 110.1, 211.1, 303.6, 404.9, 504.2, 669.1, 770.7, 862.3, 954.3, 1040];
/** Extra time the title card gives the logo before its own lines appear, in ms. */
export const TERBIT_MS = 1000;

export function GateIntro({ size, label }: { size: number; label: string }) {
  const word = size * 0.2;
  return (
    <span role="img" aria-label={label} className="flex flex-col items-center" style={{ gap: Math.round(size * 0.3) }}>
      <svg aria-hidden viewBox="40 40 120 140" width={+(size * 120 / 140).toFixed(1)} height={size} className="ti-gate overflow-visible">
        <defs>
          <clipPath id="lw-ti-road"><path d={ROAD} /></clipPath>
          <clipPath id="lw-ti-sky"><rect x="40" y="0" width="120" height="116" /></clipPath>
          <mask id="lw-ti-mask" maskUnits="userSpaceOnUse" x="30" y="30" width="140" height="160">
            <rect x="30" y="30" width="140" height="160" fill="#fff" />
            {/* the laid part of the path is cut out of the gate; this block slides up the road */}
            <g clipPath="url(#lw-ti-road)"><rect className="ti-path" x="30" y="181" width="140" height="72" fill="#000" /></g>
          </mask>
        </defs>
        <path d={ARCH} fill="currentColor" mask="url(#lw-ti-mask)" />
        <g clipPath="url(#lw-ti-sky)"><circle className="ti-sun" cx="100" cy="92" r="13" fill={GOLD} /></g>
      </svg>
      <svg aria-hidden viewBox={`0 0 ${WORD_W} ${WORD_H}`} width={+(word * WORD_W / WORD_H).toFixed(1)} height={word} className="overflow-visible">
        <defs>
          {CUTS.slice(0, -1).map((x, i) => (
            <clipPath key={i} id={`lw-ti-l${i}`}><rect x={x} y="-10" width={CUTS[i + 1] - x} height={WORD_H + 60} /></clipPath>
          ))}
        </defs>
        {CUTS.slice(0, -1).map((_, i) => (
          <g key={i} clipPath={`url(#lw-ti-l${i})`}>
            <use href="#lw-word" fill="currentColor" className="ti-letter" style={{ animationDelay: `${1250 + i * 45}ms` }} />
          </g>
        ))}
      </svg>
    </span>
  );
}
