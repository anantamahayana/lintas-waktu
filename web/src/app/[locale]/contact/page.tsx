import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/contact/ContactForm";
import { Availability } from "@/components/contact/Availability";
import { waLink } from "@/lib/site";
import { getSite } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/contact", { titleKey: "contact" });
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
  const site = await getSite();

  const channels = [
    { k: "whatsapp", v: site.whatsapp.display, href: waLink(undefined, site.whatsapp.number) },
    { k: "email", v: site.email, href: `mailto:${site.email}` },
    { k: "instagram", v: `@${site.instagram}`, href: `https://instagram.com/${site.instagram}` },
  ] as const;

  return (
    <div>
      <section className="wrap gutter pt-12 lg:pt-20 pb-12 lg:pb-16 flex flex-col items-center text-center gap-5">
        <Reveal><span className="t-mono text-mute">{t("eyebrow")}</span></Reveal>
        <Reveal delay={80}><h1 className="t-display-sm">{t("line1")} <em>{t("line2")}</em></h1></Reveal>
        <Reveal delay={160}><p className="t-body max-w-[52ch]">{t("lead")}</p></Reveal>
        <Reveal delay={240} as="ul" className="flex flex-wrap justify-center gap-x-10 gap-y-4 pt-4">
          {channels.map((ch) => (
            <li key={ch.k} className="flex flex-col items-center gap-1">
              <span className="t-mono text-faint">{t(`channels.${ch.k}`)}</span>
              <a href={ch.href} className="link t-caption">{ch.v}</a>
              <span className="t-small text-mute">{t(`channels.${ch.k}Note`)}</span>
            </li>
          ))}
        </Reveal>
      </section>

      <section className="wrap gutter pb-20 lg:pb-28 grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <Reveal className="hidden lg:block lg:col-span-4 aspect-[4/5] lg:sticky lg:top-8">
          <Photo seed="contact-1" sizes="33vw" className="h-full w-full" />
        </Reveal>
        <Reveal delay={100} className="relative lg:col-span-7 lg:col-start-6 border border-line p-6 sm:p-8 lg:p-10">
          <ContactForm initialKind={kind} whatsapp={site.whatsapp.number} />
        </Reveal>
      </section>

      <section className="wrap gutter pb-20 lg:pb-28 border-t border-line pt-16 lg:pt-20">
        <Availability locale={locale} />
      </section>
    </div>
  );
}
