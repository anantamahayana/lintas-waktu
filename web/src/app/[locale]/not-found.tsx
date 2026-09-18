import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { waLink } from "@/lib/site";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="wrap gutter py-24 lg:py-40 flex flex-col items-center text-center gap-6">
      <span className="t-mono text-mute">{t("eyebrow")}</span>
      <h1 className="t-display-sm max-w-[20ch]">{t.rich("title", { em: (x) => <em>{x}</em> })}</h1>
      <p className="t-body max-w-[52ch]">{t("body")}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Link href="/" className="ink-btn">{t("home")}</Link>
        <a href={waLink()} className="action">{t("whatsapp")}</a>
      </div>
    </div>
  );
}
