import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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

  const channels = [
    { k: "whatsapp", v: site.whatsapp.display, href: waLink() },
    { k: "email", v: site.email, href: `mailto:${site.email}` },
    { k: "instagram", v: `@${site.instagram}`, href: `https://instagram.com/${site.instagram}` },
  ] as const;

  return (
    <div className="pt-[calc(var(--nav-h)+40px)] lg:pt-[calc(var(--nav-h)+72px)] pb-8">
      <header className="gutter pb-12 lg:pb-20 flex flex-col gap-6">
        <Reveal><span className="t-mono text-mute">{t("eyebrow")}</span></Reveal>
        <Reveal delay={60}><h1 className="t-display max-w-[12ch]">{t("line1")} <span className="font-light">{t("line2")}</span></h1></Reveal>
        <Reveal delay={120}><p className="t-body text-mute max-w-[48ch]">{t("lead")}</p></Reveal>
      </header>

      <section className="gutter grid lg:grid-cols-12 gap-12 lg:gap-16 border-t border-line pt-10 lg:pt-16">
        <Reveal className="lg:col-span-4">
          <ul className="flex flex-col">
            {channels.map((ch) => (
              <li key={ch.k} className="py-4 border-b border-line flex flex-col gap-1">
                <span className="t-mono text-mute">{t(`channels.${ch.k}`)} · <span className="text-faint">{t(`channels.${ch.k}Note`)}</span></span>
                <a href={ch.href} className="link t-body self-start">{ch.v}</a>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={100} className="relative lg:col-span-7 lg:col-start-6">
          <ContactForm initialKind={kind} />
        </Reveal>
      </section>
    </div>
  );
}
