import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { Faq } from "@/components/ui/Faq";
import { Packages } from "@/components/home/Packages";

const keys = ["wedding", "prewedding", "event", "personal"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/services", { titleKey: "services" });
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const faq = t.raw("faq.items") as { q: string; a: string }[];

  return (
    <div>
      {/* Banner */}
      <section className="relative h-[46vh] min-h-[320px] w-full overflow-hidden">
        <Photo seed="service-banner" priority sizes="100vw" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-dark/35" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-on-dark gap-4 gutter">
          <span className="t-mono text-on-dark/80">{t("eyebrow")}</span>
          <h1 className="t-display">{t("line1")}</h1>
          <p className="font-serif italic text-[18px] lg:text-[22px] text-on-dark/90">{t("line2")}</p>
        </div>
      </section>

      <div className="wrap gutter pt-14 lg:pt-20 flex flex-col items-center text-center gap-5">
        <Reveal><p className="t-body max-w-[60ch]">{t("lead")}</p></Reveal>
        <Reveal delay={80} as="ol" className="flex flex-wrap justify-center gap-x-8 gap-y-2 t-mono pt-2">
          {keys.map((k, i) => (
            <li key={k}><a href={`#${k}`} className="link text-mute hover:text-ink">0{i + 1} — {t(`items.${k}.title`)}</a></li>
          ))}
        </Reveal>
      </div>

      {/* Four services, alternating */}
      <div className="wrap gutter py-8 lg:py-12">
        {keys.map((k, i) => (
          <section
            key={k}
            id={k}
            className={clsx("py-12 lg:py-20 grid lg:grid-cols-2 gap-10 lg:gap-20 items-center scroll-mt-24", i > 0 && "border-t border-line")}
          >
            <Reveal className={clsx("aspect-[4/5] lg:aspect-[5/6]", i % 2 === 1 && "lg:order-2")}>
              <Photo seed={`service-${k}`} sizes="(min-width:1024px) 50vw, 100vw" className="h-full w-full" />
            </Reveal>
            <Reveal delay={100} className={clsx("flex flex-col gap-5 lg:px-8", i % 2 === 1 && "lg:order-1")}>
              <span className="t-mono text-mute">0{i + 1} — {t(`items.${k}.title`)}</span>
              <h2 className="t-display-sm max-w-[18ch]">{t(`items.${k}.sub`)}</h2>
              <p className="t-body max-w-[52ch]">{t(`items.${k}.body`)}</p>
              <div className="flex flex-col gap-1.5 pt-2">
                <span className="t-small">{t(`items.${k}.includes`)}</span>
                <span className="t-mono text-mute">{t(`items.${k}.from`)}</span>
              </div>
              <Link href={`/contact?kind=${k}`} className="action self-start mt-2">
                {t("ask", { name: t(`items.${k}.title`).toLowerCase() })}
              </Link>
            </Reveal>
          </section>
        ))}
      </div>

      <div className="border-t border-line">
        <Packages eyebrow={t("packages.eyebrow")} note={t("packages.note")} />
      </div>

      <section className="border-t border-line">
        <div className="wrap gutter py-20 lg:py-28 flex flex-col items-center gap-10">
          <Reveal className="flex flex-col items-center text-center gap-4">
            <span className="t-mono text-mute">{t("faq.eyebrow")}</span>
            <h2 className="t-display-sm max-w-[20ch]">{t("faq.title")}</h2>
          </Reveal>
          <Reveal delay={100} className="w-full max-w-[760px]"><Faq items={faq} /></Reveal>
        </div>
      </section>
    </div>
  );
}
