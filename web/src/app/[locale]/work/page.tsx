import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { ContactSheet } from "@/components/work/ContactSheet";
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
    <div className="pt-[calc(var(--nav-h)+40px)] lg:pt-[calc(var(--nav-h)+72px)] pb-8">
      <header className="gutter pb-10 lg:pb-16 grid lg:grid-cols-12 gap-6 items-end">
        <Reveal className="lg:col-span-8">
          <h1 className="t-display">
            {t("line1")} <span className="font-light">{t("line2")}</span>
          </h1>
        </Reveal>
        <Reveal delay={100} className="lg:col-span-4 flex flex-col gap-3">
          <span className="t-mono text-mute">{t("eyebrow")}</span>
          <p className="t-body text-mute max-w-[40ch]">{t("lead")}</p>
        </Reveal>
      </header>
      <ContactSheet projects={projects} />
    </div>
  );
}
