import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Absolute URL for a locale + path ("/work"), honouring the "as-needed" prefix. */
export function localeUrl(locale: string, path = "") {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${SITE_URL}${prefix}${path}`;
}

/** hreflang alternates for a path across all locales (+ x-default). */
export function alternates(path = "") {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localeUrl(l, path);
  languages["x-default"] = localeUrl(routing.defaultLocale, path);
  return { canonical: undefined, languages };
}

/**
 * Page metadata: title from a `meta.*` key (or explicit), description,
 * canonical + hreflang, Open Graph and Twitter cards.
 */
export async function pageMeta(
  locale: string,
  path: string,
  opts: { titleKey?: "work" | "services" | "about" | "contact"; title?: string; description?: string; image?: string },
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const title = opts.title ?? (opts.titleKey ? nav(opts.titleKey) : undefined);
  const description = opts.description ?? (opts.titleKey ? t(opts.titleKey) : t("description"));
  const url = localeUrl(locale, path);
  const image = opts.image ?? `${SITE_URL}/opengraph-image`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: alternates(path).languages },
    openGraph: {
      type: "website",
      url,
      siteName: "Lintas Waktu",
      title: title ? `${title} — Lintas Waktu` : t("title"),
      description,
      locale: locale === "id" ? "id_ID" : "en_US",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: title ? `${title} — Lintas Waktu` : t("title"), description, images: [image] },
  };
}
