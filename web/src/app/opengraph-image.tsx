import { ImageResponse } from "next/og";
import { GATE, GOLD, WORD, WORD_H, WORD_W } from "@/components/brand/Logo";

export const runtime = "edge";
export const alt = "Lintas Waktu — Wedding & Film Photographer, Bali";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card: the Gerbang Waktu logo, stacked, on warm paper. */
export default function OgImage() {
  const word = 520;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f3efe7", color: "#1f1e1c" }}>
        <svg viewBox="40 40 120 140" width={180} height={210}>
          <path fill="#1f1e1c" fillRule="evenodd" d={GATE} />
          <circle cx="100" cy="92" r="13" fill={GOLD} />
        </svg>
        <svg viewBox={`0 0 ${WORD_W} ${WORD_H}`} width={word} height={Math.round((word * WORD_H) / WORD_W)} style={{ marginTop: 56 }}>
          <path fill="#1f1e1c" d={WORD} />
        </svg>
        <div style={{ marginTop: 30, fontSize: 20, letterSpacing: 8, textTransform: "uppercase", color: "#77756f", fontFamily: "sans-serif" }}>Photography & Film · Bali</div>
      </div>
    ),
    size,
  );
}
