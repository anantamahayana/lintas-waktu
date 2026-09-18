import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

/** One paragraph, set large. Says what this is; nothing else. */
export function Statement() {
  const t = useTranslations("home.hero");
  const s = useTranslations("home.services");
  const keys = ["wedding", "prewedding", "event", "personal"] as const;
  return (
    <section className="gutter pt-20 lg:pt-36 grid lg:grid-cols-12 gap-8">
      <Reveal className="lg:col-span-3 t-mono text-mute">{t("eyebrow")}</Reveal>
      <Reveal delay={100} className="lg:col-span-8 flex flex-col gap-10">
        <p className="t-statement max-w-[24ch]">{t("lead")}</p>
        <ul className="flex flex-wrap gap-x-8 gap-y-3 t-mono">
          {keys.map((k) => (
            <li key={k}>
              <Link href={`/services#${k}`} className="link">{s(`items.${k}.title`)}</Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
