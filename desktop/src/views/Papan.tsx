import { useEffect, useRef, useState } from "react";
import { STATUSES, type ProjectMeta, type Status } from "../lib/projects";

type Props = {
  projects: ProjectMeta[];
  onOpen: (p: ProjectMeta) => void;
  onUpdate: (p: ProjectMeta, patch: Partial<ProjectMeta>) => void;
};

const rupiah = (n?: number) => (n ? `Rp ${n.toLocaleString("id-ID")}` : "–");
const daysLeft = (due?: string) => (due ? Math.ceil((new Date(due + "T23:59:59").getTime() - Date.now()) / 86400000) : null);

/** Production board: every album by stage, with deadlines, money and shipping. */
export function Papan({ projects, onOpen, onUpdate }: Props) {
  const [edit, setEdit] = useState<ProjectMeta | null>(null);
  const [draft, setDraft] = useState<Partial<ProjectMeta>>({});
  const [over, setOver] = useState<Status | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (edit) ref.current?.showModal(); }, [edit]);

  const status = (p: ProjectMeta): Status => p.status ?? "desain";
  const active = projects.filter((p) => status(p) !== "selesai");
  const urgent = active.filter((p) => { const d = daysLeft(p.due); return d !== null && d <= 3; }).length;
  const income = projects.reduce((s, p) => s + (p.price ?? 0) - (p.cost ?? 0), 0);

  const card = (p: ProjectMeta) => {
    const d = daysLeft(p.due);
    return (
      <div key={p.id} className="pcard" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}>
        <button type="button" className="proj-open" onClick={() => onOpen(p)}>
          <strong>{p.name}</strong>
          {p.client && <span className="dim">{p.client}</span>}
          <span className="dim">{p.size}</span>
          {p.due && <span className={d !== null && d <= 3 && status(p) !== "selesai" ? "warn" : "dim"}>
            Tenggat {new Date(p.due).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}{d !== null && status(p) !== "selesai" ? (d < 0 ? ` · lewat ${-d} hari` : d === 0 ? " · hari ini" : ` · ${d} hari lagi`) : ""}
          </span>}
          {p.resi && <span className="dim">Resi {p.resi}</span>}
        </button>
        <button type="button" className="btn" onClick={() => { setEdit(p); setDraft({ client: p.client, due: p.due, printer: p.printer, cost: p.cost, price: p.price, resi: p.resi, notes: p.notes, status: status(p) }); }}>Detail</button>
      </div>
    );
  };

  return (
    <div className="board-wrap">
      <div className="board-sum">
        <span>{active.length} album berjalan</span>
        {urgent > 0 && <span className="warn">{urgent} tenggat ≤ 3 hari</span>}
        <span className="dim">Selisih jual − biaya cetak semua album: {rupiah(income)}</span>
        <span className="dim">Seret kartu ke kolom lain untuk mengubah tahapnya.</span>
      </div>
      <div className="board">
        {STATUSES.map((s) => {
          const list = projects.filter((p) => status(p) === s.id).sort((a, b) => (a.due ?? "9").localeCompare(b.due ?? "9"));
          return (
            <section key={s.id} className={`bcol ${over === s.id ? "drop" : ""}`} aria-label={s.label}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const p = projects.find((x) => x.id === e.dataTransfer.getData("text/plain")); if (p && status(p) !== s.id) onUpdate(p, { status: s.id }); }}>
              <h2><span>{s.label}</span><span className="dim">{list.length}</span></h2>
              {list.map(card)}
            </section>
          );
        })}
      </div>

      {edit && (
        <dialog ref={ref} className="dialog" onClose={() => setEdit(null)} aria-labelledby="pd-title">
          <h1 id="pd-title">{edit.name}</h1>
          <div className="dlg-body form-stack">
            <fieldset>
              <legend>Produksi</legend>
              <label className="field">Tahap
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="field">Klien<input type="text" value={draft.client ?? ""} onChange={(e) => setDraft({ ...draft, client: e.target.value })} /></label>
              <label className="field">Tenggat<input type="date" value={draft.due ?? ""} onChange={(e) => setDraft({ ...draft, due: e.target.value })} /></label>
              <label className="field">Percetakan<input type="text" value={draft.printer ?? ""} onChange={(e) => setDraft({ ...draft, printer: e.target.value })} /></label>
            </fieldset>
            <fieldset>
              <legend>Uang dan pengiriman</legend>
              <label className="field">Biaya cetak (Rp)<input type="number" min={0} step={10000} value={draft.cost ?? ""} onChange={(e) => setDraft({ ...draft, cost: +e.target.value || undefined })} /></label>
              <label className="field">Harga jual (Rp)<input type="number" min={0} step={10000} value={draft.price ?? ""} onChange={(e) => setDraft({ ...draft, price: +e.target.value || undefined })} /></label>
              <label className="field">Nomor resi<input type="text" value={draft.resi ?? ""} onChange={(e) => setDraft({ ...draft, resi: e.target.value })} /></label>
            </fieldset>
            <label className="field">Catatan<textarea className="textedit" rows={4} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label>
          </div>
          <div className="dlg-actions">
            <button type="button" className="btn" onClick={() => ref.current?.close()}>Batal</button>
            <button type="button" className="btn primary" onClick={() => { onUpdate(edit, draft); ref.current?.close(); }}>Simpan</button>
          </div>
        </dialog>
      )}
    </div>
  );
}
