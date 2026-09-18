import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/about", { titleKey: "about" });
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
      {/* Portrait + statement */}
      <section className="wrap gutter pt-12 lg:pt-20 pb-16 lg:pb-24 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <Reveal className="lg:col-span-5 aspect-[4/5]">
          <Photo seed="about-portrait" priority sizes="(min-width:1024px) 40vw, 100vw" className="h-full w-full" />
        </Reveal>
        <Reveal delay={100} className="lg:col-span-6 lg:col-start-7 flex flex-col gap-6">
          <span className="t-mono text-mute">{t("eyebrow")}</span>
          <h1 className="t-display-sm max-w-[16ch]">{t("line1")} <em>{t("line2")}</em></h1>
          <p className="t-statement max-w-[34ch]">{t("lead")}</p>
          <p className="t-body max-w-[56ch]">{t("body")}</p>
        </Reveal>
      </section>

      {/* Values — dark section, three columns */}
      <section className="bg-dark text-on-dark">
        <div className="wrap gutter py-16 lg:py-24 flex flex-col items-center gap-12 lg:gap-16 text-center">
          <Reveal className="flex flex-col items-center gap-4">
            <span className="t-mono text-on-dark-mute">{t("values.eyebrow")}</span>
            <h2 className="t-display-sm max-w-[18ch]">{t("values.line1")} <em>{t("values.line2")}</em></h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-10 lg:gap-16 w-full max-w-[1000px]">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 100} className="flex flex-col items-center gap-3">
                <span className="t-caption">{v.title}</span>
                <p className="t-small text-on-dark-mute max-w-[30ch]">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Photo strip */}
      <section className="wrap gutter py-16 lg:py-24 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {["about-1", "about-2", "about-3", "about-4"].map((s, i) => (
          <Reveal key={s} delay={i * 70} className="aspect-[3/4]">
            <Photo seed={s} sizes="(min-width:1024px) 25vw, 50vw" className="h-full w-full" />
          </Reveal>
        ))}
      </section>

      {/* Facts */}
      <section className="border-t border-line">
        <div className="wrap gutter py-16 lg:py-24 flex flex-col items-center gap-10">
          <Reveal className="flex flex-col items-center text-center gap-4">
            <span className="t-mono text-mute">{t("facts.eyebrow")}</span>
            <h2 className="t-display-sm">{t("facts.title")}</h2>
          </Reveal>
          <Reveal delay={100} as="dl" className="w-full max-w-[720px] flex flex-col">
            {facts.map((f) => (
              <div key={f.k} className="grid sm:grid-cols-[180px_1fr] gap-1 sm:gap-8 py-4 border-b border-line">
                <dt className="t-mono text-mute pt-1">{f.k}</dt>
                <dd className="t-body !text-ink">{f.v}</dd>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="wrap gutter py-20 lg:py-28 flex flex-col items-center text-center gap-6">
        <Reveal><h2 className="t-display-sm">{t("cta.line1")} <em>{t("cta.line2")}</em></h2></Reveal>
        <Reveal delay={100}><Link href="/contact" className="ink-btn">{c("start")}</Link></Reveal>
      </section>
    </div>
  );
}
