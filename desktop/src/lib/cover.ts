import { photoBlob, type Photo } from "./photos";
import { CENTER, cropRect, mmToPx, setJpegDpi, type Placement, type Preset, type Rect } from "./print";

/** The cover: back panel, spine and front panel printed as one sheet. */
export type Cover = {
  front?: string;
  back?: string;
  frontPlace?: Placement;
  backPlace?: Placement;
  /** "full": photo runs to the edges. "frame": photo inside a margin, on the cover colour. */
  frontStyle: "full" | "frame";
  bg: string;
  title: string;
  subtitle: string;
  textColor: string;
  textPos: "atas" | "tengah" | "bawah";
  spineText: boolean;
};

export const DEFAULT_COVER: Cover = {
  frontStyle: "full", bg: "#ffffff", title: "", subtitle: "", textColor: "#ffffff", textPos: "bawah", spineText: true,
};

/** Whole cover sheet in mm, bleed and board wrap included. */
export function coverMm(p: Preset) {
  const edge = p.bleedMm + p.wrapMm;
  return { w: 2 * p.pageWmm + p.spineMm + 2 * edge, h: p.pageHmm + 2 * edge, edge };
}

/** Where back, spine and front sit on the cover sheet; back and front reach out to the sheet's outer edges. */
export function coverParts(p: Preset): { back: Rect; spine: Rect; front: Rect; trimFront: Rect } {
  const { w, h, edge } = coverMm(p);
  const spineX = edge + p.pageWmm;
  return {
    back: { x: 0, y: 0, w: spineX, h },
    spine: { x: spineX, y: 0, w: p.spineMm, h },
    front: { x: spineX + p.spineMm, y: 0, w: w - spineX - p.spineMm, h },
    trimFront: { x: spineX + p.spineMm, y: edge, w: p.pageWmm, h: p.pageHmm },
  };
}

/** Gets a decoded image for a photo: the full file for print, the thumbnail for on-screen previews. */
export type Source = (ph: Photo) => Promise<ImageBitmap>;
export const fromFile: Source = async (ph) => createImageBitmap(await photoBlob(ph));
export const fromThumb: Source = async (ph) => createImageBitmap(await (await fetch(ph.thumb!)).blob());

async function drawPhoto(ctx: OffscreenCanvasRenderingContext2D, ph: Photo, r: Rect, pl: Placement, dpi: number, src: Source) {
  const bmp = await src(ph);
  const c = cropRect(bmp.width, bmp.height, r.w, r.h, pl);
  const dx = Math.round(mmToPx(r.x, dpi)), dy = Math.round(mmToPx(r.y, dpi));
  ctx.drawImage(bmp, c.sx, c.sy, c.sw, c.sh, dx, dy, Math.round(mmToPx(r.x + r.w, dpi)) - dx, Math.round(mmToPx(r.y + r.h, dpi)) - dy);
  bmp.close();
}

/** Draw the cover sheet at `dpi`. Text uses the system's serif and sans fonts. */
export async function drawCover(cover: Cover, byId: Map<string, Photo>, p: Preset, dpi: number, src: Source): Promise<OffscreenCanvas> {
  const { w, h } = coverMm(p);
  const canvas = new OffscreenCanvas(Math.round(mmToPx(w, dpi)), Math.round(mmToPx(h, dpi)));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = cover.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const parts = coverParts(p);
  const back = cover.back ? byId.get(cover.back) : undefined;
  if (back) await drawPhoto(ctx, back, parts.back, cover.backPlace ?? CENTER, dpi, src);
  const front = cover.front ? byId.get(cover.front) : undefined;
  if (front) {
    const m = 0.1 * p.pageWmm, t = parts.trimFront;
    const r = cover.frontStyle === "full" ? parts.front : { x: t.x + m, y: t.y + m, w: t.w - 2 * m, h: t.h * 0.72 - m };
    await drawPhoto(ctx, front, r, cover.frontPlace ?? CENTER, dpi, src);
  }
  const px = (mm: number) => mmToPx(mm, dpi);
  const t = parts.trimFront, cx = px(t.x + t.w / 2);
  ctx.fillStyle = cover.textColor;
  ctx.textAlign = "center";
  const titleSize = px(Math.min(t.w, t.h) * 0.075), subSize = titleSize * 0.42;
  const framedText = cover.frontStyle === "frame";
  const baseY = framedText ? px(t.y + t.h * 0.82)
    : cover.textPos === "atas" ? px(t.y + t.h * 0.16) : cover.textPos === "tengah" ? px(t.y + t.h / 2) : px(t.y + t.h * 0.84);
  if (cover.title) {
    ctx.font = `${titleSize}px Georgia, "Times New Roman", serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(cover.title, cx, baseY, px(t.w * 0.84));
  }
  if (cover.subtitle) {
    ctx.font = `${subSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(cover.subtitle.toUpperCase().split("").join(" "), cx, baseY + subSize * 0.9, px(t.w * 0.84));
  }
  if (cover.spineText && cover.title && p.spineMm >= 6) {
    const s = parts.spine;
    ctx.save();
    ctx.translate(px(s.x + s.w / 2), px(h / 2));
    ctx.rotate(Math.PI / 2);
    ctx.font = `${px(p.spineMm * 0.45)}px Georgia, "Times New Roman", serif`;
    ctx.textBaseline = "middle";
    // The spine shows the cover colour, so pick dark or light text against that.
    const hex = cover.bg.replace("#", ""), lum = (0.299 * parseInt(hex.slice(0, 2), 16) + 0.587 * parseInt(hex.slice(2, 4), 16) + 0.114 * parseInt(hex.slice(4, 6), 16)) / 255;
    ctx.fillStyle = lum > 0.55 ? "#1f1e1c" : "#ffffff";
    ctx.fillText(cover.title, 0, 0, px(p.pageHmm * 0.8));
    ctx.restore();
  }
  return canvas;
}

export async function renderCover(cover: Cover, byId: Map<string, Photo>, p: Preset): Promise<Blob> {
  const canvas = await drawCover(cover, byId, p, p.dpi, fromFile);
  const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 })).arrayBuffer());
  setJpegDpi(bytes, p.dpi);
  return new Blob([bytes], { type: "image/jpeg" });
}
