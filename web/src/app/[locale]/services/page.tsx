import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { Faq } from "@/components/ui/Faq";
import { Packages } from "@/components/home/Packages";

const keys = ["wedding", "prewedding", "event", "personal"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("services") };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const faq = t.raw("faq.items") as { q: string; a: string }[];

  return (
    <div>
      <header className="gutter pt-10 pb-12 lg:pt-22 lg:pb-18 flex flex-col items-start lg:items-center gap-5 lg:gap-6 lg:text-center">
        <Reveal><p className="eyebrow">{t("eyebrow")}</p></Reveal>
        <Reveal delay={80}><Headline as="h1" size="hero" line1={t("line1")} line2={t("line2")} className="lg:text-center" /></Reveal>
        <Reveal delay={160}><p className="t-lead text-mute max-w-[620px]">{t("lead")}</p></Reveal>
      </header>

      {/* Four alternating service blocks */}
      {keys.map((k, i) => (
        <section
          key={k}
          id={k}
          className={clsx(
            "gutter border-t border-line py-10 lg:py-20 flex flex-col gap-5 lg:gap-16 lg:items-center",
            i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse",
          )}
        >
          <Reveal className="lg:hidden">
            <Photo seed={`service-${k}`} sizes="100vw" className="h-[240px]" />
          </Reveal>
          <Reveal className="flex flex-col gap-4 lg:gap-5 lg:flex-1">
            <p className="eyebrow">0{i + 1} — {t(`items.${k}.title`)}</p>
            <h2 className="t-h2 max-w-[560px] text-balance">{t(`items.${k}.sub`)}</h2>
            <p className="t-body text-mute max-w-[520px]">{t(`items.${k}.body`)}</p>
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="t-small">{t(`items.${k}.includes`)}</span>
              <span className="eyebrow">{t(`items.${k}.from`)}</span>
            </div>
            <Link href={`/contact?kind=${k}`} className="btn-ghost self-start mt-2">
              {t("ask", { name: t(`items.${k}.title`).toLowerCase() })}
            </Link>
          </Reveal>
          <Reveal delay={120} className="hidden lg:block">
            <Photo seed={`service-${k}`} sizes="560px" className="w-[560px] h-[420px]" />
          </Reveal>
        </section>
      ))}

      <Packages eyebrow={t("packages.eyebrow")} note={t("packages.note")} />

      {/* FAQ */}
      <section className="gutter py-16 lg:py-28 flex flex-col lg:flex-row gap-8 lg:gap-16">
        <Reveal className="flex flex-col gap-4 lg:w-[400px] shrink-0">
          <p className="eyebrow">{t("faq.eyebrow")}</p>
          <h2 className="t-h2 text-balance">{t("faq.title")}</h2>
        </Reveal>
        <Reveal delay={100} className="flex-1">
          <Faq items={faq} />
        </Reveal>
      </section>
    </div>
  );
}
