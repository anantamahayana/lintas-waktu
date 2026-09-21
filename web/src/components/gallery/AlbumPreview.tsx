"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
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

/** Landscape album: each page is 1.3 : 1 (a 13×10 book), so a spread is 2.6 : 1 (see aspect-[2.6/1]). */
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
  const M = 7; // outer margin %
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
    // two — the page is landscape (1.3 : 1), so:
    //   portraits stand side by side; two landscapes stack, narrowed so they keep a ~3:2 feel
    if (!c || roll < 0.78) {
      if (!wide(a) && !wide(b)) {
        const w = (100 - 2 * M - G) / 2;
        pages.push({ cells: [{ p: a, x: M, y: M, w, h: 100 - 2 * M }, { p: b, x: M + w + G, y: M, w, h: 100 - 2 * M }] });
      } else if (wide(a) && wide(b)) {
        const h = (100 - 2 * M - G) / 2, w = 64;
        pages.push({ cells: [{ p: a, x: (100 - w) / 2, y: M, w, h }, { p: b, x: (100 - w) / 2, y: M + h + G, w, h }] });
      } else {
        // one of each: the landscape takes the wider column
        const [l, pt] = wide(a) ? [a, b] : [b, a];
        const wl = (100 - 2 * M - G) * 0.6, wp = 100 - 2 * M - G - wl;
        pages.push({ cells: [{ p: l, x: M, y: M, w: wl, h: 100 - 2 * M }, { p: pt, x: M + wl + G, y: M, w: wp, h: 100 - 2 * M }] });
      }
      i += 2;
      continue;
    }
    // three on a landscape page: a hero on the left, two stacked on the right
    // (a landscape hero gets the wider column; a portrait hero a narrower one)
    const w1 = (100 - 2 * M - G) * (wide(a) ? 0.62 : 0.46), w2 = 100 - 2 * M - G - w1, h2 = (100 - 2 * M - G) / 2;
    pages.push({ cells: [{ p: a, x: M, y: M, w: w1, h: 100 - 2 * M }, { p: b, x: M + w1 + G, y: M, w: w2, h: h2 }, { p: c, x: M + w1 + G, y: M + h2 + G, w: w2, h: h2 }] });
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
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState(true);
  const spreads = useMemo(() => buildSpreads(photos, seed), [photos, seed]);
  const total = spreads.length;

  /* ---- page turn ----
     React only knows *that* a turn is happening (and which way). The progress itself
     lives in a CSS variable (--p, 0 → 1) on the book: dragging writes it straight to
     the DOM (no re-render per frame), releasing hands it to a CSS transition of --p
     (registered with @property in globals.css). Leaf angle, its shading and the
     shadow it casts are all derived from --p in CSS, so every frame is the browser's. */
  const [turn, setTurn] = useState<{ dir: 1 | -1; anim: boolean } | null>(null);
  const pending = useRef<{ target: number } | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; dir: 1 | -1; moved: boolean; p: number } | null>(null);
  const settleTimer = useRef<{ id: number | null }>({ id: null });

  useEffect(() => { const h = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(h); }, []);
  useEffect(() => { const h = setTimeout(() => bookRef.current?.classList.add("album-open"), 900); return () => clearTimeout(h); }, []);
  useEffect(() => { const h = setTimeout(() => setHint(false), 4200); return () => clearTimeout(h); }, []);

  const canGo = useCallback((d: 1 | -1) => (d === 1 ? idx < total - 1 : idx > 0), [idx, total]);
  const setP = (p: number) => bookRef.current?.style.setProperty("--p", String(p));
  const finish = useCallback((dir: 1 | -1, completed: boolean) => {
    if (settleTimer.current.id) { clearTimeout(settleTimer.current.id); settleTimer.current.id = null; }
    pending.current = null;
    setP(0);
    if (completed) setIdx((i) => i + dir);
    setTurn(null);
  }, []);
  /** Ease the leaf from its current progress to rest (0) or the far side (1). */
  const settle = useCallback((dir: 1 | -1, from: number, complete: boolean) => {
    const target = complete ? 1 : 0;
    if (Math.abs(from - target) < 0.005) { finish(dir, complete); return; }
    bookRef.current?.style.setProperty("--dir", String(dir));
    setP(from);
    pending.current = { target };
    setTurn({ dir, anim: true }); // the .album-ease class lands on commit; the effect below then moves --p
    // safety net in case transitionend never arrives (hidden tab, interrupted)
    settleTimer.current.id = window.setTimeout(() => finish(dir, complete), 950);
  }, [finish]);
  // once the easing class is on the element, change --p so the transition runs
  useEffect(() => {
    if (!turn?.anim || !pending.current) return;
    const el = bookRef.current;
    if (!el) return;
    void el.offsetWidth; // flush the class change so the value change below transitions
    setP(pending.current.target);
  }, [turn]);
  const go = useCallback((d: 1 | -1) => { if (turn || !canGo(d)) return; setHint(false); settle(d, 0, true); }, [turn, canGo, settle]);
  const onBookTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target !== e.currentTarget || e.propertyName !== "--p") return;
    if (!turn) return;
    const p = Number(bookRef.current?.style.getPropertyValue("--p") || 0);
    finish(turn.dir, p >= 0.999);
  };

  // pointer: press on a page half and pull it across; release past 35% to complete
  const onDown = (e: React.PointerEvent) => {
    if (turn) return;
    const box = bookRef.current?.getBoundingClientRect();
    if (!box) return;
    const dir: 1 | -1 = e.clientX > box.left + box.width / 2 ? 1 : -1;
    if (!canGo(dir)) return;
    drag.current = { x: e.clientX, dir, moved: false, p: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current, box = bookRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = (e.clientX - d.x) * -d.dir; // positive = pulling in the turning direction
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      setHint(false);
      bookRef.current?.style.setProperty("--dir", String(d.dir));
      setTurn({ dir: d.dir, anim: false }); // mounts the leaf; progress comes from --p
    }
    d.p = Math.max(0, Math.min(1, dx / (box.width * 0.9)));
    setP(d.p);
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (!d || !d.moved) return; // a tap: handled by the arrows / corners
    settle(d.dir, d.p, d.p > 0.35);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [go, onClose]);
  // preload neighbouring spreads
  useEffect(() => {
    [spreads[idx + 1], spreads[idx - 1]].forEach((sp) => sp?.left.cells.concat(sp.right.cells).forEach((c) => { const im = new Image(); im.src = gapi.img(c.w >= 50 ? c.p.full_url : c.p.thumb_url); }));
  }, [idx, spreads]);

  const cur = spreads[idx];
  const nxt = spreads[idx + 1], prv = spreads[idx - 1];
  const pages = (total - 2) * 2;
  const pageNo = idx === 0 ? 0 : (idx - 1) * 2 + 1;
  const label = cur.kind === "cover" ? t.cover : cur.kind === "end" ? t.end : t.page(pageNo, Math.min(pageNo + 1, pages), pages);
  const sheetProps = { clientName, studio, t };

  // what lies under the moving leaf: the destination spread's page on that side
  const underRight = turn?.dir === 1 ? nxt?.right : cur.right;
  const underLeft = turn?.dir === -1 ? prv?.left : cur.left;
  const underKindR = turn?.dir === 1 ? nxt?.kind : cur.kind;
  const underKindL = turn?.dir === -1 ? prv?.kind : cur.kind;

  return (
    <div className={clsx("fixed inset-0 z-[70] bg-[#161513] text-on-dark flex flex-col select-none transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")}>
      <div className="flex items-center justify-between px-5 sm:px-8 h-16 shrink-0">
        <button type="button" onClick={onClose} className="t-mono text-on-dark flex items-center gap-2 h-10 px-3 -ml-3 rounded-full hover:bg-white/10 transition-colors">✕ {t.close}</button>
        <span className="t-mono text-on-dark-mute hidden sm:block">{t.title} · {t.sub(photos.length)}</span>
        <button type="button" onClick={() => { if (!turn) { setSeed((x) => x + 1); setIdx(0); } }} className="t-mono text-on-dark-mute hover:text-on-dark h-10 px-3 -mr-3 rounded-full hover:bg-white/10 transition-colors">↻ {t.shuffle}</button>
      </div>

      {/* The book, with big arrows either side */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center gap-3 sm:gap-6 px-3 sm:px-8">
        <Arrow dir={-1} onClick={() => go(-1)} disabled={!canGo(-1) || !!turn} />
        <div className="relative flex-1 min-w-0 h-full flex items-center justify-center" style={{ perspective: "2600px" }}>
          <div
            ref={bookRef}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onTransitionEnd={onBookTransitionEnd}
            className={clsx("album-book relative aspect-[2.6/1] w-full cursor-grab active:cursor-grabbing", visible && "album-in", turn?.anim && "album-ease")}
            // fit both ways: never wider than the column, never taller than the space between header and footer
            style={{ maxWidth: "min(1240px, calc((100dvh - 200px) * 2.6))", transformStyle: "preserve-3d", touchAction: "none" }}
          >
            {/* the two resting pages (under the leaf while turning) */}
            <Sheet key={`${turn?.dir === -1 ? idx - 1 : idx}-L`} page={underLeft ?? cur.left} side="left" kind={underKindL ?? cur.kind} {...sheetProps} />
            <Sheet key={`${turn?.dir === 1 ? idx + 1 : idx}-R`} page={underRight ?? cur.right} side="right" kind={underKindR ?? cur.kind} {...sheetProps} />
            {/* shadow the leaf casts on the page it is landing on */}
            {turn && (
              <div className={clsx("pointer-events-none absolute inset-y-0 w-1/2 album-cast", turn.dir === 1 ? "left-0" : "left-1/2")} style={{ background: turn.dir === 1 ? "linear-gradient(to left, rgba(0,0,0,.45), transparent 70%)" : "linear-gradient(to right, rgba(0,0,0,.45), transparent 70%)" }} />
            )}
            {/* the leaf */}
            {turn && (
              <div
                className={clsx("album-leaf absolute top-0 bottom-0 w-1/2", turn.dir === 1 ? "left-1/2 origin-left" : "left-0 origin-right")}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-0 [backface-visibility:hidden]">
                  <Sheet page={turn.dir === 1 ? cur.right : cur.left} side={turn.dir === 1 ? "right" : "left"} kind={cur.kind} {...sheetProps} flat />
                  <div className="pointer-events-none absolute inset-0 album-shade" style={{ background: turn.dir === 1 ? "linear-gradient(to right, rgba(0,0,0,.05), rgba(0,0,0,.55))" : "linear-gradient(to left, rgba(0,0,0,.05), rgba(0,0,0,.55))" }} />
                </div>
                <div className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                  <Sheet page={turn.dir === 1 ? (nxt?.left ?? cur.left) : (prv?.right ?? cur.right)} side={turn.dir === 1 ? "left" : "right"} kind={turn.dir === 1 ? (nxt?.kind ?? cur.kind) : (prv?.kind ?? cur.kind)} {...sheetProps} flat />
                  <div className="pointer-events-none absolute inset-0 album-shade" style={{ background: turn.dir === 1 ? "linear-gradient(to left, rgba(0,0,0,.05), rgba(0,0,0,.5))" : "linear-gradient(to right, rgba(0,0,0,.05), rgba(0,0,0,.5))" }} />
                </div>
              </div>
            )}
            {/* spine */}
            {cur.kind !== "cover" && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-14 -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/30 to-black/0" />}
            {/* corner curl affordances */}
            {!turn && canGo(1) && <Corner side="right" onClick={() => go(1)} />}
            {!turn && canGo(-1) && cur.kind !== "cover" && <Corner side="left" onClick={() => go(-1)} />}
            {/* first-time hint */}
            <div className={clsx("pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700", hint ? "opacity-100" : "opacity-0")}>
              <div className="bg-black/55 backdrop-blur-[3px] text-on-dark rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl">
                <span className="album-swipe text-[20px]">☞</span>
                <span className="text-[14px]">{t.hint}</span>
              </div>
            </div>
          </div>
        </div>
        <Arrow dir={1} onClick={() => go(1)} disabled={!canGo(1) || !!turn} />
      </div>

      {/* footer: where am I */}
      <div className="shrink-0 px-6 pb-[max(22px,env(safe-area-inset-bottom))] pt-3 flex flex-col items-center gap-3">
        <span className="font-serif text-[20px] text-on-dark">{label}</span>
        <div className="flex items-center gap-1.5">
          {spreads.map((_, i) => (
            <button key={i} type="button" aria-label={`${i + 1}`} onClick={() => { if (!turn && i !== idx) settle(i > idx ? 1 : -1, 0, true); }} className={clsx("h-1.5 rounded-full transition-all duration-500", i === idx ? "w-6 bg-on-dark" : "w-1.5 bg-white/25 hover:bg-white/50")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Arrow({ dir, onClick, disabled }: { dir: 1 | -1; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      aria-label={dir === 1 ? "next" : "previous"}
      onClick={onClick}
      disabled={disabled}
      className="hidden sm:flex shrink-0 h-14 w-14 rounded-full border border-white/25 items-center justify-center text-on-dark text-[22px] transition-all duration-300 hover:bg-white hover:text-ink hover:scale-105 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-on-dark disabled:hover:scale-100"
    >
      {dir === 1 ? "→" : "←"}
    </button>
  );
}

/** A lifted page corner: a small paper curl at the outer bottom corner — the classic
 *  "there is more" cue. What shows beneath it is the next page's paper, never the
 *  table. Grows a little on hover; tapping it turns the page. */
function Corner({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const right = side === "right";
  return (
    <button type="button" aria-hidden tabIndex={-1} onClick={onClick} className={clsx("absolute bottom-0 h-14 w-14 sm:h-16 sm:w-16 group z-20", right ? "right-0" : "left-0")}>
      {/* the page beneath, revealed */}
      <span className={clsx("absolute bottom-0 h-7 w-7 sm:h-9 sm:w-9 transition-all duration-500 ease-out-soft group-hover:h-12 group-hover:w-12", right ? "right-0" : "left-0")} style={{ background: "#e8e5de", clipPath: right ? "polygon(100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 0 100%, 100% 100%)" }} />
      {/* the curled corner itself: paper front turning towards the light */}
      <span
        className={clsx("absolute bottom-0 h-7 w-7 sm:h-9 sm:w-9 transition-all duration-500 ease-out-soft group-hover:h-12 group-hover:w-12", right ? "right-0" : "left-0")}
        style={{
          background: right ? "linear-gradient(225deg, #fbfaf7 0%, #f1efe9 45%, #cfccc4 100%)" : "linear-gradient(135deg, #fbfaf7 0%, #f1efe9 45%, #cfccc4 100%)",
          clipPath: right ? "polygon(0 100%, 100% 0, 0 0)" : "polygon(100% 100%, 0 0, 100% 0)",
          filter: right ? "drop-shadow(-2px -2px 3px rgba(0,0,0,.18))" : "drop-shadow(2px -2px 3px rgba(0,0,0,.18))",
        }}
      />
    </button>
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
