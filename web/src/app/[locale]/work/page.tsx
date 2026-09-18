import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import { Reveal } from "@/components/ui/Reveal";
import { ContactSheet } from "@/components/work/ContactSheet";
import { getProjects } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/work", { titleKey: "work" });
}

export default async function WorkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("work");
  const projects = await getProjects(locale);
  return (
    <div className="wrap gutter pt-12 lg:pt-20 pb-20 lg:pb-28">
      <header className="flex flex-col items-center text-center gap-5 pb-12 lg:pb-16">
        <Reveal><span className="t-mono text-mute">{t("eyebrow")}</span></Reveal>
        <Reveal delay={80}><h1 className="t-display-sm">{t("line1")} <em>{t("line2")}</em></h1></Reveal>
        <Reveal delay={160}><p className="t-body max-w-[56ch]">{t("lead")}</p></Reveal>
      </header>
      <ContactSheet projects={projects} />
    </div>
  );
}
