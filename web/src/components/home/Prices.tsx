import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { Packages } from "./Packages";

const OTHER = ["prewedding", "event", "editorial", "personal"] as const;

/** Prices on the home page: the wedding packages, then every other session's starting price. */
export function Prices() {
  const t = useTranslations();
  return (
    <section className="border-t border-line">
      <Packages eyebrow={t("services.packages.eyebrow")} note={t("home.prices.note")} />
      <div className="wrap gutter pb-20 lg:pb-28 -mt-6 lg:-mt-10 flex flex-col items-center gap-8">
        <Reveal><span className="t-mono text-mute">{t("home.prices.other")}</span></Reveal>
        <Reveal as="ul" delay={80} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line w-full max-w-[1000px]">
          {OTHER.map((k) => (
            <li key={k} className="bg-white">
              <Link href={`/services#${k}`} className="group flex flex-col items-center text-center gap-1.5 py-6 px-4 h-full">
                <span className="t-caption group-hover:italic">{t(`services.items.${k}.title`)}</span>
                <span className="t-small text-mute">{t(`services.items.${k}.from`)}</span>
              </Link>
            </li>
          ))}
        </Reveal>
        <Reveal delay={160}><Link href="/services" className="action">{t("home.prices.all")}</Link></Reveal>
      </div>
    </section>
  );
}
