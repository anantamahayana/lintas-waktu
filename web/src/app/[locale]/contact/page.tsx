import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/contact/ContactForm";
import { site, waLink } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("contact") };
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { locale } = await params;
  const { kind } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const c = await getTranslations("cta");

  const channels = [
    { k: "whatsapp", v: site.whatsapp.display, href: waLink() },
    { k: "email", v: site.email, href: `mailto:${site.email}` },
    { k: "instagram", v: `@${site.instagram}`, href: `https://instagram.com/${site.instagram}` },
  ] as const;

  return (
    <div>
      <section className="gutter pt-10 pb-14 lg:pt-22 lg:pb-28 flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-24">
        {/* Intro + channels */}
        <Reveal className="flex flex-col gap-6 lg:gap-8 lg:w-[480px] shrink-0">
          <p className="eyebrow">{t("eyebrow")}</p>
          <Headline as="h1" size="hero" line1={t("line1")} line2={t("line2")} />
          <p className="t-lead text-mute">{t("lead")}</p>
          <a href={waLink()} className="btn-ink self-start lg:hidden">{c("whatsapp")}</a>
          <ul className="flex flex-col">
            {channels.map((ch) => (
              <li key={ch.k} className="flex items-start justify-between gap-4 py-4 border-b border-line">
                <a href={ch.href} className="flex flex-col gap-0.5 hover:text-mute transition-colors">
                  <span className="t-small text-mute">{t(`channels.${ch.k}`)}</span>
                  <span className="t-body">{ch.v}</span>
                </a>
                <span className="t-small text-faint text-right">{t(`channels.${ch.k}Note`)}</span>
              </li>
            ))}
          </ul>
          <a href={waLink()} className="btn-ink self-start hidden lg:inline-flex">{c("whatsapp")}</a>
        </Reveal>

        {/* Form */}
        <Reveal delay={120} className="relative flex-1 bg-paper-deep rounded-[10px] p-6 lg:p-12">
          <ContactForm initialKind={kind} />
        </Reveal>
      </section>

      <section className="gutter pb-16 lg:pb-24 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {["contact-1", "contact-2", "contact-3", "contact-4"].map((s, i) => (
          <Reveal key={s} delay={i * 70}>
            <Photo seed={s} sizes="(min-width:1024px) 25vw, 50vw" className="h-[180px] lg:h-[240px]" />
          </Reveal>
        ))}
      </section>
    </div>
  );
}
