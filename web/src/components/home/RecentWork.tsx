import { ViewTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { frameOf, whenOf, type Project } from "@/lib/projects";

/**
 * Recent work as a slow vertical sequence: one photograph per project,
 * alternating widths, one mono caption. Each image morphs into its
 * project page (shared element via ViewTransition name).
 */
const LAYOUT = ["lg:w-full", "lg:w-2/3 lg:ml-auto", "lg:w-2/3", "lg:w-full"];
const HEIGHT = ["h-[70vh] lg:h-[90vh]", "h-[60vh] lg:h-[75vh]", "h-[60vh] lg:h-[75vh]", "h-[70vh] lg:h-[90vh]"];

export function RecentWork({ projects }: { projects: Project[] }) {
  const t = useTranslations();
  return (
    <section className="gutter flex flex-col gap-16 lg:gap-32 py-16 lg:py-32">
      {projects.map((p, i) => (
        <Reveal key={p.slug} className={clsx("w-full", LAYOUT[i % LAYOUT.length])}>
          <Link href={`/work/${p.slug}`} className="group block">
            <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
              <div className={HEIGHT[i % HEIGHT.length]}>
                <Photo seed={p.cover} alt={p.title} sizes="(min-width:1024px) 90vw, 100vw" className="h-full w-full" />
              </div>
            </ViewTransition>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 t-mono">
              <span className="text-faint">{frameOf(p)}</span>
              <span>
                {whenOf(p).replace("-", " · ")} — <span className="link group-hover:bg-[length:100%_1px]">{p.title}</span>, {p.location}
              </span>
              <span className="text-mute">{t(`categories.${p.category}`)}</span>
            </div>
          </Link>
        </Reveal>
      ))}
      <Reveal className="self-end">
        <Link href="/work" className="action">{t("cta.viewAll")}</Link>
      </Reveal>
    </section>
  );
}
