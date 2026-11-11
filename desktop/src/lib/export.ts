import type { LaidPage } from "./layout";
import type { Photo } from "./photos";
import { drawCover, fromFile, renderCover, type Cover, type Source } from "./cover";
import { pdfFromJpegs } from "./pdf";
import { isNative, join, pickFolder, writeBytes } from "./platform";
import { frameRectMm } from "./frames";
import { drawPageExtras, loadFonts, pageBgRectMm } from "./paint";
import { zip } from "./zip";
import { CENTER, cropRect, effectiveDpi, mmToPx, setJpegDpi, spreadMm, type Placement, type Preset } from "./print";

export type Spread = { left: LaidPage | null; right: LaidPage | null };

/** Group laid pages into sheets. A joined sheet has its photos on `left` (side "both") and an empty tail on `right`. */
export function toSpreads(pages: LaidPage[]): Spread[] {
  const out: Spread[] = [];
  for (const pg of pages) {
    const s = (out[pg.spread] ??= { left: null, right: null });
    if (pg.side === 1 || pg.side === "tail") s.right = pg; else s.left = pg;
  }
  for (let i = 0; i < out.length; i++) out[i] ??= { left: null, right: null };
  return out;
}

/** Printed page number of a laid page (blank facing pages count). */
export const pageNo = (pg: LaidPage) => pg.spread * 2 + (pg.side === 1 || pg.side === "tail" ? 2 : 1);

export type Warning = { page: number; id: string; dpi: number };

/** Photos that would print below two thirds of the target resolution. */
export function lowResWarnings(pages: LaidPage[], byId: Map<string, Photo>, place: Record<string, Placement>, p: Preset): Warning[] {
  const out: Warning[] = [];
  for (const pg of pages) {
    if (!pg.tpl || pg.side === "tail") continue;
    pg.ids.forEach((id, k) => {
      const ph = byId.get(id);
      if (!ph || !ph.w) return;
      const rect = frameRectMm(p, pg, k);
      const dpi = effectiveDpi(ph.w, ph.h, rect, place[id] ?? CENTER);
      if (dpi < (p.dpi * 2) / 3) out.push({ page: pageNo(pg), id, dpi: Math.round(dpi) });
    });
  }
  return out;
}

/** Draw one spread onto a canvas at `dpi`, from the original files or (for previews) another source. */
export async function drawSpread(spread: Spread, byId: Map<string, Photo>, place: Record<string, Placement>, p: Preset, dpi: number, src: Source): Promise<OffscreenCanvas> {
  const w = Math.round(mmToPx(spreadMm(p).w, dpi)), h = Math.round(mmToPx(spreadMm(p).h, dpi));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  for (const pg of [spread.left, spread.right]) {
    if (!pg || pg.side === "tail" || !pg.cfg.bg) continue;
    const r = pageBgRectMm(p, pg.side);
    ctx.fillStyle = pg.cfg.bg;
    ctx.fillRect(Math.round(mmToPx(r.x, dpi)), 0, Math.round(mmToPx(r.x + r.w, dpi)) - Math.round(mmToPx(r.x, dpi)), h);
  }
  await loadFonts([spread.left, spread.right].filter(Boolean) as LaidPage[]);
  for (const pg of [spread.left, spread.right]) {
    if (!pg || pg.side === "tail") continue;
    const rects = pg.tpl ? pg.ids.map((_, k) => frameRectMm(p, pg, k)) : [];
    for (let k = 0; k < pg.ids.length && pg.tpl; k++) {
      const ph = byId.get(pg.ids[k]);
      if (!ph) continue;
      const r = frameRectMm(p, pg, k);
      const bmp = await src(ph);
      const c = cropRect(bmp.width, bmp.height, r.w, r.h, place[ph.id] ?? CENTER);
      const dx = Math.round(mmToPx(r.x, dpi)), dy = Math.round(mmToPx(r.y, dpi));
      const dw = Math.round(mmToPx(r.x + r.w, dpi)) - dx, dh = Math.round(mmToPx(r.y + r.h, dpi)) - dy;
      ctx.drawImage(bmp, c.sx, c.sy, c.sw, c.sh, dx, dy, dw, dh);
      bmp.close();
    }
    drawPageExtras(ctx, p, pg, rects.filter((_, k) => byId.has(pg.ids[k])), dpi);
  }
  return canvas;
}

/** One spread at print size from the original files, as a JPEG with its dpi written in. */
export async function renderSpread(spread: Spread, byId: Map<string, Photo>, place: Record<string, Placement>, p: Preset): Promise<Blob> {
  const canvas = await drawSpread(spread, byId, place, p, p.dpi, fromFile);
  const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 })).arrayBuffer());
  setJpegDpi(bytes, p.dpi);
  return new Blob([bytes], { type: "image/jpeg" });
}

/** Trim off the bleed (and board wrap) and add a label band underneath, for proofs. */
async function proofPage(sheet: OffscreenCanvas, edgeMm: number, dpi: number, label: string): Promise<Uint8Array> {
  const e = Math.round(mmToPx(edgeMm, dpi)), w = sheet.width - 2 * e, h = sheet.height - 2 * e, band = Math.round(h * 0.07);
  const out = new OffscreenCanvas(w, h + band);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h + band);
  ctx.drawImage(sheet, e, e, w, h, 0, 0, w, h);
  ctx.fillStyle = "#55585e";
  ctx.font = `${Math.round(band * 0.45)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h + band / 2);
  return new Uint8Array(await (await out.convertToBlob({ type: "image/jpeg", quality: 0.78 })).arrayBuffer());
}

/** A light PDF for the client to check on a phone: cover first, then every spread, labelled with page numbers. */
export async function proofPdf(
  cover: Cover | null, spreads: Spread[], byId: Map<string, Photo>, place: Record<string, Placement>, p: Preset, onProgress: (done: number) => void,
): Promise<Blob> {
  const dpi = Math.max(40, Math.min(110, 2400 / ((2 * p.pageWmm) / 25.4))); // about 2,400 px across a spread
  const pages: Uint8Array[] = [];
  if (cover && hasCover(cover)) {
    pages.push(await proofPage(await drawCover(cover, byId, p, dpi, fromFile), p.bleedMm + p.wrapMm, dpi, "Sampul · belakang | depan"));
  }
  for (let i = 0; i < spreads.length; i++) {
    pages.push(await proofPage(await drawSpread(spreads[i], byId, place, p, dpi, fromFile), p.bleedMm, dpi, `Halaman ${i * 2 + 1}–${i * 2 + 2}`));
    onProgress(i + 1);
  }
  return pdfFromJpegs(pages);
}

/**
 * The print files as one PDF at full resolution: cover (if any) then every spread, bleed included,
 * each page at its real size in millimetres, ready for a printer that asks for a PDF.
 */
export async function printPdf(
  cover: Cover | null, spreads: Spread[], byId: Map<string, Photo>, place: Record<string, Placement>, p: Preset, onProgress: (done: number) => void,
): Promise<Blob> {
  const pt = (mm: number) => (mm / 25.4) * 72;
  const pages: Uint8Array[] = [], widths: number[] = [];
  if (cover && hasCover(cover)) {
    pages.push(new Uint8Array(await (await renderCover(cover, byId, p)).arrayBuffer()));
    widths.push(pt(2 * p.pageWmm + p.spineMm + 2 * (p.bleedMm + p.wrapMm)));
  }
  for (let i = 0; i < spreads.length; i++) {
    pages.push(new Uint8Array(await (await renderSpread(spreads[i], byId, place, p)).arrayBuffer()));
    widths.push(pt(spreadMm(p).w));
    onProgress(i + 1);
  }
  return pdfFromJpegs(pages, widths);
}

export const hasCover = (c: Cover) => !!(c.front || c.back || c.title);

export const spreadFileName = (p: Preset, i: number) =>
  `${(p.pattern || "Album").replace(/[\\/:*?"<>|]+/g, "-")}_${String(i + 1).padStart(2, "0")}.jpg`;

type DirHandle = { getFileHandle(name: string, o: { create: boolean }): Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }> };
type Downloads = { save(r: { filename: string; data: Blob }): Promise<unknown> };

/** The hosted preview's save service, when the page runs inside claude.ai; null anywhere else. */
async function hostDownloads(): Promise<Downloads | null> {
  const c = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  if (!c?.use) return null;
  try { return (await c.use("downloads")) as Downloads | null; } catch { return null; }
}

export type ExportResult = "folder" | "zip" | "downloads";

/**
 * Write every spread into a folder the user picks. Where a folder cannot be picked (an embedded
 * preview forbids it), all spreads go into one .zip offered through the host's save dialog, or,
 * failing that, each file is offered as a normal download.
 */
export async function exportAlbum(
  spreads: Spread[], byId: Map<string, Photo>, place: Record<string, Placement>, p: Preset, onProgress: (done: number) => void,
  cover: Cover | null = null,
): Promise<ExportResult> {
  if (isNative) {
    const folder = await pickFolder("Simpan file cetak ke folder");
    if (!folder) throw new DOMException("cancelled", "AbortError");
    const withCover = !!cover && hasCover(cover);
    const jobs = [
      ...(withCover ? [{ name: coverFileName(p), make: () => renderCover(cover!, byId, p) }] : []),
      ...spreads.map((s, i) => ({ name: spreadFileName(p, i), make: () => renderSpread(s, byId, place, p) })),
    ];
    for (let i = 0; i < jobs.length; i++) {
      await writeBytes(await join(folder, jobs[i].name), await jobs[i].make());
      onProgress(i + 1);
    }
    return "folder";
  }
  const picker = (window as unknown as { showDirectoryPicker?: (o: object) => Promise<DirHandle> }).showDirectoryPicker;
  let dir: DirHandle | null = null;
  if (picker) {
    try { dir = await picker.call(window, { mode: "readwrite" }); }
    catch (e) { if (e instanceof DOMException && e.name === "AbortError") throw e; /* not allowed here: fall through */ }
  }
  const host = dir ? null : await hostDownloads();
  const zipped: { name: string; data: Uint8Array }[] = [];
  const withCover = !!cover && hasCover(cover);
  const jobs = [
    ...(withCover ? [{ name: coverFileName(p), make: () => renderCover(cover!, byId, p) }] : []),
    ...spreads.map((s, i) => ({ name: spreadFileName(p, i), make: () => renderSpread(s, byId, place, p) })),
  ];
  for (let i = 0; i < jobs.length; i++) {
    const blob = await jobs[i].make();
    const name = jobs[i].name;
    if (dir) {
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(blob);
      await w.close();
    } else if (host) {
      zipped.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }
    onProgress(i + 1);
  }
  if (dir) return "folder";
  if (host) { await saveFile(zip(zipped), `${stem(p)}.zip`, host); return "zip"; }
  return "downloads";
}

const stem = (p: Preset) => (p.pattern || "Album").replace(/[\\/:*?"<>|]+/g, "-");
export const coverFileName = (p: Preset) => `${stem(p)}_00_Sampul.jpg`;

/** Offer one file: through the hosted preview's save dialog when there is one, else as a normal download. */
export async function saveFile(blob: Blob, filename: string, host?: Downloads | null): Promise<void> {
  if (isNative) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const ext = filename.slice(filename.lastIndexOf(".") + 1);
    const path = await save({ defaultPath: filename, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
    if (!path) throw new DOMException("cancelled", "AbortError");
    await writeBytes(path, blob);
    return;
  }
  const h = host === undefined ? await hostDownloads() : host;
  if (h) {
    try { await h.save({ filename, data: blob }); }
    catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "declined") throw new DOMException("declined", "AbortError");
      throw new Error(code ?? String(e));
    }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
