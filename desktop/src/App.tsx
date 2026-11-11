import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ask, tell } from "./lib/ask";
import type { Cover } from "./lib/cover";
import { emptyAlbum, newAlbum, setCustomTemplates, type Album, type Tpl } from "./lib/layout";
import { photosFromFiles, readAll, type Photo } from "./lib/photos";
import { isNative, pickFolder, pickProjectFile, preparePhotos, ready, scanFolder, exists } from "./lib/platform";
import { DEFAULT_PRESET, type Placement, type Preset } from "./lib/print";
import { listProjects, loadProject, loadProjectFile, projectsDir, removeProject, saveProject, updateMeta, type ProjectMeta, type Saved } from "./lib/projects";
import { Beranda } from "./views/Beranda";
import { Editor } from "./views/Editor";
import { Ekspor } from "./views/Ekspor";
import { Kurasi } from "./views/Kurasi";
import { Sampul } from "./views/Sampul";

type Tab = "kurasi" | "editor" | "sampul" | "ekspor";
/** What undo/redo steps through: the album and how each photo sits in its frame. */
export type Design = { album: Album; place: Record<string, Placement>; cover?: Cover };
/** What the browser's folder picker is being opened for. */
type Pending = { kind: "new"; name: string; preset: Preset } | { kind: "open"; saved: Saved };

/** The user's own templates are shared by every album on this computer. */
const TPL_KEY = "lwalbum:templates";
function loadTemplates(): Tpl[] {
  try { const v = JSON.parse(localStorage.getItem(TPL_KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
const folderName = (f: string) => f.split(/[\\/]/).filter(Boolean).pop() ?? f;
/** Photo ids are paths inside the folder. Older browser saves started with the folder's own name. */
const rel = (id: string) => (id.includes("/") ? id.slice(id.indexOf("/") + 1) : id);

export function App() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [dir, setDir] = useState("");
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [read, setRead] = useState(0);
  const [tab, setTab] = useState<Tab>("kurasi");
  const [curId, setCurId] = useState("");
  const [target, setTarget] = useState(80);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [hist, setHist] = useState<{ past: Design[]; now: Design | null; future: Design[] }>({ past: [], now: null, future: [] });
  const [saveError, setSaveError] = useState("");
  const [savedFlash, setSavedFlash] = useState(0);
  const run = useRef(0);
  const picker = useRef<HTMLInputElement>(null);
  const pending = useRef<Pending | null>(null);

  const [custom, setCustomState] = useState<Tpl[]>(loadTemplates);
  setCustomTemplates(custom); // the layout code looks templates up by id
  const setCustom = useCallback((list: Tpl[]) => {
    setCustomState(list);
    try { localStorage.setItem(TPL_KEY, JSON.stringify(list)); } catch { /* storage full: templates last until the app closes */ }
  }, []);

  const refresh = useCallback(() => { void listProjects().then(setProjects).catch(() => setProjects([])); }, []);
  useEffect(() => {
    void ready().then(refresh);
    if (isNative) void projectsDir().then(setDir);
  }, [refresh]);

  /** Start working on a set of photos, restoring decisions and the design from a save when there is one. */
  const start = useCallback((next: ProjectMeta, list: Photo[], saved: Saved | null, fresh?: Preset) => {
    if (saved) {
      const marks = new Map(Object.entries(saved.marks ?? {}).map(([k, v]) => [rel(k), v]));
      for (const p of list) { const m = marks.get(rel(p.id)); if (m) { p.pick = m[0]; p.stars = m[1]; } }
      // Saved designs refer to photos by id; match them to this folder's ids by their path inside it.
      const byRel = new Map(list.map((p) => [rel(p.id), p.id]));
      const fix = (id: string) => (id.startsWith("~") ? id : byRel.get(rel(id)) ?? id);
      const d = saved.design;
      const design = d && {
        ...d,
        album: { ...d.album, order: d.album.order.map(fix) },
        place: Object.fromEntries(Object.entries(d.place ?? {}).map(([k, v]) => [fix(k), v])),
        cover: d.cover && { ...d.cover, front: d.cover.front && fix(d.cover.front), back: d.cover.back && fix(d.cover.back) },
      };
      const have = new Set(list.map((p) => p.id));
      const missing = design ? design.album.order.filter((x) => !x.startsWith("~") && !have.has(x)).length : 0;
      setHist({ past: [], now: design, future: [] });
      setPreset({ ...DEFAULT_PRESET, ...saved.preset });
      setTarget(saved.target ?? 80);
      if (missing) void tell(`${missing} foto di album tidak ditemukan di folder ini (dipindah, diganti nama, atau dihapus). Bingkainya tampil kosong.`);
    } else {
      setHist({ past: [], now: null, future: [] });
      setPreset(fresh ?? DEFAULT_PRESET);
      setTarget(80);
    }
    setMeta(next);
    setPhotos(list); setCurId(list[0]?.id ?? ""); setRead(0); setTab("kurasi");

    const mine = ++run.current;
    const cancelled = () => run.current !== mine;
    if (isNative) {
      void (async () => {
        for (let i = 0; i < list.length && !cancelled(); i += 24) {
          const batch = list.slice(i, i + 24);
          const got = await preparePhotos(batch).catch(() => new Map());
          if (cancelled()) return;
          setPhotos((ps) => ps.map((p) => {
            const g = got.get(p.id);
            return g ? { ...p, thumb: g.thumb, full: g.full, w: g.w, h: g.h, time: g.taken ?? p.time, camera: g.camera } : p;
          }));
          setRead((n) => n + batch.length);
        }
        // Once every capture time is known, put the photos in the order they were taken.
        if (!cancelled()) setPhotos((ps) => [...ps].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id)));
      })();
    } else {
      void readAll(list, (done) => {
        setPhotos((ps) => ps.map((p) => (done.has(p.id) ? { ...p, ...done.get(p.id)! } : p)));
        setRead((n) => n + done.size);
      }, cancelled);
    }
  }, []);

  // ---- Windows app: folders and project files on disk ----
  const createNative = async (name: string, fresh: Preset) => {
    const folder = await pickFolder("Pilih folder foto acara");
    if (!folder) return;
    const list = await scanFolder(folder);
    if (!list.length) { void tell("Tidak ada foto (JPG, PNG, WebP, atau RAW) di folder itu."); return; }
    const projectName = name || folderName(folder);
    start({ id: Date.now().toString(36), name: projectName, folder, updated: Date.now(), photos: list.length, picked: 0, size: "" }, list, null, { ...fresh, pattern: projectName });
  };
  const openSaved = async (saved: Saved) => {
    let folder = saved.meta.folder;
    if (!(await exists(folder).catch(() => false))) {
      const ok = await ask(`Folder foto proyek ini tidak ditemukan:\n${folder}\n\nMungkin dipindah, atau proyek ini dari laptop lain. Pilih lokasi folder fotonya sekarang?`, "Pilih folder");
      if (!ok) return;
      const picked = await pickFolder(`Lokasi baru folder "${folderName(folder)}"`);
      if (!picked) return;
      folder = picked;
    }
    const list = await scanFolder(folder);
    start({ ...saved.meta, folder }, list, saved);
  };
  const openNative = async (m: ProjectMeta) => {
    const saved = await loadProject(m).catch(() => null);
    if (!saved) { void tell("File proyek ini tidak bisa dibaca."); refresh(); return; }
    await openSaved(saved);
  };
  const openFile = async () => {
    const file = await pickProjectFile();
    if (!file) return;
    const saved = await loadProjectFile(file).catch(() => null);
    if (!saved) { void tell("File itu bukan proyek LW Album yang bisa dibaca."); return; }
    await openSaved(saved);
  };

  // ---- Browser: folder input ----
  const askFolder = (p: Pending) => { pending.current = p; picker.current?.click(); };
  const openBrowser = useCallback(async (files: FileList | null) => {
    const why = pending.current;
    pending.current = null;
    if (!why || !files || !files.length) return;
    const { folder, photos: list } = photosFromFiles(files);
    if (!list.length) { void tell("Tidak ada foto JPG, PNG, atau WebP di folder itu."); return; }
    if (why.kind === "new") {
      const name = why.name || folder;
      start({ id: Date.now().toString(36), name, folder, updated: Date.now(), photos: list.length, picked: 0, size: "" }, list, null, { ...why.preset, pattern: name });
    } else {
      if (folder !== why.saved.meta.folder && !(await ask(`Proyek ini dibuat dari folder "${why.saved.meta.folder}", yang dipilih "${folder}". Pilihan dan tata letak hanya pulih untuk foto dengan nama yang sama. Lanjutkan?`))) return;
      start({ ...why.saved.meta, folder }, list, why.saved);
    }
  }, [start]);

  const picked = useMemo(() => photos.filter((p) => p.pick === true), [photos]);

  // Save decisions and the design as they change; the photos themselves stay where they are on disk.
  const metaRef = useRef(meta);
  metaRef.current = meta;
  useEffect(() => {
    if (!meta) return;
    const t = setTimeout(() => {
      const m = metaRef.current!;
      const marks: Saved["marks"] = {};
      for (const p of photos) if (p.pick !== null || p.stars) marks[p.id] = [p.pick, p.stars];
      const nextMeta: ProjectMeta = { ...m, updated: Date.now(), photos: photos.length, picked: picked.length, size: `${preset.pageWmm / 10} × ${preset.pageHmm / 10} cm · ${preset.pages} hlm` };
      saveProject({ v: 3, meta: nextMeta, marks, design: hist.now, preset, target })
        .then((saved) => { setSaveError(""); if (saved.file !== m.file) setMeta(saved); })
        .catch((e) => setSaveError(String(e)));
    }, isNative ? 800 : 400);
    return () => clearTimeout(t);
  }, [meta?.id, photos, picked.length, hist.now, preset, target]); // eslint-disable-line react-hooks/exhaustive-deps

  /** `replace` folds a run of small changes (dragging a slider) into one undo step. */
  const commit = useCallback((next: Design, replace = false) => {
    setHist((h) => (replace ? { ...h, now: next } : { past: h.now ? [...h.past.slice(-99), h.now] : h.past, now: next, future: [] }));
  }, []);
  const undo = useCallback(() => setHist((h) => (h.past.length && h.now ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h)), []);
  const redo = useCallback(() => setHist((h) => (h.future.length && h.now ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h)), []);

  // Window title and workspace shortcuts: Ctrl+1..4 switch tabs, Ctrl+S confirms the (automatic) save.
  useEffect(() => { document.title = meta ? `${meta.name} · LW Album` : "LW Album"; }, [meta]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !metaRef.current) return;
      const tabs: Tab[] = ["kurasi", "editor", "sampul", "ekspor"];
      if (e.key >= "1" && e.key <= "4") { e.preventDefault(); setTab(tabs[+e.key - 1]); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); setSavedFlash(Date.now()); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const build = useCallback(() => {
    commit({ album: newAlbum(picked.map((p) => p.id), preset.pages), place: {}, cover: hist.now?.cover });
    setTab("editor");
  }, [commit, picked, preset.pages, hist.now?.cover]);
  const buildEmpty = useCallback(() => {
    commit({ album: emptyAlbum(preset.pages), place: {}, cover: hist.now?.cover });
    setTab("editor");
  }, [commit, preset.pages, hist.now?.cover]);

  const goHome = () => { run.current++; setMeta(null); setPhotos([]); refresh(); };
  const remove = async (m: ProjectMeta) => { await removeProject(m).catch(() => {}); refresh(); };

  const folderInput = isNative ? null : (
    <input ref={picker} type="file" multiple hidden onChange={(e) => { const f = e.target.files; void openBrowser(f).finally(() => { e.target.value = ""; }); }} {...{ webkitdirectory: "" }} />
  );

  if (!meta) {
    return (
      <>
        {folderInput}
        <Beranda projects={projects} projectsDir={dir}
          onCreate={(name, p) => (isNative ? void createNative(name, p) : askFolder({ kind: "new", name, preset: p }))}
          onOpen={(m) => (isNative ? void openNative(m) : void loadProject(m).then((s) => s && askFolder({ kind: "open", saved: s })))}
          onOpenFile={isNative ? () => void openFile() : undefined}
          onDelete={(m) => void remove(m)}
          onUpdate={(m, patch) => void updateMeta(m, patch).then(refresh).catch((e) => void tell(`Gagal menyimpan: ${e}`))} />
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
        <strong>{meta.name}</strong>
        <nav aria-label="Ruang kerja">
          {(["kurasi", "editor", "sampul", "ekspor"] as const).map((t) => (
            <button key={t} type="button" className="tab" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>
              {t === "kurasi" ? "Kurasi" : t === "editor" ? "Editor" : t === "sampul" ? "Sampul" : "Ekspor"}
            </button>
          ))}
        </nav>
        <span className="right dim" title={meta.folder}>
          {folderName(meta.folder)} · {photos.length.toLocaleString("id-ID")} foto
          {read < photos.length ? ` · membaca ${read.toLocaleString("id-ID")}` : ""}
        </span>
        <span key={savedFlash} className={saveError ? "warn" : savedFlash ? "dim flash" : "dim"} title={saveError || meta.file || "Tersimpan otomatis"}>{saveError ? "Gagal menyimpan" : "Tersimpan"}</span>
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
      {tab === "sampul" && design && (
        <Sampul photos={photos} design={design} commit={commit} preset={preset} setPreset={setPreset} />
      )}
      {tab === "ekspor" && design && (
        <Ekspor photos={photos} design={design} preset={preset} setPreset={setPreset} custom={custom} />
      )}
    </div>
  );
}
