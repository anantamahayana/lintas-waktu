import { useState, type CSSProperties } from "react";
import type { Spread } from "../lib/export";
import { boxToMm, frameRectMm } from "../lib/frames";
import { Icon } from "../lib/icons";
import type { LaidPage } from "../lib/layout";
import { pageBgRectMm } from "../lib/paint";
import type { Photo } from "../lib/photos";
import { CENTER, spreadMm, type Placement, type Preset, type Rect } from "../lib/print";

const pct = (n: number) => `${n * 100}%`;

/** A small, non-interactive picture of one spread (filmstrip, overview, export preview). */
export function MiniSheet({ sp, preset, byId, place }: { sp: Spread; preset: Preset; byId: Map<string, Photo>; place: Record<string, Placement> }) {
  const sheet = spreadMm(preset);
  const box = (r: Rect): CSSProperties => ({ left: pct(r.x / sheet.w), top: pct(r.y / sheet.h), width: pct(r.w / sheet.w), height: pct(r.h / sheet.h) });
  const pages = [sp.left, sp.right].filter((p): p is LaidPage => !!p && p.side !== "tail");
  return (
    <div className="minisheet" style={{ aspectRatio: `${sheet.w} / ${sheet.h}`, background: preset.bg }}>
      {pages.filter((pg) => pg.cfg.bg).map((pg) => <div key={`b${pg.index}`} className="pagebg" style={{ ...box(pageBgRectMm(preset, pg.side as 0 | 1 | "both")), background: pg.cfg.bg }} />)}
      {pages.map((pg) => pg.tpl && pg.ids.map((id, k) => {
        const ph = byId.get(id), pl = place[id] ?? CENTER, pos = `${pl.x * 100}% ${pl.y * 100}%`;
        return (
          <div key={id} className="minicell" style={box(frameRectMm(preset, pg, k))}>
            {ph?.thumb && <img src={ph.thumb} alt="" loading="lazy" draggable={false} style={{ objectPosition: pos, transformOrigin: pos, transform: `scale(${pl.z})` }} />}
          </div>
        );
      }))}
      {pages.map((pg) => (pg.cfg.texts ?? []).map((t) => <div key={t.id} className="minitext" style={box(boxToMm(preset, pg.side as 0 | 1 | "both", t))} />))}
      <div className="fold" />
    </div>
  );
}

type Props = {
  spreads: Spread[];
  preset: Preset;
  byId: Map<string, Photo>;
  place: Record<string, Placement>;
  current: number;
  warnPages: Set<number>;
  onOpen: (i: number) => void;
  onMove: (from: number, to: number) => void;
};

/** Every spread at a glance (G), to read the album as a story and drag spreads into a new order. */
export function Overview({ spreads, preset, byId, place, current, warnPages, onOpen, onMove }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className="overview">
      <div className="ov-grid">
        {spreads.map((sp, i) => {
          const notes = [sp.left, sp.right].filter((x) => x?.cfg.note);
          const warn = warnPages.has(i * 2 + 1) || warnPages.has(i * 2 + 2);
          return (
            <button key={i} type="button" className={`ov-item ${i === current ? "cur" : ""} ${over === i && dragging !== null && dragging !== i ? "drop" : ""}`}
              draggable onClick={() => onOpen(i)}
              onDragStart={(e) => { setDragging(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", `spread:${i}`); }}
              onDragEnd={() => { setDragging(null); setOver(null); }}
              onDragOver={(e) => { e.preventDefault(); setOver(i); }}
              onDrop={(e) => { e.preventDefault(); if (dragging !== null && dragging !== i) onMove(dragging, i); setDragging(null); setOver(null); }}>
              <MiniSheet sp={sp} preset={preset} byId={byId} place={place} />
              <span className="ov-meta">
                <span className="grow">Hal. {i * 2 + 1}–{i * 2 + 2}{sp.left?.side === "both" ? " · panorama" : ""}</span>
                {warn && <span className="warn-text"><Icon name="triangle-alert" size={12} />dpi rendah</span>}
                {notes.map((x) => <span key={x!.index} className={x!.cfg.noteDone ? "ov-note done" : "ov-note"} title={x!.cfg.note}><Icon name="message-square" size={11} />{x!.cfg.note}</span>)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
