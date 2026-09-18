"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { useTimeline } from "@/components/timeline/TimelineContext";

export type HeroFrame = { id: string; slug: string; title: string; location: string; when: string; cover: string };

const INTERVAL = 6000;

/**
 * Full-viewport hero: one photograph at a time, crossfading. Each frame
 * moves the needle on the timeline below. Tap/click advances; the pointer
 * nudges the image by a few pixels — nothing more.
 */
export function Hero({ frames }: { frames: HeroFrame[] }) {
  const t = useTranslations("home.hero");
  const { setPoints, setActive, setOnScrub } = useTimeline();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // publish frames to the timeline; scrubbing the line changes the frame
  useEffect(() => {
    setPoints(frames.map((f) => ({ id: f.id, when: f.when, label: `${f.title}, ${f.location}` })));
    setOnScrub((id) => {
      const n = frames.findIndex((f) => f.id === id);
      if (n >= 0) { setI(n); setPaused(true); }
    });
    return () => { setPoints([]); setOnScrub(null); setActive(null); };
  }, [frames, setPoints, setOnScrub, setActive]);

  useEffect(() => { setActive(frames[i].id); }, [i, frames, setActive]);

  // auto-advance
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((n) => (n + 1) % frames.length), INTERVAL);
    return () => clearInterval(id);
  }, [paused, frames.length]);

  // 3px pointer parallax, rAF-throttled, transform only
  useEffect(() => {
    const el = wrap.current;
    if (!el || matchMedia("(hover: none)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 6;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 6;
        el.style.setProperty("--px", `${x}px`);
        el.style.setProperty("--py", `${y}px`);
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => { el.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  const cur = frames[i];

  return (
    <section
      ref={wrap}
      onClick={() => { setI((n) => (n + 1) % frames.length); setPaused(true); }}
      className="relative h-[calc(100dvh-var(--timeline-h))] w-full overflow-hidden bg-line cursor-e-resize"
      aria-label={t("line1") + " " + t("line2")}
    >
      {/* photo layers */}
      {frames.map((f, n) => (
        <div
          key={f.id}
          className={clsx("fade-layer absolute inset-0", n === i ? "opacity-100" : "opacity-0")}
          style={{ transform: "translate(var(--px, 0), var(--py, 0)) scale(1.02)" }}
          aria-hidden={n !== i}
        >
          <Photo seed={f.cover} alt={f.title} priority={n === 0} eager sizes="100vw" className="h-full w-full" />
        </div>
      ))}

      {/* bottom veil for legibility — light, not a heavy gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-dark/55 to-transparent" />

      {/* headline */}
      <div className="absolute inset-x-0 bottom-0 gutter pb-8 lg:pb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 text-on-dark">
        <h1 className="t-display max-w-[14ch] text-balance">
          {t("line1")}
          <br />
          <span className="font-light">{t("line2")}</span>
        </h1>
        <div className="flex flex-col items-start lg:items-end gap-3 t-mono">
          <span key={cur.id} className="animate-[fadeIn_800ms_ease-out]">
            {cur.when.replace("-", " · ")} — {cur.location}
          </span>
          <Link href={`/work/${cur.slug}`} onClick={(e) => e.stopPropagation()} className="action text-on-dark">
            {cur.title}
          </Link>
        </div>
      </div>

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </section>
  );
}
