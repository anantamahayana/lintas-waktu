"use client";

import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import { useTimeline } from "./TimelineContext";

const START = 2022;

function toPos(when: string, endYear: number) {
  const [y, m] = when.split("-").map(Number);
  const t = y + ((m || 1) - 1) / 12;
  return ((t - START) / (endYear + 1 - START)) * 100;
}

/**
 * The signature: a fixed line across the foot of every page with year
 * ticks. Points are the projects; the red needle marks the current one.
 * Hover/drag along the line scrubs between points (when a page opts in).
 */
export function Timeline() {
  const { points, active, onScrub, setActive } = useTimeline();
  const ref = useRef<HTMLDivElement>(null);
  const endYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: endYear - START + 1 }, (_, i) => START + i), [endYear]);
  const activePt = points.find((p) => p.id === active) ?? null;
  const needle = activePt ? toPos(activePt.when, endYear) : 100;

  // Scrub: nearest point to the pointer along the x axis
  useEffect(() => {
    const el = ref.current;
    if (!el || !onScrub || points.length === 0) return;
    let raf = 0;
    const handle = (clientX: number) => {
      const r = el.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * 100;
      let best = points[0];
      let bd = Infinity;
      for (const p of points) {
        const d = Math.abs(toPos(p.when, endYear) - x);
        if (d < bd) { bd = d; best = p; }
      }
      if (best.id !== active) { setActive(best.id); onScrub(best.id); }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" && !(e.buttons & 1)) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => handle(e.clientX));
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onMove);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerdown", onMove); cancelAnimationFrame(raf); };
  }, [onScrub, points, active, setActive, endYear]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 h-[var(--timeline-h)] bg-white/85 backdrop-blur-sm border-t border-line select-none"
      aria-hidden
    >
      <div ref={ref} className={clsx("relative h-full mx-5 lg:mx-8", onScrub && "cursor-ew-resize")}>
        {/* base line */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-line" />

        {/* year ticks */}
        {years.map((y) => (
          <div key={y} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${((y - START) / (endYear + 1 - START)) * 100}%` }}>
            <div className="h-2 w-px bg-faint -translate-y-[3px]" />
            <span className="absolute left-1.5 top-[7px] t-mono text-faint hidden lg:block">{y}</span>
          </div>
        ))}

        {/* project points */}
        {points.map((p) => (
          <div
            key={p.id}
            className={clsx(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500",
              p.id === active ? "h-2.5 w-2.5 bg-mark" : "h-1.5 w-1.5 bg-ink/70",
            )}
            style={{ left: `${toPos(p.when, endYear)}%` }}
          />
        ))}

        {/* needle */}
        <div
          className="absolute top-0 bottom-0 w-px bg-mark transition-[left] duration-700 ease-out-soft"
          style={{ left: `${needle}%` }}
        />

        {/* current label */}
        <span className="absolute right-0 top-1/2 -translate-y-1/2 t-mono text-ink bg-white/90 pl-2">
          {activePt ? `${activePt.when.replace("-", " · ")} — ${activePt.label}` : `${endYear} — Bali`}
        </span>
      </div>
    </div>
  );
}
