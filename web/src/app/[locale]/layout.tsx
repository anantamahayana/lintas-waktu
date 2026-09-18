import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { REVEAL_SCRIPT } from "@/components/ui/Reveal";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lintas Waktu — Wedding & Film Photographer, Bali",
    template: "%s — Lintas Waktu",
  },
  description:
    "Independent wedding, pre-wedding, event and personal photography & film in Bali.",
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
    // suppressHydrationWarning: the beforeInteractive script below adds the `js`
    // class before React hydrates, which is intentional.
    <html lang={locale} className={`${inter.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh p-3 lg:p-6">
        {/* Pre-hydration: js flag + scroll-reveal observer (see components/ui/Reveal) */}
        <Script id="reveal" strategy="beforeInteractive">{REVEAL_SCRIPT}</Script>
        <NextIntlClientProvider>
          <div className="paper min-h-[calc(100dvh-1.5rem)] lg:min-h-[calc(100dvh-3rem)] flex flex-col">
            <SiteNav />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
