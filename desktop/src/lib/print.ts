/** Print geometry. Everything is in millimetres until the last step; nothing here is fixed in code. */

export type Preset = {
  name: string;
  /** One page, in mm (a spread is two pages side by side). */
  pageWmm: number;
  pageHmm: number;
  pages: number;
  bleedMm: number;
  safeMm: number;
  dpi: number;
  /** Page margin and gap between photos, in percent of the page width. */
  marginPct: number;
  gapPct: number;
  bg: string;
  /** "layflat": pages open flat, a photo may cross the fold. "biasa": part of the fold is lost in the binding. */
  binding: "layflat" | "biasa";
  /** File name stem for exports: `<pattern>_01.jpg`. */
  pattern: string;
};

export const SIZES: { id: string; label: string; w: number; h: number }[] = [
  { id: "a4", label: "A4 · 29,7 × 21 cm", w: 297, h: 210 },
  { id: "20x30", label: "30 × 20 cm", w: 300, h: 200 },
  { id: "25x25", label: "25 × 25 cm", w: 250, h: 250 },
  { id: "30x30", label: "30 × 30 cm", w: 300, h: 300 },
];

export const DEFAULT_PRESET: Preset = {
  name: "A4 mendatar · layflat",
  pageWmm: 297,
  pageHmm: 210,
  pages: 20,
  bleedMm: 3,
  safeMm: 5,
  dpi: 300,
  marginPct: 7,
  gapPct: 2,
  bg: "#ffffff",
  binding: "layflat",
  pattern: "Album",
};

/** Starting points offered when a project is made; every value can be changed afterwards. */
export const STARTS: { id: string; label: string; preset: Partial<Preset> }[] = [
  { id: "a4l", label: "A4 mendatar · layflat", preset: { pageWmm: 297, pageHmm: 210 } },
  { id: "a4p", label: "A4 tegak · layflat", preset: { pageWmm: 210, pageHmm: 297 } },
  { id: "25", label: "25 × 25 cm · layflat", preset: { pageWmm: 250, pageHmm: 250 } },
  { id: "30", label: "30 × 30 cm · layflat", preset: { pageWmm: 300, pageHmm: 300 } },
  { id: "a4l-b", label: "A4 mendatar · jilid biasa", preset: { pageWmm: 297, pageHmm: 210, binding: "biasa" } },
];

export type Rect = { x: number; y: number; w: number; h: number };

export const mmToPx = (mm: number, dpi: number) => (mm / 25.4) * dpi;

/** The exported sheet: two pages plus bleed on every outer edge, in mm. */
export function spreadMm(p: Preset): { w: number; h: number } {
  return { w: 2 * p.pageWmm + 2 * p.bleedMm, h: p.pageHmm + 2 * p.bleedMm };
}

export function spreadPx(p: Preset): { w: number; h: number } {
  const s = spreadMm(p);
  return { w: Math.round(mmToPx(s.w, p.dpi)), h: Math.round(mmToPx(s.h, p.dpi)) };
}

/** A template cell: column, row, column span, row span on a small grid. */
export type GridCell = [c: number, r: number, cs: number, rs: number];

/**
 * Where a template cell sits on the spread, in mm from the sheet's top-left corner.
 * `side` "both" lays the template over the two pages as one sheet, so cells may cross the fold.
 * With no margin, cells that touch a trimmed edge run out into the bleed.
 */
export function cellRectMm(p: Preset, side: 0 | 1 | "both", cols: number, rows: number, cell: GridCell): Rect {
  const [c, r, cs, rs] = cell;
  const m = (p.marginPct / 100) * p.pageWmm;
  const g = (p.gapPct / 100) * p.pageWmm;
  const both = side === "both";
  const W = (both ? 2 : 1) * p.pageWmm - 2 * m;
  const H = p.pageHmm - 2 * m;
  const cw = (W - g * (cols - 1)) / cols;
  const ch = (H - g * (rows - 1)) / rows;
  let x = p.bleedMm + (side === 1 ? p.pageWmm : 0) + m + c * (cw + g);
  let y = p.bleedMm + m + r * (ch + g);
  let w = cs * cw + (cs - 1) * g;
  let h = rs * ch + (rs - 1) * g;
  if (m === 0) {
    if (r === 0) { y -= p.bleedMm; h += p.bleedMm; }
    if (r + rs === rows) h += p.bleedMm;
    if (side !== 1 && c === 0) { x -= p.bleedMm; w += p.bleedMm; }
    if (side !== 0 && c + cs === cols) w += p.bleedMm;
  }
  return { x, y, w, h };
}

export type Placement = { z: number; x: number; y: number };
export const CENTER: Placement = { z: 1, x: 0.5, y: 0.5 };

/**
 * Which part of the photo fills a cell ("cover" crop). `z` >= 1 zooms in, `x`/`y` in 0..1
 * slide the window across whatever does not fit. Matches the editor's CSS
 * (object-fit: cover + object-position + scale from the same origin).
 */
export function cropRect(photoW: number, photoH: number, cellW: number, cellH: number, pl: Placement = CENTER) {
  const s = Math.min(photoW / cellW, photoH / cellH);
  const z = Math.max(1, pl.z);
  const sw = (cellW * s) / z;
  const sh = (cellH * s) / z;
  return { sx: pl.x * (photoW - sw), sy: pl.y * (photoH - sh), sw, sh };
}

/** Printed resolution of a photo in a cell: source pixels across the cell per inch of paper. */
export function effectiveDpi(photoW: number, photoH: number, cellMm: Rect, pl: Placement = CENTER): number {
  const { sw } = cropRect(photoW, photoH, cellMm.w, cellMm.h, pl);
  return sw / (cellMm.w / 25.4);
}

/**
 * Canvas JPEGs say 72 or 96 dpi in their JFIF header; printers read that number.
 * Rewrites the density fields in place when the header is where the spec puts it.
 */
export function setJpegDpi(bytes: Uint8Array, dpi: number): boolean {
  const jfif = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes[3] === 0xe0 &&
    bytes[6] === 0x4a && bytes[7] === 0x46 && bytes[8] === 0x49 && bytes[9] === 0x46 && bytes[10] === 0;
  if (!jfif) return false;
  bytes[13] = 1; // units: dots per inch
  bytes[14] = dpi >> 8; bytes[15] = dpi & 0xff;
  bytes[16] = dpi >> 8; bytes[17] = dpi & 0xff;
  return true;
}
