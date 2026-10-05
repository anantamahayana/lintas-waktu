import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";

type Step = { title: string; body: string };

/** How we work: four steps on one line of time, from the first message to the private gallery. */
export function Process() {
  const t = useTranslations("home.process");
  const steps = t.raw("steps") as Step[];
  return (
    <section className="border-t border-line">
      <div className="wrap gutter py-20 lg:py-28 flex flex-col items-center gap-12 lg:gap-16">
        <div className="flex flex-col items-center text-center gap-4">
          <Reveal><span className="t-mono text-mute">{t("eyebrow")}</span></Reveal>
          <Reveal delay={80}><h2 className="t-display-sm max-w-[20ch] text-balance">{t.rich("title", { em: (x) => <em>{x}</em> })}</h2></Reveal>
        </div>
        {/* the line of time: vertical on phones, across on wide screens */}
        <ol className="relative grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-8 w-full max-w-[1100px] before:absolute before:bg-line before:left-[3px] before:top-2 before:bottom-2 before:w-px lg:before:left-0 lg:before:right-0 lg:before:top-[3px] lg:before:bottom-auto lg:before:h-px lg:before:w-auto">
          {steps.map((s, i) => (
            <Reveal as="li" key={i} delay={i * 90} className="relative flex flex-col gap-3 pl-8 lg:pl-0 lg:pt-8">
              <span aria-hidden className="absolute left-0 top-1.5 lg:top-0 h-[7px] w-[7px] rounded-full bg-ink" />
              <span className="t-mono text-faint">0{i + 1}</span>
              <span className="t-caption">{s.title}</span>
              <p className="t-small text-mute max-w-[34ch]">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
