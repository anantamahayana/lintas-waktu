import type { Photo } from "./photos";

/**
 * Photos can come from several places: folders and single files, dropped from Explorer or picked.
 * The project's first folder keeps plain ids (its path inside the folder), as projects always had,
 * so old saves still match; everything else gets an id that starts with "@<folder name>/".
 */
export const IMAGE_EXT = /\.(jpe?g|png|webp|tiff?|heic|cr2|cr3|nef|arw|raf|orf|rw2|dng|pef|srw)$/i;
export const RAW_EXT = /\.(cr2|cr3|nef|arw|raf|orf|rw2|dng|pef|srw)$/i;
export const isImagePath = (p: string) => IMAGE_EXT.test(p);

const parts = (p: string) => p.split(/[\\/]/).filter(Boolean);
export const baseName = (p: string) => parts(p).pop() ?? p;
export const parentDir = (p: string) => p.replace(/[\\/][^\\/]*[\\/]?$/, "");

/** Id of a photo from a source that is not the project's first folder. */
export const extraId = (source: string, rel: string) => `@${baseName(source)}/${rel}`;

/** A single dropped/picked file as a photo (its sizes and capture time are read later, like any other). */
export function photoFromFile(path: string): Photo {
  const name = baseName(path);
  return { id: extraId(parentDir(path), name), name, path, raw: RAW_EXT.test(path), time: 0, w: 0, h: 0, pick: null, stars: 0 };
}

/** Same picture already in the project: the same file, or the same name taken at the same moment (a copy). */
const stamp = (p: Photo) => p.mtime ?? 0;
const keyOf = (p: Photo) => `${p.name.toLowerCase()}|${stamp(p)}`;

/**
 * New photos to add, without ones the project already has (or that came in twice).
 * Ids that clash with different pictures get a number so nothing is overwritten.
 */
export function mergeImport(existing: Photo[], incoming: Photo[], copies = true): { added: Photo[]; dupes: number } {
  const paths = new Set(existing.map((p) => p.path).filter(Boolean));
  // `copies` off (opening a saved project): only the very same file counts, so no photo of an old project goes missing.
  const keys = new Set(copies ? existing.filter(stamp).map(keyOf) : []);
  const ids = new Set(existing.map((p) => p.id));
  const added: Photo[] = [];
  let dupes = 0;
  for (const p of incoming) {
    if ((p.path && paths.has(p.path)) || (copies && stamp(p) && keys.has(keyOf(p)))) { dupes++; continue; }
    let id = p.id, n = 2;
    while (ids.has(id)) id = `${p.id}~${n++}`;
    ids.add(id);
    if (p.path) paths.add(p.path);
    if (copies && stamp(p)) keys.add(keyOf(p));
    added.push(id === p.id ? p : { ...p, id });
  }
  return { added, dupes };
}

/** Sources of a project: what it was made from plus everything added later. */
export const sourcesOf = (m: { folder: string; sources?: string[] }) => (m.sources?.length ? m.sources : [m.folder]);
