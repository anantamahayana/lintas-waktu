import { useTranslations } from "next-intl";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

// Positions along the curve (desktop), in % of the section box
const spots = [
  { left: 12, top: 74 },
  { left: 34, top: 47 },
  { left: 57, top: 37 },
  { left: 81, top: 31 },
];

export function Process() {
  const t = useTranslations("home.process");
  const steps = t.raw("steps") as { title: string; desc: string }[];

  return (
    <section className="bg-paper-deep relative overflow-hidden">
      <div className="gutter pt-16 pb-14 lg:pt-22 lg:pb-0 lg:h-[720px]">
        <Reveal className="flex flex-col gap-4 relative z-10">
          <p className="eyebrow">{t("eyebrow")}</p>
          <Headline line1={t("line1")} line2={t("line2")} />
        </Reveal>

        {/* Mobile: vertical timeline */}
        <ol className="lg:hidden mt-10 flex flex-col">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 80} className="flex gap-4 pb-7 last:pb-0">
              <div className="flex flex-col items-center pt-2">
                <span className="h-2 w-2 rounded-full bg-ink" />
                {i < steps.length - 1 && <span className="flex-1 w-px bg-line mt-2" />}
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">0{i + 1}</span>
                <span className="t-h3 font-display italic">{s.title}</span>
                <p className="t-small text-mute">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>

        {/* Desktop: steps along a curve */}
        <svg
          aria-hidden
          className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1392 720"
          preserveAspectRatio="none"
        >
          <path d="M60 720 C 200 420, 520 300, 1392 250" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" fill="none" className="text-ink" />
        </svg>
        <div className="hidden lg:block">
          {steps.map((s, i) => (
            <Reveal
              key={s.title}
              delay={i * 120}
              className="absolute flex flex-col gap-2.5 w-[220px]"
              style={{ left: `${spots[i].left}%`, top: `${spots[i].top}%` }}
            >
              <span className="h-2 w-2 rounded-full bg-ink" />
              <span className="t-h3 font-display italic">{s.title}</span>
              <p className="t-small text-mute">{s.desc}</p>
              <Photo seed={`step-${i}`} sizes="72px" className="w-[72px] h-[72px]" rounded="rounded-full" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
