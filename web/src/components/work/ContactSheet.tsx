"use client";

import { useEffect, useMemo, useRef, useState, ViewTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { useTimeline } from "@/components/timeline/TimelineContext";
import { categories, frameOf, whenOf, type Category, type Project } from "@/lib/projects";

/**
 * The Work page as a contact sheet: uniform frames, frame numbers, mono
 * captions. The timeline at the foot scrubs through the sheet — the
 * nearest project lights up and scrolls into view.
 */
export function ContactSheet({ projects }: { projects: Project[] }) {
  const t = useTranslations();
  const { setPoints, setActive, setOnScrub, active } = useTimeline();
  const [cat, setCat] = useState<Category | "all">("all");
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const shown = useMemo(() => (cat === "all" ? projects : projects.filter((p) => p.category === cat)), [cat, projects]);

  useEffect(() => {
    setPoints(shown.map((p) => ({ id: p.slug, when: whenOf(p), label: `${p.title}, ${p.location}` })));
    setActive(shown[0]?.slug ?? null);
    setOnScrub((id) => {
      refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => { setPoints([]); setOnScrub(null); setActive(null); };
  }, [shown, setPoints, setActive, setOnScrub]);

  return (
    <>
      <div className="gutter flex flex-wrap gap-x-6 gap-y-2 pb-8 t-mono" role="group" aria-label={t("work.filterLabel")}>
        {(["all", ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={clsx("link", cat !== c && "text-mute")}
          >
            {t(`categories.${c}`)}
            <span className="text-faint"> {c === "all" ? projects.length : projects.filter((p) => p.category === c).length}</span>
          </button>
        ))}
      </div>

      <ol className="gutter grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 lg:gap-x-5 lg:gap-y-12">
        {shown.map((p) => {
          const isActive = active === p.slug;
          return (
            <li
              key={p.slug}
              ref={(el) => { refs.current[p.slug] = el; }}
              onPointerEnter={() => setActive(p.slug)}
              className={clsx("transition-opacity duration-500", active && !isActive && "opacity-40 hover:opacity-100")}
            >
              <Link href={`/work/${p.slug}`} className="group block">
                <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
                  <div className="aspect-[4/5]">
                    <Photo seed={p.cover} alt={p.title} sizes="(min-width:1024px) 25vw, 50vw" className="h-full w-full" />
                  </div>
                </ViewTransition>
                <div className="mt-3 flex flex-col gap-1 t-mono">
                  <span className="flex justify-between text-faint">
                    <span>{frameOf(p)}</span>
                    <span>{whenOf(p).replace("-", " · ")}</span>
                  </span>
                  <span className={clsx(isActive && "text-mark")}>{p.title}</span>
                  <span className="text-mute">{t(`categories.${p.category}`)} · {p.location}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      {shown.length === 0 && <p className="gutter t-body text-mute py-16">{t("work.empty")}</p>}
    </>
  );
}
