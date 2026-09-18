import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { site, waLink } from "@/lib/site";

export function SiteFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();
  const explore = [
    ["work", "/work"],
    ["services", "/services"],
    ["about", "/about"],
    ["contact", "/contact"],
  ] as const;
  const services = ["Wedding", "Pre-wedding", "Event", "Personal"];

  return (
    <footer className="gutter border-t border-line pt-10 pb-8 lg:pt-12 lg:pb-10">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-2">
          <span className="t-wordmark">{t("brand.name")}</span>
          <span className="t-small text-mute">{t("footer.tagline")}</span>
        </div>
        <FooterCol title={t("footer.explore")}>
          {explore.map(([k, href]) => (
            <Link key={k} href={href} className="hover:text-mute transition-colors">
              {t(`nav.${k}`)}
            </Link>
          ))}
        </FooterCol>
        <FooterCol title={t("footer.services")}>
          {services.map((s) => (
            <Link key={s} href="/services" className="hover:text-mute transition-colors">
              {s}
            </Link>
          ))}
        </FooterCol>
        <FooterCol title={t("footer.reach")}>
          <a href={`mailto:${site.email}`} className="hover:text-mute transition-colors">{site.email}</a>
          <a href={waLink()} className="hover:text-mute transition-colors">WhatsApp {site.whatsapp.display}</a>
          <a href={`https://instagram.com/${site.instagram}`} className="hover:text-mute transition-colors">Instagram @{site.instagram}</a>
        </FooterCol>
      </div>
      <div className="mt-10 flex items-center justify-between t-small text-faint">
        <span>{t("footer.rights", { year })}</span>
        <span>EN · ID &nbsp;&nbsp; {t("footer.privacy")}</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 t-small">
      <span className="eyebrow mb-1">{title}</span>
      {children}
    </div>
  );
}
