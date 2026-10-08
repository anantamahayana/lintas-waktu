import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { REVEAL_SCRIPT } from "@/components/ui/Reveal";
import { JsonLd, businessLd } from "@/lib/jsonld";
import { getSite } from "@/lib/content";
import { BrandSprite } from "@/components/brand/Logo";
import "../globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lintas Waktu Visual — Wedding Photographer & Videographer in Bali",
    template: "%s — Lintas Waktu",
  },
  description: "Wedding, pre-wedding, editorial, event and personal photography & film in Bali, by an independent duo.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const business = await businessLd(locale, await getSite());

  return (
    // suppressHydrationWarning: the pre-hydration script adds the `js` class on purpose
    <html lang={locale} className={`${cormorant.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col">
        <BrandSprite />
        <JsonLd data={business} />
        <Script id="reveal" strategy="beforeInteractive">{REVEAL_SCRIPT}</Script>
        <NextIntlClientProvider>
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
