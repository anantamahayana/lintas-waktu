import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { waLink } from "@/lib/site";

export function ClosingCta() {
  const t = useTranslations("home.cta");
  const c = useTranslations("cta");
  return (
    <section className="gutter pt-20 pb-16 lg:pt-36 lg:pb-30 flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-16">
      <Reveal className="flex flex-col gap-6 lg:gap-8 lg:flex-1">
        <Headline size="hero" line1={t("line1")} line2={t("line2")} />
        <p className="t-lead text-mute max-w-[520px]">{t("body")}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href={waLink()} className="btn-ink">{c("whatsapp")}</a>
          <Link href="/contact" className="btn-ghost">{c("inquiry")}</Link>
        </div>
      </Reveal>
      <Reveal delay={150} className="lg:w-[520px]">
        <Photo seed="cta" sizes="(min-width: 1024px) 520px, 100vw" className="h-[260px] lg:h-[400px] lg:-rotate-2" />
      </Reveal>
    </section>
  );
}
