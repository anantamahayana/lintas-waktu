import { useEffect, useMemo, useRef, useState } from "react";
import { ask } from "../lib/ask";
import { Icon } from "../lib/icons";
import { isNative } from "../lib/platform";
import { DEFAULT_PRESET, STARTS, type Preset } from "../lib/print";
import { STATUSES, type ProjectMeta, type Status } from "../lib/projects";
import { Papan } from "./Papan";
import { PresetForm } from "./PresetForm";
import { Btn, IconBtn, Kbd, NumField, Row, Seg, StatusBar } from "./Shell";

export type { ProjectMeta };
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label])) as Record<string, string>;

type Props = {
  projects: ProjectMeta[];
  onNew: () => void;
  onOpen: (p: ProjectMeta) => void;
  onDelete: (p: ProjectMeta) => void;
  /** Windows app: open a project file from anywhere (a copy from another laptop, a backup). */
  onOpenFile?: () => void;
  onUpdate: (p: ProjectMeta, patch: Partial<ProjectMeta>) => void;
  onTemplates: () => void;
  onKeys: () => void;
  projectsDir?: string;
};

const daysLeft = (due?: string) => (due ? Math.ceil((new Date(due + "T23:59:59").getTime() - Date.now()) / 86400000) : null);
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "baru saja"; if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60); if (h < 24) return `${h} jam lalu`;
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
const greeting = () => { const h = new Date().getHours(); return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam"; };

export function StatusChip({ s }: { s?: Status }) {
  const id = s ?? "desain";
  return <span className="chip"><i className={`st-${id}`} />{STATUS_LABEL[id]}</span>;
}

/** Home (Figma page 03): recent projects, quick start, production board. */
export function Beranda({ projects, onNew, onOpen, onDelete, onOpenFile, onUpdate, onTemplates, onKeys, projectsDir }: Props) {
  const [view, setView] = useState<"proyek" | "papan">("proyek");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"updated" | "name" | "due">("updated");
  const [layout, setLayout] = useState<"kisi" | "daftar">("kisi");
  const active = projects.filter((p) => (p.status ?? "desain") !== "selesai").length;
  const list = useMemo(() => projects
    .filter((p) => (!status || (p.status ?? "desain") === status) && (!q.trim() || `${p.name} ${p.client ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "due" ? (a.due ?? "9").localeCompare(b.due ?? "9") : b.updated - a.updated), [projects, q, status, sort]);
  const last = [...projects].sort((a, b) => b.updated - a.updated)[0];

  const card = (p: ProjectMeta) => {
    const d = daysLeft(p.due), late = d !== null && d <= 3 && (p.status ?? "desain") !== "selesai";
    return (
      <div key={p.id} className="pcard" role="button" tabIndex={0} onClick={() => onOpen(p)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(p); }} title={p.folder}>
        <div className="cov"><Icon name="book-open" size={28} /></div>
        <div className="bd">
          <span className="nm">{p.name}</span>
          <span className="mt">{p.size || "Belum ada album"} · {p.picked} dari {p.photos.toLocaleString("id-ID")} foto dipilih</span>
          <span className="ft"><StatusChip s={p.status} /><span className="grow" />
            <span className={late ? "late" : ""}>{p.due ? `Tenggat ${new Date(p.due).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : `Diubah ${ago(p.updated)}`}</span></span>
        </div>
        <span className="del" onClick={(e) => e.stopPropagation()}>
          <IconBtn icon="trash-2" small tip="Hapus proyek" onClick={async () => { if (await ask(`“${p.name}” dihapus dari daftar proyek. Foto asli di folder sumber tidak ikut terhapus.`, "Hapus proyek", "Batal", { title: "Hapus proyek?", danger: true })) onDelete(p); }} />
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="home">
        <nav className="home-nav" aria-label="Beranda">
          <button type="button" className={`nav-i ${view === "proyek" ? "on" : ""}`} onClick={() => setView("proyek")}><Icon name="house" />Beranda</button>
          <button type="button" className={`nav-i ${view === "papan" ? "on" : ""}`} onClick={() => setView("papan")}><Icon name="kanban" />Papan produksi<span className="n">{active ? `${active} aktif` : ""}</span></button>
          <button type="button" className="nav-i" onClick={onTemplates} data-cmd="app.templates"><Icon name="layout-template" />Template tata letak</button>
          <button type="button" className="nav-i" onClick={onKeys} data-cmd="app.prefs"><Icon name="keyboard" />Pintasan keyboard</button>
          <div className="home-tip"><span className="overline">Tip</span><span className="caption">Tekan Ctrl+/ kapan saja untuk melihat semua pintasan.</span></div>
        </nav>

        {view === "papan" ? (
          <div className="home-main"><Papan projects={projects} onOpen={onOpen} onUpdate={onUpdate} /></div>
        ) : projects.length === 0 ? (
          <div className="home-main">
            <div className="empty-state">
              <div className="ill"><Icon name="book-open" size={32} /></div>
              <h1>Buat album pertama</h1>
              <p>Pilih folder berisi foto acara. LW Album membaca JPEG dan RAW (CR3, NEF, ARW, dan lainnya), lalu Anda memilih foto terbaik sebelum menyusun halaman. Foto tetap di laptop ini; tidak ada yang diunggah.</p>
              <div className="two"><Btn label="Proyek baru…" icon="folder-open" kind="primary" onClick={onNew} />{onOpenFile && <Btn label="Buka proyek…" icon="file-text" onClick={onOpenFile} />}</div>
              <div className="steps">{["Kurasi", "Tata letak", "Sampul", "Ekspor"].map((t, i) => <span key={t}><i>{i + 1}</i>{t}</span>)}</div>
            </div>
          </div>
        ) : (
          <div className="home-main">
            <div><h1>{greeting()}</h1><p className="sub">Lanjutkan album yang sedang berjalan atau mulai dari folder foto.</p></div>
            <div className="quick">
              <button type="button" className="qcard primary" onClick={onNew}>
                <span className="qi"><Icon name="folder-open" size={24} /></span>
                <span><strong>Proyek baru dari folder</strong><p>Pilih folder foto; RAW + JPEG terbaca otomatis.</p><Kbd k="Ctrl+N" /></span>
              </button>
              <button type="button" className="qcard" onClick={onOpenFile} disabled={!onOpenFile}>
                <span className="qi"><Icon name="file-text" size={24} /></span>
                <span><strong>Buka proyek…</strong><p>{onOpenFile ? "File .lwalbum dari folder mana pun." : "Tersedia di aplikasi Windows."}</p><Kbd k="Ctrl+O" /></span>
              </button>
              {last && (
                <button type="button" className="qcard" onClick={() => onOpen(last)}>
                  <span className="qi"><Icon name="history" size={24} /></span>
                  <span><strong>Lanjutkan: {last.name}</strong><p>{last.size || "Kurasi"} · diubah {ago(last.updated)}</p></span>
                </button>
              )}
            </div>
            <div className="toolbar">
              <h2>Proyek terbaru</h2><span className="grow" />
              <input className="search" type="text" placeholder="Cari nama atau klien…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari proyek" />
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Saring status">
                <option value="">Semua status</option>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Urutkan">
                <option value="updated">Terakhir diubah</option><option value="name">Nama</option><option value="due">Tenggat</option>
              </select>
              <Seg items={[{ v: "kisi", label: "Kisi" }, { v: "daftar", label: "Daftar" }]} value={layout} onChange={setLayout} />
            </div>
            {list.length === 0 ? <p className="dimtext">Tidak ada proyek yang cocok dengan pencarian.</p> : <div className={`cards ${layout === "daftar" ? "list" : ""}`}>{list.map(card)}</div>}
          </div>
        )}
      </div>
      <StatusBar left={`${projects.length} proyek${isNative && projectsDir ? ` · ${projectsDir}` : " · tersimpan di browser ini"}`} right={<span className="dimtext">LW Album 0.3</span>} />
    </>
  );
}

/** New project (Figma page 07): name, size, binding; then the folder. */
export function NewProject({ onCancel, onCreate }: { onCancel: () => void; onCreate: (name: string, p: Preset) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [start, setStart] = useState(STARTS[0].id);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [more, setMore] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.showModal(); nameRef.current?.focus(); }, []);
  const pick = (id: string) => { const s = STARTS.find((x) => x.id === id)!; setStart(id); setPreset({ ...DEFAULT_PRESET, pages: preset.pages, bleedMm: preset.bleedMm, dpi: preset.dpi, ...s.preset }); };
  const go = () => { const n = name.trim(); ref.current?.close(); onCreate(n, preset); };
  return (
    <dialog ref={ref} className="dlg" style={{ width: "min(760px, 95vw)" }} onClose={onCancel} aria-labelledby="np-t"
      onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) go(); }}>
      <header className="dlg-h"><h1 id="np-t">Proyek baru</h1><span className="grow" /><IconBtn icon="x" tip="Tutup (Esc)" onClick={() => ref.current?.close()} /></header>
      <div className="dlg-b">
        <Row label="Nama proyek"><input ref={nameRef} type="text" value={name} placeholder="mis. Ayu & Made — Ubud (kosong = nama folder)" onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} /></Row>
        <h2 className="fs" style={{ fontSize: 13, fontWeight: 600 }}>Ukuran album</h2>
        <div className="sizes">
          {STARTS.map((s) => {
            const w = s.preset.pageWmm ?? 297, h = s.preset.pageHmm ?? 210, k = 40 / Math.max(w, h);
            return (
              <button key={s.id} type="button" className={`size ${start === s.id ? "on" : ""}`} onClick={() => pick(s.id)}>
                <span className="pv"><i style={{ width: w * k, height: h * k }} /></span>
                <strong>{s.label.split(" · ")[0]}</strong><span>{s.label.split(" · ")[1]} · {w / 10} × {h / 10} cm</span>
              </button>
            );
          })}
        </div>
        <div className="form-grid">
          <Row label="Jilid"><Seg full items={[{ v: "layflat", label: "Lay-flat" }, { v: "biasa", label: "Biasa" }]} value={preset.binding} onChange={(v) => setPreset({ ...preset, binding: v })} /></Row>
          <Row label="Bleed"><NumField value={preset.bleedMm} min={0} max={10} unit="mm" onChange={(v) => setPreset({ ...preset, bleedMm: v })} /></Row>
          <Row label="Halaman"><NumField value={preset.pages} min={2} max={200} step={2} unit="hal." onChange={(v) => setPreset({ ...preset, pages: Math.round(v / 2) * 2 })} /></Row>
          <Row label="Resolusi"><NumField value={preset.dpi} min={72} max={600} step={50} unit="dpi" onChange={(v) => setPreset({ ...preset, dpi: v })} /></Row>
        </div>
        <button type="button" className="sec-t" style={{ height: 24 }} aria-expanded={more} onClick={() => setMore(!more)}><Icon name={more ? "chevron-down" : "chevron-right"} size={14} />Semua properti album</button>
        {more && <PresetForm preset={preset} setPreset={(p) => { setPreset(p); setStart(""); }} />}
      </div>
      <footer className="dlg-f">
        <span className="caption">Bisa diubah kapan saja di Album › Properti album (Ctrl+Shift+P).</span><span className="grow" />
        <Btn label="Batal" onClick={() => ref.current?.close()} />
        <Btn label="Pilih folder foto…" icon="folder-open" kind="primary" onClick={go} />
      </footer>
    </dialog>
  );
}
