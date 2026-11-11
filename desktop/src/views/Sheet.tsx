import { useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import type { Spread } from "../lib/export";
import { boxToMm, currentBoxes, frameRectMm, mmToBox } from "../lib/frames";
import { isEmpty, snap, type Box, type LaidPage, type TextBox } from "../lib/layout";
import { LINE, pageBgRectMm } from "../lib/paint";
import type { Photo } from "../lib/photos";
import { CENTER, pageBoxMm, spreadMm, type Placement, type Preset, type Rect } from "../lib/print";

export type TextSel = { page: number; id: string } | null;
type Side = 0 | 1 | "both";
type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type Props = {
  spread: Spread;
  preset: Preset;
  byId: Map<string, Photo>;
  place: Record<string, Placement>;
  sel: string;
  selText: TextSel;
  guides: boolean;
  onSelectPhoto: (id: string) => void;
  onSelectText: (t: TextSel) => void;
  onDrop: (onto: string, dragged: string) => void;
  /** Hand-placed frames for a page; `replace` folds the steps of one drag into a single undo. */
  onFrames: (page: number, boxes: Box[], replace: boolean) => void;
  onText: (page: number, id: string, patch: Partial<TextBox>, replace: boolean) => void;
  onEditText: (t: TextSel) => void;
};

const pct = (n: number) => `${n * 100}%`;
const SNAP_MM = 2;

/** One sheet of the album, editable: photos in frames, frames and text that can be moved and resized. */
export function Sheet({ spread, preset, byId, place, sel, selText, guides, onSelectPhoto, onSelectText, onDrop, onFrames, onText, onEditText }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const sheet = spreadMm(preset);
  const [lines, setLines] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const drag = useRef<{ pg: LaidPage; k: number; text?: string; handle: Handle; start: { x: number; y: number }; rect: Rect; boxes: Box[]; moved: boolean } | null>(null);

  const box = (r: Rect): CSSProperties => ({ left: pct(r.x / sheet.w), top: pct(r.y / sheet.h), width: pct(r.w / sheet.w), height: pct(r.h / sheet.h) });
  const mmPerPx = () => sheet.w / (ref.current?.getBoundingClientRect().width || 1);
  const pages = [spread.left, spread.right].filter((p): p is LaidPage => !!p && p.side !== "tail");

  /** Lines a frame edge can snap to on its page: trim edges, centre, margins, safe area, other frames. */
  const guidesFor = (pg: LaidPage, skip: number, textId?: string) => {
    const t = pageBoxMm(preset, pg.side as Side), m = (preset.marginPct / 100) * preset.pageWmm;
    const xs = [t.x, t.x + t.w, t.x + t.w / 2, t.x + m, t.x + t.w - m, t.x + preset.safeMm, t.x + t.w - preset.safeMm];
    const ys = [t.y, t.y + t.h, t.y + t.h / 2, t.y + m, t.y + t.h - m, t.y + preset.safeMm, t.y + t.h - preset.safeMm];
    if (pg.side === "both") xs.push(t.x + t.w / 4, t.x + (3 * t.w) / 4);
    pg.ids.forEach((_, k) => {
      if (k === skip && !textId) return;
      const r = frameRectMm(preset, pg, k);
      xs.push(r.x, r.x + r.w); ys.push(r.y, r.y + r.h);
    });
    return { xs, ys };
  };

  const begin = (e: PE, pg: LaidPage, k: number, handle: Handle, text?: TextBox) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const rect = text ? boxToMm(preset, pg.side as Side, text) : frameRectMm(preset, pg, k);
    drag.current = { pg, k, text: text?.id, handle, start: { x: e.clientX, y: e.clientY }, rect, boxes: currentBoxes(preset, pg), moved: false };
  };

  const move = (e: PE) => {
    const d = drag.current;
    if (!d) return;
    const s = mmPerPx(), dx = (e.clientX - d.start.x) * s, dy = (e.clientY - d.start.y) * s;
    if (!d.moved && Math.hypot(dx, dy) < 0.8) return;
    const r = { ...d.rect }, h = d.handle, free = !e.altKey;
    const g = free ? guidesFor(d.pg, d.k, d.text) : { xs: [], ys: [] };
    const hit = { x: [] as number[], y: [] as number[] };
    const sx = (v: number) => { const o = snap(v, g.xs, SNAP_MM); if (o.at !== null) hit.x.push(o.at); return o.v; };
    const sy = (v: number) => { const o = snap(v, g.ys, SNAP_MM); if (o.at !== null) hit.y.push(o.at); return o.v; };
    if (h === "move") {
      let x = d.rect.x + dx, y = d.rect.y + dy;
      // Snap whichever edge (or the centre) is closest to a guide.
      const cx = [x, x + r.w / 2, x + r.w].map((v, i) => ({ i, o: snap(v, g.xs, SNAP_MM) })).filter((c) => c.o.at !== null)
        .sort((a, b) => Math.abs(a.o.v - [x, x + r.w / 2, x + r.w][a.i]) - Math.abs(b.o.v - [x, x + r.w / 2, x + r.w][b.i]))[0];
      if (cx) { x = cx.o.v - [0, r.w / 2, r.w][cx.i]; hit.x.push(cx.o.v); }
      const cy = [y, y + r.h / 2, y + r.h].map((v, i) => ({ i, o: snap(v, g.ys, SNAP_MM) })).filter((c) => c.o.at !== null)
        .sort((a, b) => Math.abs(a.o.v - [y, y + r.h / 2, y + r.h][a.i]) - Math.abs(b.o.v - [y, y + r.h / 2, y + r.h][b.i]))[0];
      if (cy) { y = cy.o.v - [0, r.h / 2, r.h][cy.i]; hit.y.push(cy.o.v); }
      r.x = x; r.y = y;
    } else {
      let x1 = d.rect.x, y1 = d.rect.y, x2 = d.rect.x + d.rect.w, y2 = d.rect.y + d.rect.h;
      if (h.includes("w")) x1 = sx(x1 + dx);
      if (h.includes("e")) x2 = sx(x2 + dx);
      if (h.includes("n")) y1 = sy(y1 + dy);
      if (h.includes("s")) y2 = sy(y2 + dy);
      // Shift on a corner keeps the frame's shape.
      if (e.shiftKey && h.length === 2) {
        const ratio = d.rect.w / d.rect.h, w = Math.max(5, x2 - x1);
        const hh = w / ratio;
        if (h.includes("n")) y1 = y2 - hh; else y2 = y1 + hh;
      }
      r.x = Math.min(x1, x2 - 5); r.y = Math.min(y1, y2 - 5);
      r.w = Math.max(5, x2 - x1); r.h = Math.max(5, y2 - y1);
    }
    setLines(hit);
    const b = mmToBox(preset, d.pg.side as Side, r);
    if (d.text) onText(d.pg.index, d.text, { x: b.x, y: b.y, w: b.w, h: b.h }, d.moved);
    else onFrames(d.pg.index, d.boxes.map((x, j) => (j === d.k ? b : x)), d.moved);
    d.moved = true;
  };

  const end = () => { drag.current = null; setLines({ x: [], y: [] }); };

  const handles = (pg: LaidPage, k: number, text?: TextBox) => (
    <>
      <button type="button" className="grip" aria-label="Geser" title="Seret untuk menggeser (Alt: tanpa magnet)" onPointerDown={(e) => begin(e, pg, k, "move", text)} />
      {(text ? (["e", "w"] as Handle[]) : (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as Handle[])).map((h) => (
        <span key={h} className={`hd hd-${h}`} onPointerDown={(e) => begin(e, pg, k, h, text)} />
      ))}
    </>
  );

  const frame = (pg: LaidPage, k: number) => {
    const id = pg.ids[k], ph = byId.get(id), pl = place[id] ?? CENTER;
    const r = frameRectMm(preset, pg, k), selected = sel === id;
    const pos = `${pl.x * 100}% ${pl.y * 100}%`;
    const stroke = pg.cfg.stroke && pg.cfg.stroke.mm > 0 ? { boxShadow: `inset 0 0 0 ${(pg.cfg.stroke.mm / sheet.w) * 100}cqw ${pg.cfg.stroke.color}` } : undefined;
    return (
      <div key={id} className={`frame ${selected ? "on" : ""}`} style={box(r)}>
        <button type="button" className={ph ? "cell" : "cell blank"} style={stroke} aria-pressed={selected}
          aria-label={ph ? `Foto ${ph.name}` : `Bingkai kosong`} draggable={!!ph}
          onClick={(e) => { e.stopPropagation(); onSelectPhoto(id); }}
          onDragStart={(e) => { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onDrop(id, e.dataTransfer.getData("text/plain")); }}>
          {ph?.thumb && <img src={ph.thumb} alt="" draggable={false} style={{ objectPosition: pos, transformOrigin: pos, transform: `scale(${pl.z})` }} />}
          {!ph && <span>{isEmpty(id) ? "Seret foto ke sini" : "Foto tidak ditemukan"}</span>}
        </button>
        {selected && handles(pg, k)}
      </div>
    );
  };

  const text = (pg: LaidPage, t: TextBox) => {
    const r = boxToMm(preset, pg.side as Side, t), on = selText?.page === pg.index && selText.id === t.id;
    return (
      <div key={t.id} className={`textbox ${on ? "on" : ""}`} style={{ ...box(r), height: "auto", minHeight: pct(r.h / sheet.h) }}
        onClick={(e) => { e.stopPropagation(); onSelectText({ page: pg.index, id: t.id }); }}
        onDoubleClick={(e) => { e.stopPropagation(); onEditText({ page: pg.index, id: t.id }); }}>
        <div className="textbody" style={{
          fontFamily: `"${t.font}", serif`, fontWeight: t.bold ? 700 : 400, fontStyle: t.italic ? "italic" : "normal",
          fontSize: `${(t.sizeMm / sheet.w) * 100}cqw`, lineHeight: LINE, letterSpacing: `${t.tracking ?? 0}em`, color: t.color, textAlign: t.align,
        }}>{t.text || " "}</div>
        {on && handles(pg, -1, t)}
      </div>
    );
  };

  return (
    <div ref={ref} className="sheet" style={{ aspectRatio: `${sheet.w} / ${sheet.h}`, background: preset.bg }}
      onClick={(e) => { if (e.target === e.currentTarget) { onSelectPhoto(""); onSelectText(null); } }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      {pages.filter((pg) => pg.cfg.bg).map((pg) => <div key={`bg${pg.index}`} className="pagebg" style={{ ...box(pageBgRectMm(preset, pg.side as Side)), background: pg.cfg.bg }} />)}
      {pages.map((pg) => pg.tpl && pg.ids.map((_, k) => frame(pg, k)))}
      {pages.map((pg) => (pg.cfg.texts ?? []).map((t) => text(pg, t)))}
      {guides && (
        <>
          <div className="trim" style={{ inset: `${pct(preset.bleedMm / sheet.h)} ${pct(preset.bleedMm / sheet.w)}` }} />
          <div className="fold" />
          {[0, 1].map((side) => (
            <div key={side} className="safe" style={{
              left: pct((preset.bleedMm + side * preset.pageWmm + preset.safeMm) / sheet.w), top: pct((preset.bleedMm + preset.safeMm) / sheet.h),
              width: pct((preset.pageWmm - 2 * preset.safeMm) / sheet.w), height: pct((preset.pageHmm - 2 * preset.safeMm) / sheet.h),
            }} />
          ))}
        </>
      )}
      {lines.x.map((x, i) => <div key={`gx${i}`} className="snapline v" style={{ left: pct(x / sheet.w) }} />)}
      {lines.y.map((y, i) => <div key={`gy${i}`} className="snapline h" style={{ top: pct(y / sheet.h) }} />)}
    </div>
  );
}
