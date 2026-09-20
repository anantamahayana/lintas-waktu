"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { gapi, type GPhoto } from "@/lib/gallery-api";

/**
 * Album preview — the client's picks laid out as spreads of a book they can leaf
 * through. Pure client-side: no upload, no server, just their thumbnails placed
 * into a few classic album layouts, with a 3D page turn. It is an impression,
 * not the final design (the caption says so).
 */
export type AlbumStrings = {
  title: string; sub: (n: number) => string; cover: string; end: string; endBody: string; close: string; shuffle: string;
  page: (a: number, b: number, n: number) => string; hint: string;
};

type Cell = { p: GPhoto; x: number; y: number; w: number; h: number };
type Page = { cells: Cell[] };
type Spread = { left: Page; right: Page; kind: "cover" | "spread" | "end" };

const wide = (p: GPhoto) => p.width >= p.height;

/** Seeded shuffle so "shuffle layout" gives a new but stable arrangement. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Build pages from an ordered list. Each page takes 1–3 photos; templates are
 * chosen by orientation so portraits stand and landscapes lie. Margins are in
 * percent of the page.
 */
function layoutPages(photos: GPhoto[], seed: number): Page[] {
  const r = rng(seed);
  const pages: Page[] = [];
  const M = 6; // outer margin %
  const G = 3; // gutter %
  let i = 0;
  while (i < photos.length) {
    const a = photos[i], b = photos[i + 1], c = photos[i + 2];
    const roll = r();
    // full-bleed single (bigger chance for a landscape)
    if (!b || roll < (wide(a) ? 0.42 : 0.28)) {
      const bleed = r() < 0.5;
      pages.push({ cells: bleed ? [{ p: a, x: 0, y: 0, w: 100, h: 100 }] : [{ p: a, x: M, y: M, w: 100 - 2 * M, h: 100 - 2 * M }] });
      i += 1;
      continue;
    }
    // two: side by side for portraits, stacked for landscapes
    if (!c || roll < 0.78) {
      if (!wide(a) && !wide(b)) {
        const w = (100 - 2 * M - G) / 2;
        pages.push({ cells: [{ p: a, x: M, y: M, w, h: 100 - 2 * M }, { p: b, x: M + w + G, y: M, w, h: 100 - 2 * M }] });
      } else {
        const h = (100 - 2 * M - G) / 2;
        pages.push({ cells: [{ p: a, x: M, y: M, w: 100 - 2 * M, h }, { p: b, x: M, y: M + h + G, w: 100 - 2 * M, h }] });
      }
      i += 2;
      continue;
    }
    // three: one tall + two small, or one wide + two below
    const heroFirst = wide(a) ? r() < 0.5 : true;
    if (heroFirst && !wide(a)) {
      const w1 = (100 - 2 * M - G) * 0.58, w2 = 100 - 2 * M - G - w1, h2 = (100 - 2 * M - G) / 2;
      pages.push({ cells: [{ p: a, x: M, y: M, w: w1, h: 100 - 2 * M }, { p: b, x: M + w1 + G, y: M, w: w2, h: h2 }, { p: c, x: M + w1 + G, y: M + h2 + G, w: w2, h: h2 }] });
    } else {
      const h1 = (100 - 2 * M - G) * 0.6, h2 = 100 - 2 * M - G - h1, w2 = (100 - 2 * M - G) / 2;
      pages.push({ cells: [{ p: a, x: M, y: M, w: 100 - 2 * M, h: h1 }, { p: b, x: M, y: M + h1 + G, w: w2, h: h2 }, { p: c, x: M + w2 + G, y: M + h1 + G, w: w2, h: h2 }] });
    }
    i += 3;
  }
  return pages;
}

function buildSpreads(photos: GPhoto[], seed: number): Spread[] {
  const pages = layoutPages(photos, seed);
  const empty: Page = { cells: [] };
  const out: Spread[] = [{ left: empty, right: { cells: photos[0] ? [{ p: photos[0], x: 0, y: 0, w: 100, h: 100 }] : [] }, kind: "cover" }];
  for (let i = 0; i < pages.length; i += 2) out.push({ left: pages[i], right: pages[i + 1] ?? empty, kind: "spread" });
  out.push({ left: empty, right: empty, kind: "end" });
  return out;
}

export function AlbumPreview({ photos, clientName, studio, onClose, t }: { photos: GPhoto[]; clientName: string; studio: string; onClose: () => void; t: AlbumStrings }) {
  const [seed, setSeed] = useState(7);
  const [idx, setIdx] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const [visible, setVisible] = useState(false);
  const spreads = useMemo(() => buildSpreads(photos, seed), [photos, seed]);
  const total = spreads.length;
  const touch = useRef<number | null>(null);

  useEffect(() => { const h = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(h); }, []);
  const go = useCallback((d: 1 | -1) => {
    if (turning) return;
    const next = idx + d;
    if (next < 0 || next >= total) return;
    setTurning(d === 1 ? "next" : "prev");
    setTimeout(() => { setIdx(next); setTurning(null); }, 620);
  }, [idx, total, turning]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [go, onClose]);
  // preload the next spread's thumbnails
  useEffect(() => {
    const s = spreads[idx + 1];
    s?.left.cells.concat(s.right.cells).forEach((c) => { const im = new Image(); im.src = gapi.img(c.w >= 50 ? c.p.full_url : c.p.thumb_url); });
  }, [idx, spreads]);

  const cur = spreads[idx];
  const pageNo = idx === 0 ? 0 : (idx - 1) * 2 + 1;

  return (
    <div
      className={clsx("fixed inset-0 z-[70] bg-[#1c1b19] text-on-dark flex flex-col transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}
    >
      <div className="flex items-center justify-between px-5 h-14 t-mono text-on-dark-mute shrink-0">
        <button type="button" onClick={onClose} className="text-on-dark">✕ {t.close}</button>
        <span className="hidden sm:block">{t.title} · {t.sub(photos.length)}</span>
        <button type="button" onClick={() => { setSeed((s) => s + 1); setIdx(0); }} className="text-on-dark-mute hover:text-on-dark">{t.shuffle}</button>
      </div>

      {/* The book */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-3 sm:px-10" style={{ perspective: "2200px" }}>
        <div className={clsx("relative aspect-[2/1.35] w-full max-w-[1100px] max-h-full transition-transform duration-700 ease-out-soft", visible ? "scale-100" : "scale-[0.96]")} style={{ transformStyle: "preserve-3d" }}>
          <Sheet page={cur.left} side="left" kind={cur.kind} clientName={clientName} studio={studio} t={t} />
          <Sheet page={cur.right} side="right" kind={cur.kind} clientName={clientName} studio={studio} t={t} />
          {/* turning leaf: the outgoing right page folds over to the left (or back) */}
          {turning && (
            <div
              className={clsx("absolute top-0 bottom-0 w-1/2 album-leaf", turning === "next" ? "left-1/2 origin-left album-turn-next" : "left-0 origin-right album-turn-prev")}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 [backface-visibility:hidden]">
                <Sheet page={turning === "next" ? cur.right : cur.left} side={turning === "next" ? "right" : "left"} kind={cur.kind} clientName={clientName} studio={studio} t={t} flat />
              </div>
              <div className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                <Sheet page={turning === "next" ? spreads[idx + 1].left : spreads[idx - 1].right} side={turning === "next" ? "left" : "right"} kind={turning === "next" ? spreads[idx + 1].kind : spreads[idx - 1].kind} clientName={clientName} studio={studio} t={t} flat />
              </div>
            </div>
          )}
          {/* spine shadow */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-16 -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/25 to-black/0" />
        </div>
        <button type="button" aria-label="prev" onClick={() => go(-1)} disabled={idx === 0} className="absolute inset-y-0 left-0 w-1/5 disabled:cursor-default" />
        <button type="button" aria-label="next" onClick={() => go(1)} disabled={idx === total - 1} className="absolute inset-y-0 right-0 w-1/5 disabled:cursor-default" />
      </div>

      <div className="shrink-0 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 flex flex-col items-center gap-2 t-mono text-on-dark-mute">
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => go(-1)} disabled={idx === 0} className="disabled:opacity-30 text-on-dark">←</button>
          <span>{cur.kind === "cover" ? t.cover : cur.kind === "end" ? t.end : t.page(pageNo, Math.min(pageNo + 1, (total - 2) * 2), (total - 2) * 2)}</span>
          <button type="button" onClick={() => go(1)} disabled={idx === total - 1} className="disabled:opacity-30 text-on-dark">→</button>
        </div>
        <span className="text-center max-w-[52ch] opacity-70">{t.hint}</span>
      </div>
    </div>
  );
}

function Sheet({ page, side, kind, clientName, studio, t, flat }: { page: Page; side: "left" | "right"; kind: Spread["kind"]; clientName: string; studio: string; t: AlbumStrings; flat?: boolean }) {
  const isCover = kind === "cover" && side === "right";
  const isEnd = kind === "end";
  if (kind === "cover" && side === "left") return null; // a closed book shows only its front
  return (
    <div className={clsx(!flat && "absolute top-0 bottom-0 w-1/2", flat && "absolute inset-0", side === "left" ? "left-0" : "left-1/2", "bg-[#f7f5f0] overflow-hidden", side === "left" ? "rounded-l-[3px]" : "rounded-r-[3px]", "shadow-[0_30px_60px_-30px_rgba(0,0,0,.8)]")}>
      {/* paper grain + inner shadow near the spine */}
      <div className={clsx("pointer-events-none absolute inset-y-0 w-10 z-10", side === "left" ? "right-0 bg-gradient-to-l from-black/10 to-transparent" : "left-0 bg-gradient-to-r from-black/10 to-transparent")} />

      {isCover ? (
        <div className="absolute inset-0 bg-[#2a2926]">
          {page.cells[0] && <img src={gapi.img(page.cells[0].p.full_url)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-[12%] flex flex-col items-center gap-2 text-center px-6">
            <span className="font-serif italic text-on-dark text-[clamp(18px,3.2vw,38px)] leading-tight">{clientName}</span>
            <span className="t-mono text-on-dark/70">{studio}</span>
          </div>
        </div>
      ) : isEnd ? (
        side === "right" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 text-ink">
            <span className="font-serif italic text-[clamp(16px,2.6vw,30px)] leading-tight">{t.end}</span>
            <span className="t-small text-mute max-w-[30ch]">{t.endBody}</span>
          </div>
        ) : null
      ) : (
        page.cells.map((c, i) => (
          <div key={c.p.file_id + i} className="absolute overflow-hidden bg-line album-cell" style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%`, animationDelay: `${i * 90}ms` }}>
            <img src={gapi.img(c.w >= 50 ? c.p.full_url : c.p.thumb_url)} alt="" className="h-full w-full object-cover" draggable={false} />
          </div>
        ))
      )}
    </div>
  );
}
