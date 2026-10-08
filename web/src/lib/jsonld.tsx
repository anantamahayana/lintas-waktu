import { getTranslations } from "next-intl/server";
import { SITE_URL, localeUrl } from "@/lib/seo";
import type { SiteInfo, SiteProject } from "@/lib/content";
import { youtubeUrl } from "@/components/site/Social";

/*
 * Structured data (schema.org JSON-LD) so search engines read the site as a photography & film
 * business in Bali, with its prices, questions and projects. Server-rendered <script> tags only:
 * no client JS. Text comes from the same (admin-editable) copy as the page, so they never disagree.
 */

/** A <script type="application/ld+json">; "<" is escaped so admin text can never close the tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** First rupiah amount in a price label: "Mulai IDR 1.500.000 / USD 95" -> 1500000. */
export function idr(label: string): number | undefined {
  const m = label.match(/(?:IDR|Rp)\s*([\d.,]+)/i);
  if (!m) return undefined;
  const n = Number(m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const BUSINESS_ID = `${SITE_URL}/#business`;
const SERVICES = ["wedding", "prewedding", "editorial", "event", "personal"] as const;

type Pkg = { name: string; tagline: string; price_idr: string };

/** The business itself, on every page (in the [locale] layout). */
export async function businessLd(locale: string, site: SiteInfo) {
  const t = await getTranslations({ locale });
  const services = localeUrl(locale, "/services");
  const pkgs = (t.raw("home.packages.items") as Pkg[]).map((p) => ({ ...p, price: idr(p.price_idr) })).filter((p) => p.price);
  const from = SERVICES.map((k) => ({ k, title: t(`services.items.${k}.title`), price: idr(t(`services.items.${k}.from`)) })).filter((s) => s.price);
  const prices = [...pkgs.map((p) => p.price!), ...from.map((s) => s.price!)];
  const sameAs = [site.instagram && `https://instagram.com/${site.instagram}`, site.youtube && youtubeUrl(site.youtube)].filter(Boolean);
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: localeUrl(locale),
      // the site name Google shows above results; people search for the full name
      name: "Lintas Waktu Visual",
      alternateName: ["Lintas Waktu", "lintaswaktuvisual.com"],
      inLanguage: locale,
      publisher: { "@id": BUSINESS_ID },
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": BUSINESS_ID,
      name: "Lintas Waktu",
      alternateName: "Lintas Waktu Visual",
      description: t("meta.description"),
      url: localeUrl(locale),
      logo: `${SITE_URL}/brand/avatar-1080.png`,
      image: `${SITE_URL}/opengraph-image`,
      email: site.email,
      telephone: site.whatsapp.number ? `+${site.whatsapp.number.replace(/\D/g, "")}` : undefined,
      address: { "@type": "PostalAddress", addressRegion: "Bali", addressCountry: "ID" },
      areaServed: [{ "@type": "AdministrativeArea", name: "Bali" }, { "@type": "Country", name: "Indonesia" }],
      knowsLanguage: ["en", "id"],
      ...(prices.length ? { priceRange: `IDR ${Math.min(...prices).toLocaleString("id-ID")} – ${Math.max(...prices).toLocaleString("id-ID")}`, currenciesAccepted: "IDR, USD" } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: t("nav.services"),
        itemListElement: [
          ...pkgs.map((p) => ({
            "@type": "Offer",
            name: `${t("services.items.wedding.title")} · ${p.name}`,
            description: p.tagline,
            price: p.price,
            priceCurrency: "IDR",
            url: services,
            itemOffered: { "@type": "Service", name: `${t("services.items.wedding.title")} · ${p.name}`, areaServed: "Bali" },
          })),
          ...from.filter((s) => s.k !== "wedding").map((s) => ({
            "@type": "Offer",
            name: s.title,
            url: `${services}#${s.k}`,
            priceSpecification: { "@type": "PriceSpecification", minPrice: s.price, priceCurrency: "IDR" },
            itemOffered: { "@type": "Service", name: s.title, areaServed: "Bali" },
          })),
        ],
      },
    },
  ];
}

/** Questions and answers, where all of them are shown (Services). */
export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}

/** One portfolio project. */
export function projectLd(locale: string, p: SiteProject, category: string) {
  const images = [p.coverSrc, ...(p.gallerySrcs ?? [])].filter(Boolean).slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork", // not VideoObject for films: that needs an upload date we don't keep
    name: p.title,
    description: p.pull,
    url: localeUrl(locale, `/work/${p.slug}`),
    inLanguage: locale,
    genre: category,
    ...(p.location ? { locationCreated: { "@type": "Place", name: p.location } } : {}),
    image: images,
    creator: { "@id": BUSINESS_ID },
  };
}
