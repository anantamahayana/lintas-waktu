/**
 * What the app can do depends on where it runs: inside the Windows app (Tauri) it reads and writes
 * the disk directly; in a browser or the hosted preview it falls back to file inputs and downloads.
 * Everything that touches files goes through here.
 */
import type { Photo } from "./photos";

type Invoke = <T>(cmd: string, args?: Record<string, unknown> | Uint8Array, opts?: { headers?: Record<string, string> }) => Promise<T>;

export const isNative = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let core: Promise<{ invoke: Invoke; convertFileSrc: (p: string) => string }> | null = null;
const tauri = () => (core ??= import("@tauri-apps/api/core") as never);

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return (await tauri()).invoke<T>(cmd, args);
}

/** A URL the web view can load for a file on disk. */
let toUrl: ((p: string) => string) | null = null;
export async function ready(): Promise<void> { if (isNative && !toUrl) toUrl = (await tauri()).convertFileSrc; }
export const fileUrl = (path: string) => (toUrl ? toUrl(path) : path);

export async function pickFolder(title: string): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const r = await open({ directory: true, multiple: false, title });
  return typeof r === "string" ? r : null;
}

export async function pickProjectFile(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const r = await open({ multiple: false, title: "Buka proyek", filters: [{ name: "Proyek LW Album", extensions: ["lwalbum"] }] });
  return typeof r === "string" ? r : null;
}

export async function documentsDir(): Promise<string> {
  const { documentDir, join } = await import("@tauri-apps/api/path");
  return join(await documentDir(), "LW Album");
}

export async function join(...parts: string[]): Promise<string> {
  const p = await import("@tauri-apps/api/path");
  return p.join(...parts);
}

export const readText = (path: string) => invoke<string>("read_text", { path });
export const writeText = (path: string, text: string) => invoke<void>("write_text", { path, text });
export const exists = (path: string) => invoke<boolean>("path_exists", { path });
export const removeFile = (path: string) => invoke<void>("remove_file", { path });
export const listFiles = (dir: string, ext: string) => invoke<{ path: string; modified: number }[]>("list_files", { dir, ext });
export const snapshot = (path: string, dir: string, keep: number) => invoke<void>("snapshot", { path, dir, keep });

export async function writeBytes(path: string, data: Blob | Uint8Array): Promise<void> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer());
  await (await tauri()).invoke("write_bytes", bytes, { headers: { "x-path": encodeURIComponent(path) } });
}

type Entry = { rel: string; path: string; size: number; mtime: number; raw: boolean };
type Prepared = { thumb: string; full: string; w: number; h: number; taken: number | null; camera: string | null };

const base = (rel: string) => rel.slice(rel.lastIndexOf("/") + 1);
const stem = (rel: string) => rel.replace(/\.[^./]+$/, "").toLowerCase();

/**
 * Every photo in a folder on disk. When a RAW file and a JPEG share a name (RAW+JPEG shooting),
 * only the JPEG is listed, so each picture appears once.
 */
export async function scanFolder(dir: string): Promise<Photo[]> {
  const list = await invoke<Entry[]>("scan_folder", { dir });
  const jpegStems = new Set(list.filter((e) => !e.raw).map((e) => stem(e.rel)));
  return list
    .filter((e) => !(e.raw && jpegStems.has(stem(e.rel))))
    .map<Photo>((e) => ({ id: e.rel, name: base(e.rel), path: e.path, raw: e.raw, time: e.mtime, w: 0, h: 0, pick: null, stars: 0 }))
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
}

export type PhotoInfo = { thumb: string; full: string; w: number; h: number; taken?: number; camera?: string };

/** Thumbnails, sizes and capture times for photos on disk; made by the app in parallel and cached. */
export async function preparePhotos(photos: Photo[]): Promise<Map<string, PhotoInfo>> {
  const got = await invoke<({ Ok: Prepared } | { Err: string })[]>("prepare_photos", { paths: photos.map((p) => p.path) });
  const out = new Map<string, PhotoInfo>();
  got.forEach((r, i) => {
    if ("Ok" in r) {
      const v = r.Ok;
      out.set(photos[i].id, { thumb: fileUrl(v.thumb), full: v.full, w: v.w, h: v.h, taken: v.taken ?? undefined, camera: v.camera ?? undefined });
    } else out.set(photos[i].id, { thumb: "", full: "", w: 0, h: 0 });
  });
  return out;
}
