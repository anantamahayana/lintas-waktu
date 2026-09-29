import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SocialIcon, socialLinks } from "./Social";
import { BaliTime } from "./BaliTime";
import { BackToTop } from "./BackToTop";
import { Mark } from "@/components/ui/Mark";
import { getSite } from "@/lib/content";

/** Centred, symmetrical, like the end of a printed programme. */
export async function SiteFooter() {
  const t = await getTranslations();
  const site = await getSite();
  const links = [["work", "/work"], ["services", "/services"], ["about", "/about"], ["contact", "/contact"]] as const;
  return (
    <footer className="border-t border-line">
      <div className="wrap gutter py-14 lg:py-20 flex flex-col items-center text-center gap-8">
        <Mark />
        <div className="flex flex-col items-center gap-2">
          <span className="t-wordmark text-[28px]">{t("brand.name")}</span>
          <span className="t-mono text-faint">{t("footer.tagline")}</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {links.map(([k, href]) => (
            <Link key={k} href={href} className="link t-mono text-mute hover:text-ink">{t(`nav.${k}`)}</Link>
          ))}
        </nav>
        <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3 t-small text-mute">
          {socialLinks(site).map((s) => (
            <li key={s.k}>
              <a href={s.href} {...(s.external ? { target: "_blank", rel: "noreferrer" } : {})} aria-label={`${s.k} ${s.label}`} className="group inline-flex items-center gap-2 hover:text-ink transition-colors">
                <SocialIcon k={s.k} className="h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5" />
                <span className="link">{s.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <BaliTime />
        <div className="flex flex-col items-center gap-3 pt-2">
          <BackToTop label={t("footer.top")} />
          <span className="t-small text-faint">{t("footer.rights", { year: new Date().getFullYear() })} · <em className="font-serif text-[14px]">{t("footer.made")}</em></span>
        </div>
      </div>
    </footer>
  );
}
