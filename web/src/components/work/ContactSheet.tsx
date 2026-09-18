"use client";

import { useMemo, useState, ViewTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { categories, type Category, type Project } from "@/lib/projects";

/** Portfolio: quiet text filters, three portrait columns, serif captions. */
export function ContactSheet({ projects }: { projects: Project[] }) {
  const t = useTranslations();
  const [cat, setCat] = useState<Category | "all">("all");
  const shown = useMemo(() => (cat === "all" ? projects : projects.filter((p) => p.category === cat)), [cat, projects]);

  return (
    <>
      <div role="group" aria-label={t("work.filterLabel")} className="flex flex-wrap justify-center gap-x-8 gap-y-3 pb-12 lg:pb-16">
        {(["all", ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={clsx("link t-mono", cat === c ? "text-ink" : "text-mute hover:text-ink")}
          >
            {t(`categories.${c}`)}
          </button>
        ))}
      </div>

      <ul key={cat} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 lg:gap-x-10 lg:gap-y-16">
        {shown.map((p, i) => (
          <Reveal as="li" key={p.slug} delay={(i % 3) * 80}>
            <Link href={`/work/${p.slug}`} className="group flex flex-col items-center text-center gap-4">
              <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
                <div className="w-full aspect-[4/5]">
                  <Photo seed={p.cover} alt={p.title} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="h-full w-full" />
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
      {shown.length === 0 && <p className="t-body text-center py-16">{t("work.empty")}</p>}
    </>
  );
}
