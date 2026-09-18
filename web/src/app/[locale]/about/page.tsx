import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("about") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const c = await getTranslations("cta");
  const values = t.raw("values.items") as { title: string; body: string }[];
  const facts = t.raw("facts.items") as { k: string; v: string }[];

  return (
    <div>
      {/* Intro + portrait */}
      <section className="gutter pt-10 pb-14 lg:pt-22 lg:pb-28 flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-20">
        <Reveal className="flex flex-col gap-6 lg:gap-8 lg:flex-1 lg:pt-6">
          <p className="eyebrow">{t("eyebrow")}</p>
          <Headline as="h1" size="hero" line1={t("line1")} line2={t("line2")} />
          <p className="t-lead text-mute max-w-[560px]">{t("lead")}</p>
          <p className="t-body text-mute max-w-[520px]">{t("body")}</p>
        </Reveal>
        <Reveal delay={120} className="lg:w-[520px] shrink-0">
          <Photo seed="about-portrait" priority sizes="(min-width:1024px) 520px, 100vw" className="h-[420px] lg:h-[660px]" />
        </Reveal>
      </section>

      {/* Values — dark strip */}
      <section className="bg-green text-on-dark">
        <div className="bg-green-deep gutter pt-12 pb-8 lg:pt-20 lg:pb-12">
          <Reveal className="flex flex-col gap-3">
            <p className="eyebrow !text-on-dark-mute">{t("values.eyebrow")}</p>
            <h2 className="t-h2 text-balance">
              {t("values.line1")}
              <br />
              <span className="font-display italic">{t("values.line2")}</span>
            </h2>
          </Reveal>
        </div>
        <div className="grid lg:grid-cols-3">
          {values.map((v, i) => (
            <Reveal
              key={v.title}
              delay={i * 80}
              className={clsx("gutter py-6 lg:py-12 lg:pr-8 border-line-dark flex flex-col gap-3", i > 0 && "border-t lg:border-t-0 lg:border-l")}
            >
              <span className="eyebrow !text-on-dark-mute">0{i + 1}</span>
              <span className="t-h3">{v.title}</span>
              <p className="t-body text-on-dark-mute">{v.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Photo strip */}
      <section className="gutter py-12 lg:py-24 flex items-center justify-between gap-3 lg:gap-5">
        {[
          ["about-1", "w-[30%] lg:w-[300px] h-[200px] lg:h-[400px]"],
          ["about-2", "w-[36%] lg:w-[420px] h-[260px] lg:h-[300px]"],
          ["about-3", "hidden lg:block lg:w-[260px] lg:h-[360px]"],
          ["about-4", "w-[30%] lg:w-[300px] h-[200px] lg:h-[420px]"],
        ].map(([seed, cls], i) => (
          <Reveal key={seed} delay={i * 80} className={cls}>
            <Photo seed={seed} sizes="(min-width:1024px) 420px, 36vw" className="h-full w-full" />
          </Reveal>
        ))}
      </section>

      {/* Facts */}
      <section className="bg-paper-deep gutter py-12 lg:py-24 flex flex-col lg:flex-row gap-6 lg:gap-16">
        <Reveal className="flex flex-col gap-4 lg:w-[400px] shrink-0">
          <p className="eyebrow">{t("facts.eyebrow")}</p>
          <h2 className="t-h2">{t("facts.title")}</h2>
        </Reveal>
        <Reveal delay={100} as="dl" className="flex-1 flex flex-col">
          {facts.map((f) => (
            <div key={f.k} className="flex flex-col sm:flex-row gap-1 sm:gap-6 py-4 border-b border-line">
              <dt className="eyebrow sm:w-[160px] shrink-0 sm:pt-1">{f.k}</dt>
              <dd className="t-body">{f.v}</dd>
            </div>
          ))}
        </Reveal>
      </section>

      {/* CTA */}
      <section className="gutter py-20 lg:py-32 flex flex-col items-center text-center gap-7">
        <Reveal><Headline line1={t("cta.line1")} line2={t("cta.line2")} align="center" /></Reveal>
        <Reveal delay={100}><Link href="/contact" className="btn-ink">{c("start")}</Link></Reveal>
      </section>
    </div>
  );
}
