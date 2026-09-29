import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";

// the big mark above is the opening quote, so the text's own outer quotes are dropped
export function KindWords() {
  const t = useTranslations("home");
  return (
    <section className="border-t border-line">
      <div className="wrap gutter py-20 lg:py-28 flex flex-col items-center text-center gap-8">
        <Reveal><span className="t-mono text-mute">{t("kind.eyebrow")}</span></Reveal>
        <Reveal delay={80} className="flex flex-col items-center">
          <span aria-hidden className="font-serif italic text-[88px] leading-[.6] h-[.45em] text-faint select-none">“</span>
          <blockquote className="t-statement max-w-[40ch] text-balance">{t("testimonial.quote").trim().replace(/^[“"«]\s*|\s*[”"»]$/g, "")}</blockquote>
        </Reveal>
        <Reveal delay={160} className="flex flex-col gap-1">
          <span className="t-caption">{t("testimonial.name")}</span>
          <span className="t-mono text-mute">{t("testimonial.meta")}</span>
        </Reveal>
      </div>
    </section>
  );
}
