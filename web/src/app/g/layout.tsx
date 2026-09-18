import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "../globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Your gallery — Lintas Waktu",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#fbfaf7", viewportFit: "cover" };

/** Client gallery: its own shell — no site nav, no locale prefix, never indexed. */
export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-white text-ink">{children}</body>
    </html>
  );
}
