import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

const keys = ["wedding", "prewedding", "event", "personal"] as const;

export function Services() {
  const t = useTranslations("home.services");
  return (
    <section className="bg-green text-on-dark">
      <div className="bg-green-deep gutter pt-14 pb-9 lg:pt-22 lg:pb-14">
        <Reveal className="flex flex-col gap-3">
          <p className="eyebrow !text-on-dark-mute">{t("eyebrow")}</p>
          <h2 className="t-h2 text-balance">
            {t("line1")}
            <br />
            <span className="font-display italic">{t("line2")}</span>
          </h2>
        </Reveal>
      </div>

      <div className="grid lg:grid-cols-4">
        {keys.map((k, i) => (
          <Reveal
            key={k}
            delay={i * 80}
            className={`gutter py-6 lg:py-12 lg:pr-8 border-line-dark ${i > 0 ? "border-t lg:border-t-0 lg:border-l" : ""}`}
          >
            <Link href="/services" className="group flex lg:flex-col gap-4 lg:gap-4">
              <span className="eyebrow !text-on-dark-mute pt-1 lg:pt-0">0{i + 1}</span>
              <div className="flex flex-col gap-2 lg:gap-4">
                <span className="t-h3 group-hover:translate-x-1 transition-transform duration-500 ease-out-soft">{t(`items.${k}.title`)}</span>
                <p className="t-body text-on-dark-mute">{t(`items.${k}.desc`)}</p>
                <span className="eyebrow !text-on-dark pt-1">{t(`items.${k}.from`)}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
