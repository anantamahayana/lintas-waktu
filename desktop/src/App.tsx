import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ask, tell } from "./lib/ask";
import type { Cover } from "./lib/cover";
import { installKeys, runCommand, setScope, useCommands } from "./lib/keys";
import { checkForUpdate, getUpdate, startUpdates } from "./lib/update";
import { AboutDialog, UpdateDialog, UpdateToast } from "./views/Update";
import { emptyAlbum, newAlbum, setCustomTemplates, type Album, type Tpl } from "./lib/layout";
import { photosFromFiles, readAll, type Photo } from "./lib/photos";
import { isNative, pickFolder, pickProjectFile, preparePhotos, ready, scanFolder, exists } from "./lib/platform";
import { DEFAULT_PRESET, type Placement, type Preset } from "./lib/print";
import { listProjects, loadProject, loadProjectFile, projectsDir, removeProject, saveProject, updateMeta, type ProjectMeta, type Saved } from "./lib/projects";
import { Beranda, NewProject } from "./views/Beranda";
import { Editor } from "./views/Editor";
import { Ekspor } from "./views/Ekspor";
import { Kurasi } from "./views/Kurasi";
import { PresetForm } from "./views/PresetForm";
import { Sampul } from "./views/Sampul";
import { Btn, MenuBar, ModuleBar, ShortcutSheet, StatusBar, type Module } from "./views/Shell";
import { TemplateEditor } from "./views/TemplateEditor";

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

installKeys();

export function App() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [dir, setDir] = useState("");
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [read, setRead] = useState(0);
  const [tab, setTab] = useState<Module>("kurasi");
  const [curId, setCurId] = useState("");
  const [target, setTarget] = useState(80);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [hist, setHist] = useState<{ past: Design[]; now: Design | null; future: Design[] }>({ past: [], now: null, future: [] });
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [panels, setPanels] = useState(true);
  const [sheet, setSheet] = useState<null | "view" | "edit">(null);
  const [upd, setUpd] = useState(false);
  const [about, setAbout] = useState(false);
  const [making, setMaking] = useState(false);
  const [props, setProps] = useState(false);
  const [templates, setTemplates] = useState(false);
  const tplUse = useRef<((t: Tpl) => void) | null>(null);
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
      if (missing) void tell(`${missing} foto di album tidak ditemukan di folder ini (dipindah, diganti nama, atau dihapus). Bingkainya tampil kosong.`, "Ada foto yang hilang");
    } else {
      setHist({ past: [], now: null, future: [] });
      setPreset(fresh ?? DEFAULT_PRESET);
      setTarget(80);
    }
    setMeta(next);
    setPhotos(list); setCurId(list[0]?.id ?? ""); setRead(0); setTab(saved?.design ? "editor" : "kurasi");

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
    if (!list.length) { void tell("Tidak ada foto (JPG, PNG, WebP, atau RAW) di folder itu.", "Folder kosong"); return; }
    const projectName = name || folderName(folder);
    start({ id: Date.now().toString(36), name: projectName, folder, updated: Date.now(), photos: list.length, picked: 0, size: "" }, list, null, { ...fresh, pattern: projectName });
  };
  const openSaved = async (saved: Saved) => {
    let folder = saved.meta.folder;
    if (!(await exists(folder).catch(() => false))) {
      const ok = await ask(`Folder ${folder} dipindah atau drive-nya tidak tersambung. Tata letak tetap aman.\n\nPilih lokasi folder fotonya sekarang?`, "Cari folder…", "Batal", { title: "Foto proyek tidak ditemukan" });
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
    if (!saved) { void tell("File proyek ini tidak bisa dibaca.", "Gagal membuka"); refresh(); return; }
    await openSaved(saved);
  };
  const openFile = async () => {
    const file = await pickProjectFile();
    if (!file) return;
    const saved = await loadProjectFile(file).catch(() => null);
    if (!saved) { void tell("File itu bukan proyek LW Album yang bisa dibaca.", "Gagal membuka"); return; }
    await openSaved(saved);
  };

  // ---- Browser: folder input ----
  const askFolder = (p: Pending) => { pending.current = p; picker.current?.click(); };
  const openBrowser = useCallback(async (files: FileList | null) => {
    const why = pending.current;
    pending.current = null;
    if (!why || !files || !files.length) return;
    const { folder, photos: list } = photosFromFiles(files);
    if (!list.length) { void tell("Tidak ada foto JPG, PNG, atau WebP di folder itu.", "Folder kosong"); return; }
    if (why.kind === "new") {
      const name = why.name || folder;
      start({ id: Date.now().toString(36), name, folder, updated: Date.now(), photos: list.length, picked: 0, size: "" }, list, null, { ...why.preset, pattern: name });
    } else {
      if (folder !== why.saved.meta.folder && !(await ask(`Proyek ini dibuat dari folder "${why.saved.meta.folder}", yang dipilih "${folder}". Pilihan dan tata letak hanya pulih untuk foto dengan nama yang sama. Lanjutkan?`))) return;
      start({ ...why.saved.meta, folder }, list, why.saved);
    }
  }, [start]);
  const create = (name: string, p: Preset) => { setMaking(false); if (isNative) void createNative(name, p); else askFolder({ kind: "new", name, preset: p }); };
  const open = (m: ProjectMeta) => (isNative ? void openNative(m) : void loadProject(m).then((s) => s && askFolder({ kind: "open", saved: s })));

  const picked = useMemo(() => photos.filter((p) => p.pick === true), [photos]);
  const used = useMemo(() => new Set(hist.now?.album.order ?? []), [hist.now?.album.order]);

  // Save decisions and the design as they change; the photos themselves stay where they are on disk.
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const saveNow = useRef<() => Promise<unknown> | void>(() => {});
  useEffect(() => {
    if (!meta) return;
    const save = () => {
      const m = metaRef.current;
      if (!m) return;
      const marks: Saved["marks"] = {};
      for (const p of photos) if (p.pick !== null || p.stars) marks[p.id] = [p.pick, p.stars];
      const nextMeta: ProjectMeta = { ...m, updated: Date.now(), photos: photos.length, picked: picked.length, size: `${preset.pageWmm / 10} × ${preset.pageHmm / 10} cm · ${preset.pages} hlm` };
      setSaving(true);
      return saveProject({ v: 3, meta: nextMeta, marks, design: hist.now, preset, target })
        .then((saved) => { setSaveError(""); if (saved.file !== m.file) setMeta(saved); })
        .catch((e) => setSaveError(String(e)))
        .finally(() => setSaving(false));
    };
    saveNow.current = save;
    const t = setTimeout(save, isNative ? 800 : 400);
    return () => clearTimeout(t);
  }, [meta?.id, photos, picked.length, hist.now, preset, target]); // eslint-disable-line react-hooks/exhaustive-deps

  /** `replace` folds a run of small changes (dragging a slider) into one undo step. */
  const commit = useCallback((next: Design, replace = false) => {
    setHist((h) => (replace ? { ...h, now: next } : { past: h.now ? [...h.past.slice(-99), h.now] : h.past, now: next, future: [] }));
  }, []);
  const undo = useCallback(() => setHist((h) => (h.past.length && h.now ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h)), []);
  const redo = useCallback(() => setHist((h) => (h.future.length && h.now ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h)), []);

  useEffect(() => { document.title = meta ? `${meta.name} · LW Album` : "LW Album"; }, [meta]);

  const build = useCallback(() => {
    commit({ album: newAlbum(picked.map((p) => p.id), preset.pages), place: {}, cover: hist.now?.cover });
    setTab("editor");
  }, [commit, picked, preset.pages, hist.now?.cover]);
  const buildEmpty = useCallback(() => {
    commit({ album: emptyAlbum(preset.pages), place: {}, cover: hist.now?.cover });
    setTab("editor");
  }, [commit, preset.pages, hist.now?.cover]);
  const autoBuild = async () => {
    if (!picked.length) { void tell("Pilih foto dulu di Kurasi (tekan P pada foto yang ingin dipakai).", "Belum ada foto terpilih"); setTab("kurasi"); return; }
    if (!hist.now || await ask(`Susun ulang album dari ${picked.length} foto terpilih? Tata letak sekarang masih bisa dikembalikan dengan Urungkan (Ctrl+Z).`, "Susun otomatis")) build();
  };

  const goHome = () => { saveNow.current(); run.current++; setMeta(null); setPhotos([]); refresh(); };
  const remove = async (m: ProjectMeta) => { await removeProject(m).catch(() => {}); refresh(); };
  const fullscreen = async () => {
    if (isNative) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const w = getCurrentWindow();
      await w.setFullscreen(!(await w.isFullscreen())).catch(() => {});
    } else if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => {});
  };

  // ---- global commands (Figma page 09) ----
  const scope = meta ? tab : "home";
  useEffect(() => { setScope(scope); }, [scope]);
  const has = !!meta, design = hist.now;
  useEffect(() => { startUpdates(() => saveNow.current()); }, []);
  useCommands({
    "app.new": { run: () => { if (meta) goHome(); setMaking(true); } },
    "app.open": { run: () => { if (isNative) void openFile(); else if (meta) goHome(); } },
    "app.save": { run: () => saveNow.current(), enabled: has },
    "app.close": { run: goHome, enabled: has },
    "app.home": { run: goHome, enabled: has },
    "app.export": { run: () => setTab("ekspor"), enabled: has && !!design },
    "app.undo": { run: undo, enabled: has && hist.past.length > 0 },
    "app.redo": { run: redo, enabled: has && hist.future.length > 0 },
    "app.keys": { run: () => setSheet((s) => (s ? null : "view")) },
    "app.update": { run: () => { setUpd(true); const p = getUpdate().phase; if (!["available", "downloading", "ready"].includes(p)) void checkForUpdate(true); } },
    "app.about": { run: () => { setAbout(true); void checkForUpdate(false); } },
    "app.prefs": { run: () => setSheet("edit") },
    "app.props": { run: () => setProps(true), enabled: has },
    "app.auto": { run: () => void autoBuild(), enabled: has },
    "app.templates": { run: () => setTemplates(true) },
    "app.panels": { run: () => setPanels((p) => !p), enabled: has, checked: !panels },
    "app.full": { run: () => void fullscreen() },
    "mod.kurasi": { run: () => setTab("kurasi"), enabled: has, checked: has && tab === "kurasi" },
    "mod.editor": { run: () => setTab("editor"), enabled: has, checked: has && tab === "editor" },
    "mod.sampul": { run: () => setTab("sampul"), enabled: has, checked: has && tab === "sampul" },
    "mod.ekspor": { run: () => setTab("ekspor"), enabled: has, checked: has && tab === "ekspor" },
  });

  const folderInput = isNative ? null : (
    <input ref={picker} type="file" multiple hidden onChange={(e) => { const f = e.target.files; void openBrowser(f).finally(() => { e.target.value = ""; }); }} {...{ webkitdirectory: "" }} />
  );
  const dialogs = (
    <>
      {upd && <UpdateDialog onClose={() => setUpd(false)} save={() => saveNow.current()} project={meta?.name} />}
      {about && <AboutDialog onClose={() => setAbout(false)} onCheck={() => runCommand("app.update")} />}
      {!upd && <UpdateToast onOpen={() => setUpd(true)} />}
      {sheet && <ShortcutSheet edit={sheet === "edit"} onClose={() => setSheet(null)} />}
      {making && <NewProject onCancel={() => setMaking(false)} onCreate={create} />}
      {templates && <TemplateEditor preset={preset} custom={custom} setCustom={setCustom} startSpread={false} onClose={() => setTemplates(false)}
        onUse={meta && tab === "editor" ? (t) => tplUse.current?.(t) : undefined} />}
      {props && meta && <PropsDialog preset={preset} setPreset={setPreset} onClose={() => setProps(false)} />}
    </>
  );

  if (!meta) {
    return (
      <div className="app">
        {folderInput}
        <MenuBar title="LW Album" />
        <ModuleBar module={null} onHome={() => {}} onModule={() => {}}
          right={<>{isNative && <Btn label="Buka…" icon="folder-open" cmd="app.open" />}<Btn label="Proyek baru" icon="plus" kind="primary" cmd="app.new" /></>} />
        <Beranda projects={projects} projectsDir={dir} onNew={() => setMaking(true)} onOpen={open}
          onOpenFile={isNative ? () => void openFile() : undefined}
          onDelete={(m) => void remove(m)} onTemplates={() => setTemplates(true)} onKeys={() => setSheet("edit")}
          onUpdate={(m, patch) => void updateMeta(m, patch).then(refresh).catch((e) => void tell(`Gagal menyimpan: ${e}`))} />
        {dialogs}
      </div>
    );
  }

  const state = saveError ? "Gagal menyimpan — Ctrl+S untuk coba lagi" : saving ? "Menyimpan…" : "Tersimpan";
  const loading = read < photos.length ? `membaca foto ${read.toLocaleString("id-ID")} dari ${photos.length.toLocaleString("id-ID")}` : "";
  const noAlbum = tab !== "kurasi" && !design;
  return (
    <div className="app">
      {folderInput}
      <MenuBar title={meta.name} state={state} tone={saveError ? "danger" : undefined} />
      <ModuleBar module={tab} onHome={goHome} onModule={setTab}
        right={<>
          <Btn kind="ghost" icon="undo-2" cmd="app.undo" tip="Urungkan" className="icon-only" />
          <Btn kind="ghost" icon="redo-2" cmd="app.redo" tip="Ulangi" className="icon-only" />
          <span className="vdiv" />
          <Btn label="Ekspor…" icon="download" kind="primary" cmd="app.export" />
        </>} />

      {tab === "kurasi" && (
        <Kurasi photos={photos} setPhotos={setPhotos} curId={curId} setCurId={setCurId} target={target} setTarget={setTarget} panels={panels}
          hasAlbum={!!design} used={used} onBuild={() => void autoBuild()} onBuildEmpty={buildEmpty} onOpenEditor={() => setTab("editor")} loading={loading} folder={folderName(meta.folder)} />
      )}
      {noAlbum && (
        <>
          <div className="work"><div className="center"><div className="canvas" style={{ display: "flex" }}>
            <div className="dropzone">
              <Icon2 />
              <strong>Album belum disusun</strong>
              <span>Susun otomatis dari foto terpilih, atau mulai dari album kosong lalu seret fotonya sendiri.</span>
              <div className="two">
                <Btn label={`Susun otomatis (${picked.length})`} icon="wand-sparkles" kind="primary" disabled={!picked.length} onClick={build} />
                <Btn label="Album kosong" icon="plus" onClick={buildEmpty} />
              </div>
              {!picked.length && <span className="caption">Belum ada foto terpilih. Tandai foto dengan P di Kurasi.</span>}
            </div>
          </div></div></div>
          <StatusBar left={`${photos.length.toLocaleString("id-ID")} foto · ${picked.length} dipilih`} />
        </>
      )}
      {tab === "editor" && design && (
        <Editor photos={photos} design={design} commit={commit} canUndo={hist.past.length > 0}
          preset={preset} setPreset={setPreset} custom={custom} panels={panels}
          registerTemplateUse={(fn) => { tplUse.current = fn; }} />
      )}
      {tab === "sampul" && design && (
        <Sampul photos={photos} design={design} commit={commit} preset={preset} setPreset={setPreset} panels={panels} />
      )}
      {tab === "ekspor" && design && (
        <Ekspor photos={photos} design={design} preset={preset} setPreset={setPreset} custom={custom} onGo={setTab}
          onDone={(status) => { if (status && meta.status !== status) { const next = { ...meta, status }; setMeta(next); } }} />
      )}
      {dialogs}
    </div>
  );
}

function Icon2() {
  return <span className="ill" style={{ width: 56, height: 56, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--raise)" }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="7" x="3" y="3" rx="1" /><rect width="9" height="7" x="3" y="14" rx="1" /><rect width="5" height="7" x="16" y="14" rx="1" /></svg>
  </span>;
}

/** Album properties (Ctrl+Shift+P): every print setting, live. */
function PropsDialog({ preset, setPreset, onClose }: { preset: Preset; setPreset: (p: Preset) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="dlg dlg-lg" onClose={onClose} aria-labelledby="props-t">
      <header className="dlg-h"><h1 id="props-t">Properti album</h1><span className="grow" /><span className="caption">Ctrl+Shift+P</span></header>
      <div className="dlg-b"><PresetForm preset={preset} setPreset={setPreset} /></div>
      <footer className="dlg-f">
        <span className="caption">Perubahan langsung terlihat. Mengubah ukuran halaman menyesuaikan semua bingkai secara proporsional.</span>
        <span className="grow" />
        <Btn label="Selesai" kind="primary" onClick={() => ref.current?.close()} />
      </footer>
    </dialog>
  );
}
