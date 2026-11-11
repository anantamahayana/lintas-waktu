/**
 * Where projects live. In the Windows app each project is a `.lwalbum` file (JSON) in
 * Documents\LW Album\Proyek, with older versions kept in a `.versi` folder beside it, so a project
 * can be backed up, copied to another laptop, or rolled back. In a browser they live in localStorage.
 */
import type { Design } from "../App";
import { documentsDir, exists, isNative, join, listFiles, readText, removeFile, snapshot, writeText } from "./platform";
import type { Preset } from "./print";

/** What the home screen lists for each saved project. */
export type ProjectMeta = {
  id: string;
  name: string;
  /** Browser: the folder's name. Windows app: the folder's full path. */
  folder: string;
  updated: number;
  photos: number;
  picked: number;
  size: string;
  /** Windows app: the project file. */
  file?: string;
  /** Production tracking. */
  status?: Status;
  client?: string;
  due?: string;
  printer?: string;
  cost?: number;
  price?: number;
  resi?: string;
  notes?: string;
};

export const STATUSES = [
  { id: "desain", label: "Desain" },
  { id: "proof", label: "Proof ke klien" },
  { id: "revisi", label: "Revisi" },
  { id: "disetujui", label: "Disetujui" },
  { id: "cetak", label: "Di percetakan" },
  { id: "kirim", label: "Dikirim" },
  { id: "selesai", label: "Diterima" },
] as const;
export type Status = (typeof STATUSES)[number]["id"];

/** Change a project's tracking fields without opening it. */
export async function updateMeta(meta: ProjectMeta, patch: Partial<ProjectMeta>): Promise<ProjectMeta> {
  const s = await loadProject(meta);
  if (!s) throw new Error("Proyek tidak bisa dibaca");
  return saveProject({ ...s, meta: { ...s.meta, ...patch, file: meta.file } });
}

export type Saved = {
  v: 3;
  meta: ProjectMeta;
  marks: Record<string, [boolean | null, number]>;
  design: Design | null;
  preset: Preset;
  target: number;
};

const INDEX_KEY = "lwalbum:projects";
const key = (id: string) => `lwalbum:p:${id}`;
const VERSION_EVERY_MS = 5 * 60 * 1000;
const KEEP_VERSIONS = 30;

function load<T>(k: string, fallback: T): T {
  try { const v = JSON.parse(localStorage.getItem(k) ?? "null"); return v ?? fallback; } catch { return fallback; }
}
function store(k: string, value: unknown) {
  try { localStorage.setItem(k, JSON.stringify(value)); } catch { /* storage full: keep working unsaved */ }
}

export async function projectsDir(): Promise<string> { return join(await documentsDir(), "Proyek"); }

/** Older saves (v2, browser) had the meta fields spread at the top level. */
function upgrade(raw: unknown, fallback?: ProjectMeta): Saved | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Omit<Partial<Saved>, "v"> & { v?: number; name?: string; folder?: string };
  if (r.v === 3 && r.meta) return r as unknown as Saved;
  if (r.v === 2 && fallback) return { v: 3, meta: { ...fallback, name: r.name ?? fallback.name, folder: r.folder ?? fallback.folder }, marks: r.marks ?? {}, design: r.design ?? null, preset: r.preset!, target: r.target ?? 80 };
  return null;
}

export async function listProjects(): Promise<ProjectMeta[]> {
  if (!isNative) return load<ProjectMeta[]>(INDEX_KEY, []);
  const files = await listFiles(await projectsDir(), "lwalbum");
  const out: ProjectMeta[] = [];
  for (const f of files) {
    try {
      const s = upgrade(JSON.parse(await readText(f.path)));
      if (s) out.push({ ...s.meta, file: f.path });
    } catch { /* unreadable file: leave it out of the list */ }
  }
  return out.sort((a, b) => b.updated - a.updated);
}

export async function loadProject(meta: ProjectMeta): Promise<Saved | null> {
  if (!isNative) return upgrade(load(key(meta.id), null), meta);
  if (!meta.file || !(await exists(meta.file))) return null;
  const s = upgrade(JSON.parse(await readText(meta.file)));
  return s ? { ...s, meta: { ...s.meta, file: meta.file } } : null;
}

export async function loadProjectFile(file: string): Promise<Saved | null> {
  const s = upgrade(JSON.parse(await readText(file)));
  return s ? { ...s, meta: { ...s.meta, file } } : null;
}

const lastVersion = new Map<string, number>();

/** Save the project. Every few minutes the previous save is also kept as a version. */
export async function saveProject(s: Saved): Promise<ProjectMeta> {
  if (!isNative) {
    store(key(s.meta.id), s);
    const list = load<ProjectMeta[]>(INDEX_KEY, []);
    store(INDEX_KEY, [s.meta, ...list.filter((x) => x.id !== s.meta.id)]);
    return s.meta;
  }
  const dir = await projectsDir();
  const file = s.meta.file ?? (await join(dir, `${s.meta.name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "Proyek"} ${s.meta.id}.lwalbum`));
  const meta = { ...s.meta, file };
  const now = Date.now();
  if (now - (lastVersion.get(meta.id) ?? 0) > VERSION_EVERY_MS) {
    lastVersion.set(meta.id, now);
    await snapshot(file, await join(dir, ".versi"), KEEP_VERSIONS).catch(() => {});
  }
  const { file: _drop, ...portable } = meta; // the path is where the file is, not part of it
  void _drop;
  await writeText(file, JSON.stringify({ ...s, meta: portable }));
  return meta;
}

export async function removeProject(meta: ProjectMeta): Promise<void> {
  if (!isNative) {
    try { localStorage.removeItem(key(meta.id)); } catch { /* nothing to remove */ }
    store(INDEX_KEY, load<ProjectMeta[]>(INDEX_KEY, []).filter((x) => x.id !== meta.id));
    return;
  }
  if (meta.file) await removeFile(meta.file);
}
