import { useEffect, useRef, useState } from "react";
import { Icon } from "../lib/icons";
import { STATUSES, type ProjectMeta, type Status } from "../lib/projects";
import { Btn, IconBtn, Row } from "./Shell";

type Props = {
  projects: ProjectMeta[];
  onOpen: (p: ProjectMeta) => void;
  onUpdate: (p: ProjectMeta, patch: Partial<ProjectMeta>) => void;
};

const rupiah = (n?: number) => (n ? `Rp ${n.toLocaleString("id-ID")}` : "–");
const daysLeft = (due?: string) => (due ? Math.ceil((new Date(due + "T23:59:59").getTime() - Date.now()) / 86400000) : null);

/** Production board (Figma page 03): every album by stage; drag a card to change its stage. */
export function Papan({ projects, onOpen, onUpdate }: Props) {
  const [edit, setEdit] = useState<ProjectMeta | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [q, setQ] = useState("");
  const status = (p: ProjectMeta): Status => p.status ?? "desain";
  const active = projects.filter((p) => status(p) !== "selesai");
  const urgent = active.filter((p) => { const d = daysLeft(p.due); return d !== null && d <= 3; }).length;
  const income = projects.reduce((s, p) => s + (p.price ?? 0) - (p.cost ?? 0), 0);
  const shown = projects.filter((p) => !q.trim() || `${p.name} ${p.client ?? ""} ${p.printer ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  const card = (p: ProjectMeta) => {
    const d = daysLeft(p.due), late = d !== null && d <= 3 && status(p) !== "selesai";
    return (
      <div key={p.id} className="bcard" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; }}
        onClick={() => setEdit(p)} onDoubleClick={() => onOpen(p)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setEdit(p); }}>
        <strong>{p.name}</strong>
        <span className="mt">{[p.client && `Klien: ${p.client}`, p.printer].filter(Boolean).join(" · ") || p.size}</span>
        {p.due && <span className={`due ${late ? "late" : ""}`}><Icon name="calendar" size={12} />
          {new Date(p.due).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}{d !== null && status(p) !== "selesai" ? (d < 0 ? ` · lewat ${-d} hari` : d === 0 ? " · hari ini" : ` · ${d} hari lagi`) : ""}</span>}
        {p.resi && <span className="due"><Icon name="truck" size={12} />{p.resi}</span>}
      </div>
    );
  };

  return (
    <>
      <div className="toolbar">
        <div><h2>Papan produksi</h2><p className="caption" style={{ marginTop: 2 }}>Seret kartu ke kolom lain untuk mengubah tahap. Klik = detail, klik dua kali = buka proyek.</p></div>
        <span className="grow" />
        <input className="search" type="text" placeholder="Cari album, klien, percetakan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" />
      </div>
      <div className="board-sum">
        <span>{active.length} album berjalan</span>
        {urgent > 0 && <span className="warn-text"><Icon name="triangle-alert" size={14} />{urgent} tenggat ≤ 3 hari</span>}
        <span>Selisih jual − biaya cetak: {rupiah(income)}</span>
      </div>
      <div className="board">
        {STATUSES.map((s) => {
          const list = shown.filter((p) => status(p) === s.id).sort((a, b) => (a.due ?? "9").localeCompare(b.due ?? "9"));
          return (
            <section key={s.id} className={`bcol ${over === s.id ? "drop" : ""}`} aria-label={s.label}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const p = projects.find((x) => x.id === e.dataTransfer.getData("text/plain")); if (p && status(p) !== s.id) onUpdate(p, { status: s.id }); }}>
              <h3><i className={`st-${s.id}`} />{s.label}<span className="n">{list.length}</span></h3>
              {list.map(card)}
            </section>
          );
        })}
      </div>
      {edit && <Detail p={edit} onClose={() => setEdit(null)} onOpen={() => onOpen(edit)} onSave={(patch) => onUpdate(edit, patch)} />}
    </>
  );
}

function Detail({ p, onClose, onOpen, onSave }: { p: ProjectMeta; onClose: () => void; onOpen: () => void; onSave: (patch: Partial<ProjectMeta>) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<Partial<ProjectMeta>>({ client: p.client, due: p.due, printer: p.printer, cost: p.cost, price: p.price, resi: p.resi, notes: p.notes, status: p.status ?? "desain" });
  useEffect(() => { ref.current?.showModal(); }, []);
  const money = (k: "cost" | "price") => <input type="text" inputMode="numeric" value={d[k] ? d[k]!.toLocaleString("id-ID") : ""} placeholder="0"
    onChange={(e) => setD({ ...d, [k]: +e.target.value.replace(/\D/g, "") || undefined })} style={{ width: "100%" }} />;
  return (
    <dialog ref={ref} className="dlg" onClose={onClose} aria-labelledby="pd-t">
      <header className="dlg-h"><h1 id="pd-t">{p.name}</h1><span className="grow" /><IconBtn icon="x" tip="Tutup (Esc)" onClick={() => ref.current?.close()} /></header>
      <div className="dlg-b">
        <div className="form-grid">
          <Row label="Tahap"><select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as Status })}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Row>
          <Row label="Tenggat"><input type="date" value={d.due ?? ""} onChange={(e) => setD({ ...d, due: e.target.value })} style={{ width: "100%" }} /></Row>
          <Row label="Klien"><input type="text" value={d.client ?? ""} onChange={(e) => setD({ ...d, client: e.target.value })} style={{ width: "100%" }} /></Row>
          <Row label="Percetakan"><input type="text" value={d.printer ?? ""} onChange={(e) => setD({ ...d, printer: e.target.value })} style={{ width: "100%" }} /></Row>
          <Row label="Biaya cetak (Rp)">{money("cost")}</Row>
          <Row label="Harga jual (Rp)">{money("price")}</Row>
          <Row label="Nomor resi"><input type="text" value={d.resi ?? ""} onChange={(e) => setD({ ...d, resi: e.target.value })} style={{ width: "100%" }} /></Row>
        </div>
        <label className="fs"><span className="row-label">Catatan</span><textarea value={d.notes ?? ""} onChange={(e) => setD({ ...d, notes: e.target.value })} /></label>
      </div>
      <footer className="dlg-f">
        <Btn label="Buka proyek" icon="folder-open" kind="ghost" onClick={() => { ref.current?.close(); onOpen(); }} />
        <span className="grow" />
        <Btn label="Batal" onClick={() => ref.current?.close()} />
        <Btn label="Simpan" kind="primary" onClick={() => { onSave(d); ref.current?.close(); }} />
      </footer>
    </dialog>
  );
}
