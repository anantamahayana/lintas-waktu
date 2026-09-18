import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { REVEAL_SCRIPT } from "@/components/ui/Reveal";
import { TimelineProvider } from "@/components/timeline/TimelineContext";
import { Timeline } from "@/components/timeline/Timeline";
import "../globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-manrope",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lintas Waktu — Wedding & Film Photographer, Bali",
    template: "%s — Lintas Waktu",
  },
  description: "Independent wedding, pre-wedding, event and personal photography & film in Bali.",
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

  return (
    // suppressHydrationWarning: the pre-hydration script adds the `js` class on purpose
    <html lang={locale} className={`${manrope.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh pb-[var(--timeline-h)]">
        <Script id="reveal" strategy="beforeInteractive">{REVEAL_SCRIPT}</Script>
        <NextIntlClientProvider>
          <TimelineProvider>
            <SiteNav />
            <main>{children}</main>
            <SiteFooter />
            <Timeline />
          </TimelineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
