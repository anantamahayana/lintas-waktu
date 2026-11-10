/** Reading a folder of photos: sizes, thumbnails, and the user's decisions about each. */

export type Photo = {
  /** Path inside the opened folder; stable between sessions, used to restore saved work. */
  id: string;
  name: string;
  file: File;
  time: number;
  /** Full-resolution size as it is displayed (after EXIF rotation). 0 until read. */
  w: number;
  h: number;
  thumb?: string;
  /** true = picked, false = skipped, null = not looked at yet. */
  pick: boolean | null;
  stars: number;
};

const IMAGE = /\.(jpe?g|png|webp)$/i;

export function photosFromFiles(files: FileList | File[]): { folder: string; photos: Photo[] } {
  const list = [...files].filter((f) => IMAGE.test(f.name));
  list.sort((a, b) => a.lastModified - b.lastModified || a.name.localeCompare(b.name));
  const first = list[0]?.webkitRelativePath ?? "";
  const folder = first.includes("/") ? first.slice(0, first.indexOf("/")) : "Folder";
  const photos = list.map<Photo>((file) => ({
    id: file.webkitRelativePath || file.name, name: file.name, file, time: file.lastModified, w: 0, h: 0, pick: null, stars: 0,
  }));
  return { folder, photos };
}

/** Stored pixel size from a JPEG's frame header, without decoding the image. */
export function jpegSize(b: Uint8Array): { w: number; h: number } | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    const isFrame = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (isFrame) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  return null;
}

const THUMB_H = 480;

/** Small preview plus the photo's real size. The browser applies EXIF rotation when it decodes. */
export async function readPhoto(file: File): Promise<{ thumb: string; w: number; h: number }> {
  const bmp = await createImageBitmap(file, { resizeHeight: THUMB_H, resizeQuality: "low" });
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  const landscape = bmp.width >= bmp.height;
  const ratio = bmp.width / bmp.height;
  bmp.close();
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
  const thumb = URL.createObjectURL(blob);

  let stored = /\.jpe?g$/i.test(file.name) ? jpegSize(new Uint8Array(await file.slice(0, 1 << 20).arrayBuffer())) : null;
  if (!stored) {
    const full = await createImageBitmap(file);
    stored = { w: full.width, h: full.height };
    full.close();
  }
  // The header is pre-rotation; the thumbnail tells which way up the photo really is.
  const long = Math.max(stored.w, stored.h), short = Math.min(stored.w, stored.h);
  const w = landscape ? long : short, h = landscape ? short : long;
  return { thumb, w: w || Math.round(h * ratio), h };
}

/** Read photos a few at a time, reporting in batches so a 3,000-photo folder does not redraw 3,000 times. */
export async function readAll(
  photos: Photo[],
  onBatch: (done: Map<string, { thumb: string; w: number; h: number }>) => void,
  isCancelled: () => boolean,
  workers = 3,
): Promise<void> {
  let next = 0;
  let batch = new Map<string, { thumb: string; w: number; h: number }>();
  const flush = () => { if (batch.size) { onBatch(batch); batch = new Map(); } };
  const work = async () => {
    while (next < photos.length && !isCancelled()) {
      const p = photos[next++];
      // An unreadable file still counts as read; it just stays without a thumbnail.
      const got = await readPhoto(p.file).catch(() => ({ thumb: "", w: 0, h: 0 }));
      batch.set(p.id, got); // after the await: another worker may have flushed and replaced `batch` meanwhile
      if (batch.size >= 8) flush();
    }
  };
  await Promise.all(Array.from({ length: workers }, work));
  flush();
}
