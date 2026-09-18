import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";

/**
 * Full-width photograph with the title set in the centre, framed by two
 * small side notes — the composition of the references. Still image:
 * calm beats clever here.
 */
export function Hero({ cover }: { cover?: string }) {
  const t = useTranslations("home.hero");
  return (
    <section className="relative h-[78vh] min-h-[520px] lg:h-[84vh] w-full overflow-hidden">
      <Photo src={cover} seed="hero-2" priority sizes="100vw" className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-dark/35" />

      <div className="absolute inset-0 flex items-center justify-center text-on-dark text-center">
        <div className="wrap gutter grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-8">
          <span className="hidden lg:block t-mono text-on-dark/80 justify-self-end text-right max-w-[12ch]">{t("left")}</span>

          <div className="flex flex-col items-center gap-6 lg:gap-7 animate-[rise_1200ms_cubic-bezier(.22,1,.36,1)_both]">
            <span className="t-mono text-on-dark/80">{t("est")}</span>
            <h1 className="t-display">
              {t("title1")}
              <br />
              {t("title2")}
            </h1>
            <p className="font-serif italic text-[18px] lg:text-[22px] text-on-dark/90">{t("tagline")}</p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link href="/services" className="action-light">{t("cta1")}</Link>
              <Link href="/contact" className="action-light">{t("cta2")}</Link>
            </div>
          </div>

          <span className="hidden lg:block t-mono text-on-dark/80 justify-self-start max-w-[12ch]">{t("right")}</span>
        </div>
      </div>
      <style>{`@keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}
