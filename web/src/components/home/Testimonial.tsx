import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";

export function Testimonial() {
  const t = useTranslations("home.testimonial");
  return (
    <section className="gutter py-18 lg:py-32 flex flex-col items-center text-center gap-6 lg:gap-12">
      <Reveal><p className="eyebrow">{t("eyebrow")}</p></Reveal>
      <Reveal delay={80}>
        <blockquote className="t-h3 lg:t-h2 font-display italic max-w-[920px] text-balance">{t("quote")}</blockquote>
      </Reveal>
      <Reveal delay={160} className="flex flex-col gap-1">
        <span className="t-body">{t("name")}</span>
        <span className="t-small text-mute">{t("meta")}</span>
      </Reveal>
    </section>
  );
}
