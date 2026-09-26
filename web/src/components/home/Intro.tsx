import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import type { Frame } from "@/lib/frame";

const cards = [
  { k: "wedding", seed: "card-wedding", href: "/services#wedding", offset: "" },
  { k: "prewedding", seed: "card-prewedding", href: "/services#prewedding", offset: "lg:mt-10" },
  { k: "personal", seed: "card-personal", href: "/services#personal", offset: "" },
] as const;

/** Centred statement, then three portrait cards with captions. */
export function Intro({ images = {}, frames = {} }: { images?: Record<string, string | undefined>; frames?: Record<string, Frame> }) {
  const t = useTranslations("home.intro");
  const c = useTranslations("home.cards");
  return (
    <section className="wrap gutter pt-20 lg:pt-28 pb-16 lg:pb-24 flex flex-col items-center text-center gap-14 lg:gap-20">
      <div className="flex flex-col items-center gap-5 max-w-[640px]">
        <Reveal><span className="t-mono text-mute">{t("eyebrow")}</span></Reveal>
        <Reveal delay={80}>
          <h2 className="t-display-sm max-w-[22ch] text-balance">{t.rich("title", { em: (x) => <em>{x}</em> })}</h2>
        </Reveal>
        <Reveal delay={160}><p className="t-body max-w-[58ch]">{t("body")}</p></Reveal>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-10 w-full max-w-[960px]">
        {cards.map((card, i) => (
          <Reveal as="li" key={card.k} delay={i * 100} className={card.offset}>
            <Link href={card.href} className="group flex flex-col items-center gap-4">
              <Photo src={images[card.seed]} seed={card.seed} frame={frames[card.seed]} sizes="(min-width:640px) 30vw, 100vw" className="w-full aspect-[3/4]" />
              <span className="t-caption">{c(card.k)}</span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
