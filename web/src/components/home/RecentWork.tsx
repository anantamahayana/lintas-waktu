import { ViewTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import type { SiteProject } from "@/lib/content";

/** Three portraits, titled; each morphs into its project page. */
export function RecentWork({ projects }: { projects: SiteProject[] }) {
  const t = useTranslations();
  return (
    <section className="wrap gutter py-20 lg:py-28 flex flex-col items-center gap-12 lg:gap-16">
      <div className="flex flex-col items-center text-center gap-4">
        <Reveal><span className="t-mono text-mute">{t("home.recent.eyebrow")}</span></Reveal>
        <Reveal delay={80}><h2 className="t-display-sm">{t.rich("home.recent.title", { em: (x) => <em>{x}</em> })}</h2></Reveal>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-10 w-full">
        {projects.slice(0, 3).map((p, i) => (
          <Reveal as="li" key={p.slug} delay={i * 100}>
            <Link href={`/work/${p.slug}`} className="group flex flex-col gap-4">
              <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
                <div className="aspect-[4/5]">
                  <Photo src={p.coverSrc} seed={p.cover} alt={p.title} sizes="(min-width:640px) 30vw, 100vw" className="h-full w-full" />
                </div>
              </ViewTransition>
              <div className="flex flex-col gap-1">
                <span className="t-caption">{p.title}</span>
                <span className="t-mono text-mute">{t(`categories.${p.category}`)} · {p.location} · {p.date}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>

      <Reveal delay={200}><Link href="/work" className="action">{t("home.recent.cta")}</Link></Reveal>
    </section>
  );
}
