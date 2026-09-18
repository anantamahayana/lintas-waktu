import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

export function Behind() {
  const t = useTranslations("home.behind");
  const c = useTranslations("cta");
  return (
    <section className="gutter py-16 lg:py-32 grid lg:grid-cols-12 gap-8 lg:gap-12 items-end">
      <Reveal className="lg:col-span-4">
        <Photo seed="behind-main" sizes="(min-width:1024px) 30vw, 60vw" className="w-2/3 lg:w-full aspect-[4/5]" />
      </Reveal>
      <Reveal delay={100} className="lg:col-span-6 lg:col-start-6 flex flex-col gap-8">
        <span className="t-mono text-mute">{t("eyebrow")}</span>
        <p className="t-statement max-w-[26ch]">{t("line1")} {t("line2")}</p>
        <p className="t-body text-mute max-w-[52ch]">{t("body")}</p>
        <Link href="/about" className="action">{c("about")}</Link>
      </Reveal>
    </section>
  );
}
