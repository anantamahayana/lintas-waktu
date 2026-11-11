import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ask, tell } from "./lib/ask";
import { emptyAlbum, newAlbum, setCustomTemplates, type Album, type Tpl } from "./lib/layout";
import { photosFromFiles, readAll, type Photo } from "./lib/photos";
import { DEFAULT_PRESET, type Placement, type Preset } from "./lib/print";
import { Beranda, type ProjectMeta } from "./views/Beranda";
import { Editor } from "./views/Editor";
import { Ekspor } from "./views/Ekspor";
import { Kurasi } from "./views/Kurasi";

type Tab = "kurasi" | "editor" | "ekspor";
/** What undo/redo steps through: the album and how each photo sits in its frame. */
export type Design = { album: Album; place: Record<string, Placement> };
type Saved = { v: 2; name: string; folder: string; marks: Record<string, [boolean | null, number]>; design: Design | null; preset: Preset; target: number };
/** What the folder picker is being opened for. */
type Pending = { kind: "new"; name: string; preset: Preset } | { kind: "open"; meta: ProjectMeta };

const INDEX_KEY = "lwalbum:projects";
/** The user's own templates are shared by every album on this computer. */
const TPL_KEY = "lwalbum:templates";
const projectKey = (id: string) => `lwalbum:p:${id}`;

function load<T>(key: string, fallback: T): T {
  try { const v = JSON.parse(localStorage.getItem(key) ?? "null"); return v ?? fallback; } catch { return fallback; }
}
function store(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full: keep working unsaved */ }
}

export function App() {
  const [projects, setProjects] = useState<ProjectMeta[]>(() => load<ProjectMeta[]>(INDEX_KEY, []));
  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [folder, setFolder] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [read, setRead] = useState(0);
  const [tab, setTab] = useState<Tab>("kurasi");
  const [curId, setCurId] = useState("");
  const [target, setTarget] = useState(80);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [hist, setHist] = useState<{ past: Design[]; now: Design | null; future: Design[] }>({ past: [], now: null, future: [] });
  const run = useRef(0);
  const picker = useRef<HTMLInputElement>(null);
  const pending = useRef<Pending | null>(null);

  const [custom, setCustomState] = useState<Tpl[]>(() => { const v = load<Tpl[]>(TPL_KEY, []); return Array.isArray(v) ? v : []; });
  setCustomTemplates(custom); // the layout code looks templates up by id
  const setCustom = useCallback((list: Tpl[]) => { setCustomState(list); store(TPL_KEY, list); }, []);

  const pickFolder = (p: Pending) => { pending.current = p; picker.current?.click(); };

  const open = useCallback(async (files: FileList | null) => {
    const why = pending.current;
    pending.current = null;
    if (!why || !files || !files.length) return;
    const { folder, photos } = photosFromFiles(files);
    if (!photos.length) { void tell("Tidak ada foto JPG, PNG, atau WebP di folder itu."); return; }

    let id: string, name: string;
    if (why.kind === "new") {
      id = Date.now().toString(36);
      name = why.name || folder;
      setHist({ past: [], now: null, future: [] });
      setPreset({ ...why.preset, pattern: name });
      setTarget(80);
    } else {
      const saved = load<Saved | null>(projectKey(why.meta.id), null);
      if (folder !== why.meta.folder && !(await ask(`Proyek ini dibuat dari folder "${why.meta.folder}", yang dipilih "${folder}". Pilihan dan tata letak hanya pulih untuk foto dengan nama yang sama. Lanjutkan?`))) return;
      id = why.meta.id; name = why.meta.name;
      const have = new Set(photos.map((p) => p.id));
      // Photos are matched by their path inside the folder; the folder's own name may have changed.
      const rel = (pid: string) => pid.slice(pid.indexOf("/") + 1);
      const marks = new Map(Object.entries(saved?.marks ?? {}).map(([k, v]) => [rel(k), v]));
      for (const p of photos) { const m = marks.get(rel(p.id)); if (m) { p.pick = m[0]; p.stars = m[1]; } }
      const ok = saved?.design && saved.design.album.order.every((x) => x.startsWith("~") || have.has(x));
      setHist({ past: [], now: ok ? saved!.design : null, future: [] });
      setPreset({ ...DEFAULT_PRESET, ...saved?.preset });
      setTarget(saved?.target ?? 80);
    }
    setProject({ id, name });
    setFolder(folder); setPhotos(photos); setCurId(photos[0].id); setRead(0); setTab("kurasi");
    const mine = ++run.current;
    void readAll(photos, (done) => {
      setPhotos((ps) => ps.map((p) => (done.has(p.id) ? { ...p, ...done.get(p.id)! } : p)));
      setRead((n) => n + done.size);
    }, () => run.current !== mine);
  }, []);

  const picked = useMemo(() => photos.filter((p) => p.pick === true), [photos]);

  // Save decisions and the design as they change; the photos themselves stay where they are on disk.
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => {
      const marks: Saved["marks"] = {};
      for (const p of photos) if (p.pick !== null || p.stars) marks[p.id] = [p.pick, p.stars];
      store(projectKey(project.id), { v: 2, name: project.name, folder, marks, design: hist.now, preset, target } satisfies Saved);
      const meta: ProjectMeta = {
        id: project.id, name: project.name, folder, updated: Date.now(), photos: photos.length, picked: picked.length,
        size: `${preset.pageWmm / 10} × ${preset.pageHmm / 10} cm · ${preset.pages} hlm`,
      };
      setProjects((list) => { const next = [meta, ...list.filter((x) => x.id !== meta.id)]; store(INDEX_KEY, next); return next; });
    }, 400);
    return () => clearTimeout(t);
  }, [project, folder, photos, picked.length, hist.now, preset, target]);

  /** `replace` folds a run of small changes (dragging a slider) into one undo step. */
  const commit = useCallback((next: Design, replace = false) => {
    setHist((h) => (replace ? { ...h, now: next } : { past: h.now ? [...h.past.slice(-49), h.now] : h.past, now: next, future: [] }));
  }, []);
  const undo = useCallback(() => setHist((h) => (h.past.length && h.now ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h)), []);
  const redo = useCallback(() => setHist((h) => (h.future.length && h.now ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h)), []);

  const build = useCallback(() => {
    commit({ album: newAlbum(picked.map((p) => p.id), preset.pages), place: {} });
    setTab("editor");
  }, [commit, picked, preset.pages]);
  const buildEmpty = useCallback(() => {
    commit({ album: emptyAlbum(preset.pages), place: {} });
    setTab("editor");
  }, [commit, preset.pages]);

  const goHome = () => { run.current++; setProject(null); setPhotos([]); setFolder(""); };
  const remove = (p: ProjectMeta) => {
    try { localStorage.removeItem(projectKey(p.id)); } catch { /* nothing to remove */ }
    setProjects((list) => { const next = list.filter((x) => x.id !== p.id); store(INDEX_KEY, next); return next; });
  };

  const folderInput = <input ref={picker} type="file" multiple hidden onChange={(e) => { const f = e.target.files; void open(f).finally(() => { e.target.value = ""; }); }} {...{ webkitdirectory: "" }} />;

  if (!project) {
    return (
      <>
        {folderInput}
        <Beranda projects={projects} onCreate={(name, preset) => pickFolder({ kind: "new", name, preset })} onOpen={(meta) => pickFolder({ kind: "open", meta })} onDelete={remove} />
      </>
    );
  }

  const design = hist.now;
  const needAlbum = tab !== "kurasi" && !design;
  return (
    <div className="app">
      {folderInput}
      <header className="bar">
        <button type="button" className="btn" onClick={goHome}>Beranda</button>
        <strong>{project.name}</strong>
        <nav aria-label="Ruang kerja">
          {(["kurasi", "editor", "ekspor"] as const).map((t) => (
            <button key={t} type="button" className="tab" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>
              {t === "kurasi" ? "Kurasi" : t === "editor" ? "Editor" : "Ekspor"}
            </button>
          ))}
        </nav>
        <span className="right dim">
          {folder} · {photos.length.toLocaleString("id-ID")} foto
          {read < photos.length ? ` · membaca ${read.toLocaleString("id-ID")}` : ""} · tersimpan otomatis
        </span>
      </header>

      {tab === "kurasi" && (
        <Kurasi photos={photos} setPhotos={setPhotos} curId={curId} setCurId={setCurId} target={target} setTarget={setTarget}
          hasAlbum={!!design} onBuild={build} onBuildEmpty={buildEmpty} onOpenEditor={() => setTab("editor")} />
      )}
      {needAlbum && (
        <div className="empty">
          <p>Belum ada album. Susun otomatis dari foto terpilih, atau mulai dari album kosong dan seret fotonya sendiri.</p>
          <div className="two">
            <button type="button" className="btn primary" disabled={!picked.length} onClick={build}>Susun otomatis dari {picked.length} foto terpilih</button>
            <button type="button" className="btn" onClick={buildEmpty}>Album kosong, isi sendiri</button>
          </div>
        </div>
      )}
      {tab === "editor" && design && (
        <Editor photos={photos} design={design} commit={commit} undo={undo} redo={redo} canUndo={hist.past.length > 0} canRedo={hist.future.length > 0}
          preset={preset} setPreset={setPreset} onRebuild={build} canRebuild={picked.length > 0} onExport={() => setTab("ekspor")} custom={custom} setCustom={setCustom} />
      )}
      {tab === "ekspor" && design && (
        <Ekspor photos={photos} design={design} preset={preset} setPreset={setPreset} custom={custom} />
      )}
    </div>
  );
}
