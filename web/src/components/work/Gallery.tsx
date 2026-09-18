"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Project gallery. Frames sit on the white page; tapping one turns the
 * lights off — a full-screen darkroom viewer with keyboard/swipe nav.
 * The viewer is plain CSS transitions; images stay next/image.
 */
export function Gallery({ seeds, srcs, title }: { seeds: string[]; srcs?: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((n) => (n === null ? null : (n + d + seeds.length) % seeds.length)), [seeds.length]);

  useEffect(() => {
    if (open === null) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.documentElement.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open, close, step]);

  // rhythm: 2 · 3 · 1 · 2 …
  const rows: number[][] = [];
  const ROWS = [2, 3, 1, 2];
  for (let i = 0, r = 0; i < seeds.length; r++) {
    const n = ROWS[r % ROWS.length];
    rows.push(Array.from({ length: Math.min(n, seeds.length - i) }, (_, k) => i + k));
    i += n;
  }

  return (
    <>
      <div className="wrap gutter flex flex-col gap-3 lg:gap-5">
        {rows.map((row, ri) => (
          <div key={ri} className={clsx("grid gap-3 lg:gap-5", row.length === 1 ? "grid-cols-1" : row.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3")}>
            {row.map((idx, k) => (
              <Reveal key={seeds[idx]} delay={k * 70} className={clsx(row.length === 3 && k === 2 && "col-span-2 lg:col-span-1")}>
                <button
                  type="button"
                  onClick={() => setOpen(idx)}
                  aria-label={`${title} — ${idx + 1}/${seeds.length}`}
                  className={clsx("block w-full text-left cursor-zoom-in", row.length === 1 ? "aspect-[3/2]" : "aspect-[4/5]")}
                >
                  <Photo src={srcs?.[idx]} seed={seeds[idx]} sizes={row.length === 1 ? "100vw" : row.length === 2 ? "50vw" : "(min-width:1024px) 33vw, 50vw"} className="h-full w-full" />
                </button>
              </Reveal>
            ))}
          </div>
        ))}
      </div>

      {/* Darkroom */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          "fixed inset-0 z-[60] bg-dark text-on-dark flex flex-col transition-opacity duration-500 ease-out-soft",
          open === null ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
        onPointerDown={(e) => setDragX(e.clientX)}
        onPointerUp={(e) => {
          if (dragX === null) return;
          const dx = e.clientX - dragX;
          setDragX(null);
          if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
        }}
      >
        <div className="flex items-center justify-between gutter h-[64px] t-mono text-on-dark-mute">
          <span>{title}</span>
          <span>{open !== null ? `${String(open + 1).padStart(2, "0")} / ${String(seeds.length).padStart(2, "0")}` : ""}</span>
          <button type="button" onClick={close} className="link text-on-dark">Close</button>
        </div>
        <div className="relative flex-1 min-h-0 gutter pb-6 select-none">
          {open !== null && (
            <Photo key={seeds[open]} src={srcs?.[open]} seed={seeds[open]} sizes="100vw" className="h-full w-full !overflow-visible bg-transparent [&_img]:!object-contain" />
          )}
          <button type="button" aria-label="Previous" onClick={() => step(-1)} className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize" />
          <button type="button" aria-label="Next" onClick={() => step(1)} className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize" />
        </div>
      </div>
    </>
  );
}
