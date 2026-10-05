import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { Faq } from "@/components/ui/Faq";

/** The four questions people ask first; the rest live on Services. */
export function HomeFaq() {
  const t = useTranslations();
  const items = (t.raw("services.faq.items") as { q: string; a: string }[]).slice(0, 4);
  return (
    <section className="border-t border-line">
      <div className="wrap gutter py-20 lg:py-28 flex flex-col items-center gap-10">
        <Reveal className="flex flex-col items-center text-center gap-4">
          <span className="t-mono text-mute">{t("services.faq.eyebrow")}</span>
          <h2 className="t-display-sm max-w-[20ch]">{t("services.faq.title")}</h2>
        </Reveal>
        <Reveal delay={100} className="w-full max-w-[760px]"><Faq items={items} /></Reveal>
        <Reveal delay={160}><Link href="/services#faq" className="action">{t("home.faqMore")}</Link></Reveal>
      </div>
    </section>
  );
}
