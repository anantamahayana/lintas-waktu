import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { site, waLink } from "@/lib/site";

/** One quiet line. The timeline below it is the real footer. */
export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="gutter pt-16 pb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 t-mono text-mute">
      <div className="flex flex-col gap-2">
        <span className="text-ink">{t("brand.name")}</span>
        <span>{t("footer.tagline")}</span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <a className="link" href={waLink()}>WhatsApp</a>
        <a className="link" href={`mailto:${site.email}`}>Email</a>
        <a className="link" href={`https://instagram.com/${site.instagram}`}>Instagram</a>
        <Link className="link" href="/contact">{t("nav.contact")}</Link>
      </div>
      <span>{t("footer.rights", { year: new Date().getFullYear() })}</span>
    </footer>
  );
}
