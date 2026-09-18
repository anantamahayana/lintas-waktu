import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
    <div className="pt-[calc(var(--nav-h)+40px)] lg:pt-[calc(var(--nav-h)+72px)]">
      <header className="gutter pb-16 lg:pb-24 grid lg:grid-cols-12 gap-6 items-end">
        <Reveal className="lg:col-span-8">
          <h1 className="t-display">{t("line1")} <span className="font-light">{t("line2")}</span></h1>
        </Reveal>
        <Reveal delay={100} className="lg:col-span-4 flex flex-col gap-3">
          <span className="t-mono text-mute">{t("eyebrow")}</span>
          <p className="t-body text-mute max-w-[40ch]">{t("lead")}</p>
        </Reveal>
      </header>

      {/* Index of the four — the order is the order of a life, not a menu */}
      <div className="border-t border-line">
        {keys.map((k) => (
          <section key={k} id={k} className="gutter py-12 lg:py-20 border-b border-line grid lg:grid-cols-12 gap-8 lg:gap-12 scroll-mt-[var(--nav-h)]">
            <Reveal className="lg:col-span-3 flex flex-col gap-3">
              <span className="t-mono text-mute">{t(`items.${k}.title`)}</span>
              <span className="t-mono text-faint">{t(`items.${k}.from`)}</span>
            </Reveal>
            <Reveal delay={80} className="lg:col-span-5 flex flex-col gap-6">
              <h2 className="t-statement max-w-[22ch]">{t(`items.${k}.sub`)}</h2>
              <p className="t-body text-mute max-w-[52ch]">{t(`items.${k}.body`)}</p>
              <span className="t-mono text-mute">{t(`items.${k}.includes`)}</span>
              <Link href={`/contact?kind=${k}`} className="action">{t("ask", { name: t(`items.${k}.title`).toLowerCase() })}</Link>
            </Reveal>
            <Reveal delay={160} className="lg:col-span-4">
              <Photo seed={`service-${k}`} sizes="(min-width:1024px) 30vw, 100vw" className="aspect-[4/5] w-full" />
            </Reveal>
          </section>
        ))}
      </div>

      <Packages eyebrow={t("packages.eyebrow")} note={t("packages.note")} />

      <section className="gutter py-16 lg:py-28 border-t border-line grid lg:grid-cols-12 gap-8">
        <Reveal className="lg:col-span-4 flex flex-col gap-4">
          <span className="t-mono text-mute">{t("faq.eyebrow")}</span>
          <h2 className="t-statement max-w-[18ch]">{t("faq.title")}</h2>
        </Reveal>
        <Reveal delay={100} className="lg:col-span-7 lg:col-start-6"><Faq items={faq} /></Reveal>
      </section>
    </div>
  );
}
