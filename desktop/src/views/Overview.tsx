import { useState, type CSSProperties } from "react";
import type { Spread } from "../lib/export";
import { boxToMm, frameRectMm } from "../lib/frames";
import type { LaidPage } from "../lib/layout";
import { pageBgRectMm } from "../lib/paint";
import type { Photo } from "../lib/photos";
import { CENTER, spreadMm, type Placement, type Preset, type Rect } from "../lib/print";

type Props = {
  spreads: Spread[];
  pages: LaidPage[];
  preset: Preset;
  byId: Map<string, Photo>;
  place: Record<string, Placement>;
  current: number;
  onOpen: (i: number) => void;
  onMove: (from: number, to: number) => void;
};

const pct = (n: number) => `${n * 100}%`;

/** Every spread at a glance, to read the album as a story and drag spreads into a new order. */
export function Overview({ spreads, preset, byId, place, current, onOpen, onMove }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const sheet = spreadMm(preset);
  const box = (r: Rect): CSSProperties => ({ left: pct(r.x / sheet.w), top: pct(r.y / sheet.h), width: pct(r.w / sheet.w), height: pct(r.h / sheet.h) });

  const mini = (sp: Spread) => {
    const pages = [sp.left, sp.right].filter((p): p is LaidPage => !!p && p.side !== "tail");
    return (
      <div className="minisheet" style={{ aspectRatio: `${sheet.w} / ${sheet.h}`, background: preset.bg }}>
        {pages.filter((pg) => pg.cfg.bg).map((pg) => <div key={`b${pg.index}`} className="pagebg" style={{ ...box(pageBgRectMm(preset, pg.side as 0 | 1 | "both")), background: pg.cfg.bg }} />)}
        {pages.map((pg) => pg.tpl && pg.ids.map((id, k) => {
          const ph = byId.get(id), pl = place[id] ?? CENTER, pos = `${pl.x * 100}% ${pl.y * 100}%`;
          return (
            <div key={id} className="minicell" style={box(frameRectMm(preset, pg, k))}>
              {ph?.thumb && <img src={ph.thumb} alt="" loading="lazy" style={{ objectPosition: pos, transformOrigin: pos, transform: `scale(${pl.z})` }} />}
            </div>
          );
        }))}
        {pages.map((pg) => (pg.cfg.texts ?? []).map((t) => <div key={t.id} className="minitext" style={box(boxToMm(preset, pg.side as 0 | 1 | "both", t))} />))}
        <div className="fold" />
      </div>
    );
  };

  return (
    <div className="overview">
      <p className="dim">Klik spread untuk membukanya. Seret spread untuk mengubah urutan; foto, teks, dan tata letaknya ikut pindah.</p>
      <div className="ov-grid">
        {spreads.map((sp, i) => (
          <button key={i} type="button" className={`ov-item ${i === current ? "cur" : ""} ${over === i && dragging !== null && dragging !== i ? "drop" : ""}`}
            draggable onClick={() => onOpen(i)}
            onDragStart={(e) => { setDragging(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", `spread:${i}`); }}
            onDragEnd={() => { setDragging(null); setOver(null); }}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDrop={(e) => { e.preventDefault(); if (dragging !== null && dragging !== i) onMove(dragging, i); setDragging(null); setOver(null); }}>
            {mini(sp)}
            <span className="ov-label">{i * 2 + 1}–{i * 2 + 2}{sp.left?.side === "both" ? " · sambung" : ""}</span>
            {[sp.left, sp.right].map((x) => x?.cfg.note && <span key={x.index} className={x.cfg.noteDone ? "ov-note done" : "ov-note"}>{x.cfg.noteDone ? "✓ " : ""}{x.cfg.note}</span>)}
          </button>
        ))}
      </div>
    </div>
  );
}
