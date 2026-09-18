import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
    <div className="pt-[calc(var(--nav-h)+40px)] lg:pt-[calc(var(--nav-h)+72px)]">
      {/* Statement + portrait */}
      <section className="gutter pb-16 lg:pb-28 grid lg:grid-cols-12 gap-10 lg:gap-12">
        <Reveal className="lg:col-span-7 flex flex-col gap-8">
          <span className="t-mono text-mute">{t("eyebrow")}</span>
          <h1 className="t-display max-w-[10ch]">{t("line1")} <span className="font-light">{t("line2")}</span></h1>
          <p className="t-statement max-w-[28ch] font-extralight">{t("lead")}</p>
          <p className="t-body text-mute max-w-[56ch]">{t("body")}</p>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-4 lg:col-start-9 lg:pt-24">
          <Photo seed="about-portrait" priority sizes="(min-width:1024px) 30vw, 100vw" className="aspect-[4/5] w-full" />
        </Reveal>
      </section>

      {/* Values — three columns, ruled */}
      <section className="gutter py-12 lg:py-20 border-t border-line grid lg:grid-cols-12 gap-8">
        <Reveal className="lg:col-span-3 flex flex-col gap-3">
          <span className="t-mono text-mute">{t("values.eyebrow")}</span>
          <p className="t-statement max-w-[14ch]">{t("values.line1")}</p>
          <p className="t-small text-mute">{t("values.line2")}</p>
        </Reveal>
        <div className="lg:col-span-8 lg:col-start-5 grid sm:grid-cols-3 gap-8">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 80} className="flex flex-col gap-3 sm:border-l border-line sm:pl-6">
              <span className="t-body font-medium">{v.title}</span>
              <p className="t-small text-mute">{v.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Photo strip — four frames, honest sizes */}
      <section className="gutter py-12 lg:py-20 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 items-end">
        {[["about-1", "aspect-[4/5]"], ["about-2", "aspect-[3/2] lg:mb-16"], ["about-3", "aspect-[4/5] lg:mb-8"], ["about-4", "aspect-[3/4]"]].map(([s, cls], i) => (
          <Reveal key={s} delay={i * 70} className={cls}>
            <Photo seed={s} sizes="(min-width:1024px) 25vw, 50vw" className="h-full w-full" />
          </Reveal>
        ))}
      </section>

      {/* Facts */}
      <section className="gutter py-12 lg:py-20 border-t border-line grid lg:grid-cols-12 gap-8">
        <Reveal className="lg:col-span-3 flex flex-col gap-3">
          <span className="t-mono text-mute">{t("facts.eyebrow")}</span>
          <p className="t-statement">{t("facts.title")}</p>
        </Reveal>
        <Reveal delay={100} as="dl" className="lg:col-span-8 lg:col-start-5 flex flex-col">
          {facts.map((f) => (
            <div key={f.k} className="grid sm:grid-cols-[160px_1fr] gap-1 sm:gap-6 py-3 border-b border-line">
              <dt className="t-mono text-mute pt-0.5">{f.k}</dt>
              <dd className="t-body">{f.v}</dd>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="gutter py-20 lg:py-32 flex flex-col gap-8">
        <Reveal><h2 className="t-display max-w-[12ch]">{t("cta.line1")} <span className="font-light">{t("cta.line2")}</span></h2></Reveal>
        <Reveal delay={100}><Link href="/contact" className="action">{c("start")}</Link></Reveal>
      </section>
    </div>
  );
}
