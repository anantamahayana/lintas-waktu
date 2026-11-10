import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { newAlbum, setCustomTemplates, type Album, type Tpl } from "./lib/layout";
import { photosFromFiles, readAll, type Photo } from "./lib/photos";
import { DEFAULT_PRESET, type Placement, type Preset } from "./lib/print";
import { Editor } from "./views/Editor";
import { Ekspor } from "./views/Ekspor";
import { Kurasi } from "./views/Kurasi";

type Tab = "kurasi" | "editor" | "ekspor";
/** What undo/redo steps through: the album and how each photo sits in its frame. */
export type Design = { album: Album; place: Record<string, Placement> };
type Saved = { v: 1; marks: Record<string, [boolean | null, number]>; design: Design | null; preset: Preset; target: number };

const saveKey = (folder: string) => `lwalbum:${folder}`;
/** The user's own templates are shared by every album on this computer. */
const TPL_KEY = "lwalbum:templates";
function loadTemplates(): Tpl[] {
  try { const v = JSON.parse(localStorage.getItem(TPL_KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function App() {
  const [folder, setFolder] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [read, setRead] = useState(0);
  const [tab, setTab] = useState<Tab>("kurasi");
  const [curId, setCurId] = useState("");
  const [target, setTarget] = useState(80);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [hist, setHist] = useState<{ past: Design[]; now: Design | null; future: Design[] }>({ past: [], now: null, future: [] });
  const [restored, setRestored] = useState(false);
  const run = useRef(0);
  const [custom, setCustomState] = useState<Tpl[]>(loadTemplates);
  setCustomTemplates(custom); // the layout code looks templates up by id
  const setCustom = useCallback((list: Tpl[]) => {
    setCustomState(list);
    try { localStorage.setItem(TPL_KEY, JSON.stringify(list)); } catch { /* storage full: templates last until the app closes */ }
  }, []);

  const open = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const { folder, photos } = photosFromFiles(files);
    if (!photos.length) { alert("Tidak ada foto JPG, PNG, atau WebP di folder itu."); return; }
    let saved: Saved | null = null;
    try { saved = JSON.parse(localStorage.getItem(saveKey(folder)) ?? "null"); } catch { /* damaged save: start fresh */ }
    const have = new Set(photos.map((p) => p.id));
    if (saved?.v === 1) {
      for (const p of photos) { const m = saved.marks[p.id]; if (m) { p.pick = m[0]; p.stars = m[1]; } }
      const ok = saved.design && saved.design.album.order.every((id) => have.has(id));
      setHist({ past: [], now: ok ? saved.design : null, future: [] });
      setPreset({ ...DEFAULT_PRESET, ...saved.preset });
      setTarget(saved.target);
    } else {
      setHist({ past: [], now: null, future: [] });
      setPreset({ ...DEFAULT_PRESET, pattern: folder });
    }
    setRestored(saved?.v === 1);
    setFolder(folder); setPhotos(photos); setCurId(photos[0].id); setRead(0); setTab("kurasi");
    const mine = ++run.current;
    void readAll(photos, (done) => {
      setPhotos((ps) => ps.map((p) => (done.has(p.id) ? { ...p, ...done.get(p.id)! } : p)));
      setRead((n) => n + done.size);
    }, () => run.current !== mine);
  }, []);

  // Save decisions and the design as they change; the photos themselves stay where they are on disk.
  useEffect(() => {
    if (!folder) return;
    const t = setTimeout(() => {
      const marks: Saved["marks"] = {};
      for (const p of photos) if (p.pick !== null || p.stars) marks[p.id] = [p.pick, p.stars];
      const data: Saved = { v: 1, marks, design: hist.now, preset, target };
      try { localStorage.setItem(saveKey(folder), JSON.stringify(data)); } catch { /* storage full: keep working unsaved */ }
    }, 400);
    return () => clearTimeout(t);
  }, [folder, photos, hist.now, preset, target]);

  /** `replace` folds a run of small changes (dragging a slider) into one undo step. */
  const commit = useCallback((next: Design, replace = false) => {
    setHist((h) => (replace ? { ...h, now: next } : { past: h.now ? [...h.past.slice(-49), h.now] : h.past, now: next, future: [] }));
  }, []);
  const undo = useCallback(() => setHist((h) => (h.past.length && h.now ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h)), []);
  const redo = useCallback(() => setHist((h) => (h.future.length && h.now ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h)), []);

  const picked = useMemo(() => photos.filter((p) => p.pick === true), [photos]);
  const build = useCallback(() => {
    commit({ album: newAlbum(picked.map((p) => p.id), preset.pages), place: {} });
    setTab("editor");
  }, [commit, picked, preset.pages]);

  if (!folder) {
    return (
      <div className="start">
        <h1>LW Album</h1>
        <p>Buka folder foto acara untuk mulai memilih dan menyusun album. Foto tetap di laptop ini; tidak ada yang diunggah.</p>
        <label className="btn primary big">
          Buka folder foto
          <input type="file" multiple hidden onChange={(e) => open(e.target.files)} {...{ webkitdirectory: "" }} />
        </label>
        <p className="dim">JPG, PNG, WebP. Pilihan dan desain tersimpan otomatis per nama folder.</p>
      </div>
    );
  }

  const design = hist.now;
  const needAlbum = tab !== "kurasi" && !design;
  return (
    <div className="app">
      <header className="bar">
        <strong>LW Album</strong>
        <nav aria-label="Ruang kerja">
          {(["kurasi", "editor", "ekspor"] as const).map((t) => (
            <button key={t} type="button" className="tab" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>
              {t === "kurasi" ? "Kurasi" : t === "editor" ? "Editor" : "Ekspor"}
            </button>
          ))}
        </nav>
        <span className="right dim">
          {folder} · {photos.length.toLocaleString("id-ID")} foto
          {read < photos.length ? ` · membaca ${read.toLocaleString("id-ID")}` : ""}
          {restored ? " · pekerjaan sebelumnya dipulihkan" : ""}
        </span>
        <label className="btn">
          Ganti folder
          <input type="file" multiple hidden onChange={(e) => open(e.target.files)} {...{ webkitdirectory: "" }} />
        </label>
      </header>

      {tab === "kurasi" && (
        <Kurasi photos={photos} setPhotos={setPhotos} curId={curId} setCurId={setCurId} target={target} setTarget={setTarget}
          hasAlbum={!!design} onBuild={build} onOpenEditor={() => setTab("editor")} />
      )}
      {needAlbum && (
        <div className="empty">
          <p>Belum ada album. Pilih foto di Kurasi, lalu susun albumnya.</p>
          <button type="button" className="btn primary" disabled={!picked.length} onClick={build}>
            Susun album dari {picked.length} foto terpilih
          </button>
        </div>
      )}
      {tab === "editor" && design && (
        <Editor photos={photos} design={design} commit={commit} undo={undo} redo={redo} canUndo={hist.past.length > 0}
          canRedo={hist.future.length > 0} preset={preset} setPreset={setPreset} onRebuild={build} onExport={() => setTab("ekspor")} custom={custom} setCustom={setCustom} />
      )}
      {tab === "ekspor" && design && (
        <Ekspor photos={photos} design={design} preset={preset} setPreset={setPreset} custom={custom} />
      )}
    </div>
  );
}
