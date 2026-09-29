import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { waLink } from "@/lib/site";
import { getSite, getSiteFrames, getSiteImages } from "@/lib/content";
import { Photo } from "@/components/ui/Photo";
import { Mark } from "@/components/ui/Mark";

/** "This moment has passed": one loose print from the site, and the ways back. */
export default async function NotFound() {
  const [t, site, img, fr] = await Promise.all([getTranslations("notFound"), getSite(), getSiteImages(), getSiteFrames()]);
  const slot = img.cta ? "cta" : "hero";
  return (
    <div className="wrap gutter py-20 lg:py-32 flex flex-col items-center text-center gap-6">
      <div className="mb-4 bg-white p-2.5 pb-8 shadow-[0_1px_2px_rgba(31,30,28,.08),0_8px_24px_rgba(31,30,28,.08)] -rotate-2">
        <Photo src={img[slot]} seed="notfound" frame={fr[slot] && { ...fr[slot], fit: "cover" }} sizes="220px" className="w-[180px] sm:w-[220px] aspect-[4/5]" />
      </div>
      <span className="t-mono text-mute">{t("eyebrow")}</span>
      <h1 className="t-display-sm max-w-[20ch]">{t.rich("title", { em: (x) => <em>{x}</em> })}</h1>
      <p className="t-body max-w-[52ch]">{t("body")}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Link href="/" className="ink-btn">{t("home")}</Link>
        <Link href="/work" className="action">{t("work")}</Link>
      </div>
      <Mark className="pt-4" />
      <a href={waLink(undefined, site.whatsapp.number)} target="_blank" rel="noreferrer" className="link t-mono text-mute hover:text-ink">{t("whatsapp")}</a>
    </div>
  );
}
