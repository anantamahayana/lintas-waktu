import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Headline } from "@/components/ui/Headline";
import { Reveal } from "@/components/ui/Reveal";
import { WorkGrid } from "@/components/work/WorkGrid";
import { projects } from "@/lib/projects";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("work") };
}

export default async function WorkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("work");

  return (
    <div className="pb-16 lg:pb-28">
      <header className="gutter pt-10 pb-10 lg:pt-22 lg:pb-14 flex flex-col gap-5 lg:gap-6">
        <Reveal><p className="eyebrow">{t("eyebrow")}</p></Reveal>
        <Reveal delay={80}><Headline as="h1" size="hero" line1={t("line1")} line2={t("line2")} /></Reveal>
        <Reveal delay={160}><p className="t-lead text-mute max-w-[560px]">{t("lead")}</p></Reveal>
      </header>
      <WorkGrid projects={projects} />
    </div>
  );
}
