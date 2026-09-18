"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { categories, type Category, type Project } from "@/lib/projects";

/**
 * Editorial row grid (see Figma "Work"): rows keep a shared height and
 * alternate patterns 2:1 → 1:1:1 → 1:2 → 1:1 so the page has rhythm
 * without masonry gaps. Mobile: full / half+half repeating.
 */
const PATTERNS: number[][] = [[2, 1], [1, 1, 1], [1, 2], [1, 1], [1, 1, 1]];

function toRows(items: Project[]) {
  const rows: { spans: number[]; items: Project[] }[] = [];
  let i = 0;
  let p = 0;
  while (i < items.length) {
    const spans = PATTERNS[p % PATTERNS.length];
    const slice = items.slice(i, i + spans.length);
    rows.push({ spans: spans.slice(0, slice.length), items: slice });
    i += slice.length;
    p++;
  }
  return rows;
}

export function WorkGrid({ projects }: { projects: Project[] }) {
  const t = useTranslations();
  const [cat, setCat] = useState<Category | "all">("all");
  const filtered = useMemo(() => (cat === "all" ? projects : projects.filter((p) => p.category === cat)), [cat, projects]);
  const rows = useMemo(() => toRows(filtered), [filtered]);

  return (
    <>
      {/* Filters */}
      <div role="group" aria-label={t("work.filterLabel")} className="gutter flex gap-2 overflow-x-auto pb-8 lg:pb-10 [scrollbar-width:none]">
        {(["all", ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={clsx(
              "shrink-0 rounded-full px-4 py-2 text-[13px] transition-colors duration-300",
              cat === c ? "bg-ink text-paper" : "border border-line text-ink hover:border-ink hover:bg-paper-deep",
            )}
          >
            {t(`categories.${c}`)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="gutter flex flex-col gap-8 lg:gap-14" key={cat}>
        {rows.length === 0 && <p className="t-body text-mute py-16">{t("work.empty")}</p>}
        {rows.map((row, ri) => {
          const rowH = row.spans.length === 3 ? "lg:h-[520px]" : row.spans.includes(2) ? "lg:h-[620px]" : "lg:h-[560px]";
          return (
            <div
              key={ri}
              className="grid grid-cols-2 gap-3 lg:gap-6 lg:[grid-template-columns:var(--cols)]"
              style={{ "--cols": row.spans.map((s) => `${s}fr`).join(" ") } as React.CSSProperties}
            >
              {row.items.map((p, ci) => {
                const idx = ri * 3 + ci;
                const full = idx % 3 === 0;
                return (
                  <Reveal key={p.slug} delay={ci * 80} className={clsx(full ? "col-span-2" : "col-span-1", "lg:col-span-1")}>
                    <Link href={`/work/${p.slug}`} className="group block">
                      <Photo
                        seed={p.cover}
                        alt={p.title}
                        sizes={row.spans[ci] === 2 ? "(min-width:1024px) 66vw, 100vw" : "(min-width:1024px) 33vw, 50vw"}
                        className={clsx(full ? "h-[420px]" : "h-[220px]", rowH)}
                      />
                      <div className="mt-3 flex items-baseline justify-between gap-3">
                        <span className="font-display text-[20px] lg:text-[32px] leading-[1.2] group-hover:underline underline-offset-4 decoration-1">
                          {p.title}
                        </span>
                        <span className="eyebrow text-right">
                          {t(`categories.${p.category}`)}
                          <span className="hidden sm:inline"> · {p.location}</span>
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
