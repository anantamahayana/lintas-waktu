import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

// Placeholder projects — replaced by CMS data in phase 2
const rows: { title: string; meta: string; span: 1 | 2 }[][] = [
  [
    { title: "Ayu & Marco", meta: "Wedding · Uluwatu", span: 2 },
    { title: "Nadia & Tom", meta: "Pre-wedding · Ubud", span: 1 },
  ],
  [
    { title: "Clara", meta: "Personal branding", span: 1 },
    { title: "Sari & Wayan", meta: "Wedding · Sanur", span: 1 },
    { title: "Bali Spirit Festival", meta: "Event", span: 1 },
  ],
];

// Mobile rhythm: row 0 card 0 full, row 0 card 1 + row 1 card 0 halves, rest full
function mobileSpan(ri: number, ci: number) {
  if (ri === 0 && ci === 1) return "col-span-1";
  if (ri === 1 && ci === 0) return "col-span-1";
  return "col-span-2";
}

export function SelectedWork() {
  const t = useTranslations("home.work");
  const c = useTranslations("cta");
  return (
    <section className="gutter py-16 lg:py-28">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 lg:mb-14">
        <Reveal className="flex flex-col gap-4">
          <p className="eyebrow">{t("eyebrow")}</p>
          <Headline line1={t("line1")} line2={t("line2")} />
        </Reveal>
        <Reveal delay={100}>
          <Link href="/work" className="text-[15px] font-medium hover:text-mute transition-colors">
            {c("viewAll")} &nbsp;→
          </Link>
        </Reveal>
      </div>

      {/* Mobile: 2-col grid with the pattern full → half+half → full.
          Desktop: each row uses its own column template (2:1, 1:1:1). */}
      <div className="flex flex-col gap-6 lg:gap-14">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className="grid grid-cols-2 gap-3 lg:gap-6 lg:[grid-template-columns:var(--cols)]"
            style={{ "--cols": row.map((c) => `${c.span}fr`).join(" ") } as React.CSSProperties}
          >
            {row.map((card, ci) => (
              <Reveal
                key={card.title}
                delay={ci * 90}
                className={`${mobileSpan(ri, ci)} lg:col-span-1`}
              >
                <Link href="/work" className="group block">
                  <Photo seed={`work-${card.title}`} alt={card.title} sizes={card.span === 2 ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, 50vw"} className={mobileSpan(ri, ci) === "col-span-2" ? "h-[400px] lg:h-[620px]" : "h-[240px] lg:h-[520px]"} />
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="font-display text-[20px] lg:text-[32px] leading-[1.2] group-hover:underline underline-offset-4 decoration-1">{card.title}</span>
                    <span className="eyebrow hidden sm:block">{card.meta}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
