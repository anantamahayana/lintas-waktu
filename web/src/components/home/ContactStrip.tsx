import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { site, waLink } from "@/lib/site";

/** Closing: the invitation, set as large as the hero headline. */
export function ContactStrip() {
  const t = useTranslations("home.cta");
  const c = useTranslations("cta");
  return (
    <section className="gutter pt-16 lg:pt-24 pb-8 border-t border-line flex flex-col gap-10 lg:gap-16">
      <Reveal>
        <h2 className="t-display max-w-[12ch]">
          {t("line1")} <span className="font-light">{t("line2")}</span>
        </h2>
      </Reveal>
      <Reveal delay={100} className="grid lg:grid-cols-12 gap-8">
        <p className="lg:col-span-5 t-body text-mute max-w-[46ch]">{t("body")}</p>
        <div className="lg:col-span-6 lg:col-start-7 flex flex-col gap-4 t-mono">
          <a href={waLink()} className="action">{c("whatsapp")} · {site.whatsapp.display}</a>
          <Link href="/contact" className="action">{c("inquiry")}</Link>
          <a href={`mailto:${site.email}`} className="action">{site.email}</a>
        </div>
      </Reveal>
    </section>
  );
}
