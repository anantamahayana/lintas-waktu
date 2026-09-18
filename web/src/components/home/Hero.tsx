import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

// Arch: outer photos sit lower, middle one highest (see Figma hero strip)
const strip = [
  { w: "w-[236px]", h: "h-[320px]", pad: "pt-[130px]" },
  { w: "w-[256px]", h: "h-[380px]", pad: "pt-[70px]" },
  { w: "w-[300px]", h: "h-[440px]", pad: "pt-0" },
  { w: "w-[256px]", h: "h-[380px]", pad: "pt-[70px]" },
  { w: "w-[236px]", h: "h-[320px]", pad: "pt-[130px]" },
];

export function Hero() {
  const t = useTranslations("home.hero");
  const c = useTranslations("cta");
  return (
    <section className="gutter pt-10 pb-8 lg:pt-24 lg:pb-16">
      <div className="flex flex-col items-start lg:items-center gap-5 lg:gap-7 max-w-[720px] mx-auto lg:text-center">
        <Reveal><p className="eyebrow">{t("eyebrow")}</p></Reveal>
        <Reveal delay={80}>
          <Headline as="h1" size="hero" line1={t("line1")} line2={t("line2")} align="left" className="lg:text-center" />
        </Reveal>
        <Reveal delay={160}>
          <p className="t-lead text-mute max-w-[620px]">{t("lead")}</p>
        </Reveal>
        <Reveal delay={240}>
          <Link href="/contact" className="btn-ink">{c("start")}</Link>
        </Reveal>
      </div>

      {/* Photo strip — 3 on mobile, 5 on desktop, clipped at the bottom */}
      <Reveal delay={320} className="mt-10 lg:mt-16 overflow-hidden h-[260px] lg:h-[380px]">
        <div className="flex justify-center gap-2.5 lg:gap-5 items-start">
          {strip.map((s, i) => (
            <div key={i} className={`${s.pad} ${i === 0 || i === 4 ? "hidden lg:block" : ""}`}>
              <Photo seed={`hero-${i}`} priority={i === 2} sizes="(min-width: 1024px) 300px, 33vw" className={`${s.w} ${s.h} max-w-[30vw] lg:max-w-none`} />
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
