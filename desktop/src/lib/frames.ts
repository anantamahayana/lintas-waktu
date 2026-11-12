import type { Box, LaidPage } from "./layout";
import { cellRectMm, pageBoxMm, type Preset, type Rect } from "./print";

type Side = 0 | 1 | "both";
const sideOf = (pg: LaidPage) => pg.side as Side;

/** Where frame `k` of a page sits on the sheet, in mm: hand-placed if the page has its own frames, else from the template. */
export function frameRectMm(p: Preset, pg: LaidPage, k: number): Rect {
  const free = pg.cfg.free;
  if (free && free.length === pg.ids.length) return boxToMm(p, sideOf(pg), free[k]);
  return cellRectMm(p, sideOf(pg), pg.tpl!.cols, pg.tpl!.rows, pg.tpl!.cells[k]);
}

export function boxToMm(p: Preset, side: Side, b: Box): Rect {
  const t = pageBoxMm(p, side);
  return { x: t.x + b.x * t.w, y: t.y + b.y * t.h, w: b.w * t.w, h: b.h * t.h };
}

export function mmToBox(p: Preset, side: Side, r: Rect): Box {
  const t = pageBoxMm(p, side);
  return { x: (r.x - t.x) / t.w, y: (r.y - t.y) / t.h, w: r.w / t.w, h: r.h / t.h };
}

/** The page's current frames as hand-placed boxes (the starting point for moving one by hand). */
export function currentBoxes(p: Preset, pg: LaidPage): Box[] {
  return pg.ids.map((_, k) => mmToBox(p, sideOf(pg), frameRectMm(p, pg, k)));
}
