import type { LaidPage, TextBox } from "./layout";
import { boxToMm } from "./frames";
import { mmToPx, pageBoxMm, type Preset, type Rect } from "./print";

type Ctx = OffscreenCanvasRenderingContext2D;
type Side = 0 | 1 | "both";

/** The page's own background, run out to the sheet's edges on its outer sides. */
export function pageBgRectMm(p: Preset, side: Side): Rect {
  const t = pageBoxMm(p, side);
  const left = side !== 1 ? 0 : t.x, right = side !== 0 ? t.x + t.w + p.bleedMm : t.x + t.w;
  return { x: left, y: 0, w: right - left, h: p.pageHmm + 2 * p.bleedMm };
}

export const fontCss = (t: Pick<TextBox, "font" | "bold" | "italic">, px: number) =>
  `${t.italic ? "italic " : ""}${t.bold ? 700 : 400} ${px}px "${t.font}", serif`;

/** Lines of `text` that fit in `width` px, breaking at spaces (and at explicit line breaks). */
export function wrap(ctx: Pick<Ctx, "measureText">, text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      const next = line + word;
      if (line && ctx.measureText(next.trimEnd()).width > width) { out.push(line.trimEnd()); line = word.trimStart(); }
      else line = next;
    }
    out.push(line.trimEnd());
  }
  return out;
}

export const LINE = 1.25;

/** Typographic units: 1 pt = 1/72 inch. Text is stored in mm (and em for tracking), shown the InDesign way. */
export const PT_MM = 25.4 / 72;
export const mmToPt = (mm: number) => mm / PT_MM;
export const ptToMm = (pt: number) => pt * PT_MM;
/** Tracking is stored in em; the panel shows thousandths of an em. */
export const trackingUnits = (em: number | undefined) => Math.round((em ?? 0) * 1000);
export const unitsToTracking = (u: number) => u / 1000;
/** Line spacing in mm: the box's own leading, or the old default so earlier albums look the same. */
export const leadingMm = (t: Pick<TextBox, "sizeMm" | "leading">) => t.leading ?? t.sizeMm * LINE;

export function drawText(ctx: Ctx, p: Preset, side: Side, t: TextBox, dpi: number) {
  const r = boxToMm(p, side, t);
  const px = mmToPx(t.sizeMm, dpi);
  ctx.save();
  ctx.fillStyle = t.color;
  ctx.font = fontCss(t, px);
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(t.tracking ?? 0) * px}px`;
  ctx.textBaseline = "top";
  ctx.textAlign = t.align;
  const x0 = mmToPx(r.x, dpi), w = mmToPx(r.w, dpi);
  const x = t.align === "left" ? x0 : t.align === "right" ? x0 + w : x0 + w / 2;
  const lead = mmToPx(leadingMm(t), dpi);
  let y = mmToPx(r.y, dpi) + (lead - px) / 2;
  for (const line of wrap(ctx, t.text, w)) { ctx.fillText(line, x, y); y += lead; }
  ctx.restore();
}

/** Everything a page adds on top of its photos: lines round the photos, then its text. */
export function drawPageExtras(ctx: Ctx, p: Preset, pg: LaidPage, rects: Rect[], dpi: number) {
  const side = pg.side as Side;
  const s = pg.cfg.stroke;
  if (s && s.mm > 0) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = mmToPx(s.mm, dpi);
    for (const r of rects) {
      const i = ctx.lineWidth / 2;
      ctx.strokeRect(mmToPx(r.x, dpi) + i, mmToPx(r.y, dpi) + i, mmToPx(r.w, dpi) - 2 * i, mmToPx(r.h, dpi) - 2 * i);
    }
    ctx.restore();
  }
  for (const t of pg.cfg.texts ?? []) if (t.text.trim()) drawText(ctx, p, side, t, dpi);
}

/** Make sure the fonts a set of pages uses are loaded before drawing them. */
export async function loadFonts(pages: LaidPage[]) {
  const want = new Set<string>();
  for (const pg of pages) for (const t of pg.cfg.texts ?? []) want.add(fontCss(t, 40));
  await Promise.all([...want].map((f) => document.fonts.load(f).catch(() => [])));
}
