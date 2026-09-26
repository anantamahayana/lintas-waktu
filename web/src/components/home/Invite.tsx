import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { waLink } from "@/lib/site";
import type { SiteInfo } from "@/lib/content";
import type { Frame } from "@/lib/frame";

/** Closing invitation: a wide photograph, then the ask, centred. */
export function Invite({ site, src, frame }: { site: SiteInfo; src?: string; frame?: Frame | null }) {
  const t = useTranslations("home.invite");
  const c = useTranslations("cta");
  return (
    <section className="flex flex-col">
      <Reveal className="wrap gutter">
        <Photo src={src} seed="cta" frame={frame} sizes="100vw" className="w-full aspect-[21/9]" />
      </Reveal>
      <div className="wrap gutter py-16 lg:py-24 flex flex-col items-center text-center gap-6">
        <Reveal><span className="t-mono text-mute">{t("eyebrow")}</span></Reveal>
        <Reveal delay={80}><h2 className="t-display-sm">{t.rich("title", { em: (x) => <em>{x}</em> })}</h2></Reveal>
        <Reveal delay={160}><p className="t-body max-w-[52ch]">{t("body")}</p></Reveal>
        <Reveal delay={240} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link href="/contact" className="ink-btn">{t("cta")}</Link>
          <a href={waLink(undefined, site.whatsapp.number)} className="action">{c("whatsapp")}</a>
        </Reveal>
      </div>
    </section>
  );
}
