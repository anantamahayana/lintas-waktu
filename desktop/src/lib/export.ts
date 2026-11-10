import type { LaidPage } from "./layout";
import type { Photo } from "./photos";
import { CENTER, cellRectMm, cropRect, effectiveDpi, mmToPx, setJpegDpi, spreadPx, type Placement, type Preset } from "./print";

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
    const side = pg.side;
    pg.ids.forEach((id, k) => {
      const ph = byId.get(id);
      if (!ph || !ph.w) return;
      const rect = cellRectMm(p, side, pg.tpl!.cols, pg.tpl!.rows, pg.tpl!.cells[k]);
      const dpi = effectiveDpi(ph.w, ph.h, rect, place[id] ?? CENTER);
      if (dpi < (p.dpi * 2) / 3) out.push({ page: pageNo(pg), id, dpi: Math.round(dpi) });
    });
  }
  return out;
}

/** Draw one spread at print size from the original files and return it as a JPEG. */
export async function renderSpread(spread: Spread, byId: Map<string, Photo>, place: Record<string, Placement>, p: Preset): Promise<Blob> {
  const { w, h } = spreadPx(p);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  for (const pg of [spread.left, spread.right]) {
    if (!pg || !pg.tpl || pg.side === "tail") continue;
    const side = pg.side;
    for (let k = 0; k < pg.ids.length; k++) {
      const ph = byId.get(pg.ids[k]);
      if (!ph) continue;
      const r = cellRectMm(p, side, pg.tpl.cols, pg.tpl.rows, pg.tpl.cells[k]);
      const bmp = await createImageBitmap(ph.file);
      const c = cropRect(bmp.width, bmp.height, r.w, r.h, place[ph.id] ?? CENTER);
      const dx = Math.round(mmToPx(r.x, p.dpi)), dy = Math.round(mmToPx(r.y, p.dpi));
      const dw = Math.round(mmToPx(r.x + r.w, p.dpi)) - dx, dh = Math.round(mmToPx(r.y + r.h, p.dpi)) - dy;
      ctx.drawImage(bmp, c.sx, c.sy, c.sw, c.sh, dx, dy, dw, dh);
      bmp.close();
    }
  }
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  setJpegDpi(bytes, p.dpi);
  return new Blob([bytes], { type: "image/jpeg" });
}

export const spreadFileName = (p: Preset, i: number) =>
  `${(p.pattern || "Album").replace(/[\\/:*?"<>|]+/g, "-")}_${String(i + 1).padStart(2, "0")}.jpg`;

type DirHandle = { getFileHandle(name: string, o: { create: boolean }): Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }> };

/**
 * Write every spread into a folder the user picks. Where the folder picker is not
 * available, each file is offered as a normal download instead.
 */
export async function exportAlbum(
  spreads: Spread[], byId: Map<string, Photo>, place: Record<string, Placement>, p: Preset, onProgress: (done: number) => void,
): Promise<"folder" | "downloads"> {
  const picker = (window as unknown as { showDirectoryPicker?: (o: object) => Promise<DirHandle> }).showDirectoryPicker;
  const dir = picker ? await picker.call(window, { mode: "readwrite" }) : null;
  for (let i = 0; i < spreads.length; i++) {
    const blob = await renderSpread(spreads[i], byId, place, p);
    const name = spreadFileName(p, i);
    if (dir) {
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(blob);
      await w.close();
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }
    onProgress(i + 1);
  }
  return dir ? "folder" : "downloads";
}
