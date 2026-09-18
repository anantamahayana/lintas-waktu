import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { waLink } from "@/lib/site";
import { getSite } from "@/lib/content";

/** Centred, symmetrical, like the end of a printed programme. */
export async function SiteFooter() {
  const t = await getTranslations();
  const site = await getSite();
  const links = [["work", "/work"], ["services", "/services"], ["about", "/about"], ["contact", "/contact"]] as const;
  return (
    <footer className="border-t border-line">
      <div className="wrap gutter py-14 lg:py-20 flex flex-col items-center text-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="t-wordmark text-[28px]">{t("brand.name")}</span>
          <span className="t-mono text-faint">{t("footer.tagline")}</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {links.map(([k, href]) => (
            <Link key={k} href={href} className="link t-mono text-mute hover:text-ink">{t(`nav.${k}`)}</Link>
          ))}
        </nav>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 t-small text-mute">
          <a className="link" href={waLink(undefined, site.whatsapp.number)}>WhatsApp {site.whatsapp.display}</a>
          <a className="link" href={`mailto:${site.email}`}>{site.email}</a>
          <a className="link" href={`https://instagram.com/${site.instagram}`}>@{site.instagram}</a>
        </div>
        <span className="t-small text-faint">{t("footer.rights", { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
