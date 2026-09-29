import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/contact/ContactForm";
import { getSite, getSiteFrames, getSiteImages } from "@/lib/content";
import { boxStyle } from "@/lib/frame";
import { SocialIcon, socialLinks } from "@/components/site/Social";
import { BaliTime } from "@/components/site/BaliTime";

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
  const fr = await getSiteFrames();
  const img = await getSiteImages();
  const t = await getTranslations("contact");
  const site = await getSite();

  const channels = socialLinks(site);

  return (
    <div>
      <section className="wrap gutter pt-12 lg:pt-20 pb-12 lg:pb-16 flex flex-col items-center text-center gap-5">
        <Reveal><span className="t-mono text-mute">{t("eyebrow")}</span></Reveal>
        <Reveal delay={80}><h1 className="t-display-sm">{t("line1")} <em>{t("line2")}</em></h1></Reveal>
        <Reveal delay={160}><p className="t-body max-w-[52ch]">{t("lead")}</p></Reveal>
        <Reveal delay={240} as="ul" className="flex flex-wrap justify-center gap-x-10 gap-y-4 pt-4">
          {channels.map((ch) => (
            <li key={ch.k} className="flex flex-col items-center gap-1">
              <SocialIcon k={ch.k} className="h-6 w-6 text-mute" />
              <span className="t-mono text-faint">{t(`channels.${ch.k}`)}</span>
              <a href={ch.href} {...(ch.external ? { target: "_blank", rel: "noreferrer" } : {})} className="link t-caption">{ch.label}</a>
              <span className="t-small text-mute">{t(`channels.${ch.k}Note`)}</span>
            </li>
          ))}
        </Reveal>
        <Reveal delay={320} className="pt-4 w-full"><BaliTime /></Reveal>
      </section>

      <section className="wrap gutter pb-20 lg:pb-28 grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <Reveal className="hidden lg:block lg:col-span-4 aspect-[4/5] lg:sticky lg:top-8" style={boxStyle(fr["contact-1"])}>
          <Photo src={img["contact-1"]} seed="contact-1" frame={fr["contact-1"] && { ...fr["contact-1"], fit: "cover" }} sizes="33vw" className="h-full w-full" />
        </Reveal>
        <Reveal delay={100} className="relative lg:col-span-7 lg:col-start-6 border border-line p-6 sm:p-8 lg:p-10">
          <ContactForm initialKind={kind} whatsapp={site.whatsapp.number} />
        </Reveal>
      </section>
    </div>
  );
}
