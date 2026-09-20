import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { AdminShell } from "@/components/admin/AdminShell";
import { ConfirmHost, Toaster } from "@/components/admin/ui";
import "../globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Admin — Lintas Waktu", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

/** /admin lives outside the locale tree: English only, no site nav/footer. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-white text-ink">
        <AdminShell>{children}</AdminShell>
        <Toaster />
        <ConfirmHost />
      </body>
    </html>
  );
}
