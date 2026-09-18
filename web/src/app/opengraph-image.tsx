import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lintas Waktu — Wedding & Film Photographer, Bali";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card: wordmark on off-white. Replaced by a photograph later. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fbfaf7", color: "#1f1e1c", fontFamily: "Georgia, serif" }}>
        <div style={{ fontSize: 92, fontStyle: "italic", letterSpacing: 1 }}>Lintas Waktu</div>
        <div style={{ marginTop: 24, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", color: "#77756f", fontFamily: "sans-serif" }}>Photography & Film · Bali</div>
      </div>
    ),
    size,
  );
}
