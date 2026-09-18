import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

/** The one dark section: photograph left, a personal note right. */
export function Behind() {
  const t = useTranslations("home.behind");
  const c = useTranslations("cta");
  return (
    <section className="bg-dark text-on-dark">
      <div className="grid lg:grid-cols-2">
        <Reveal className="min-h-[420px] lg:min-h-[640px]">
          <Photo seed="behind-main" sizes="(min-width:1024px) 50vw, 100vw" className="h-full w-full" />
        </Reveal>
        <Reveal delay={120} className="flex flex-col justify-center gap-6 lg:gap-8 gutter py-16 lg:py-24 lg:pl-20 lg:pr-24">
          <span className="t-mono text-on-dark-mute">{t("eyebrow")}</span>
          <h2 className="t-display-sm max-w-[18ch]">{t.rich("title", { em: (x) => <em>{x}</em> })}</h2>
          <p className="t-body !text-on-dark-mute max-w-[52ch]">{t("body")}</p>
          <p className="t-statement text-on-dark/90 max-w-[30ch]">{t("quote")}</p>
          <Link href="/about" className="action-light self-start mt-2">{c("about")}</Link>
        </Reveal>
      </div>
    </section>
  );
}
