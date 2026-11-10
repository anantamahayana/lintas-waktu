import { useEffect, useRef, useState } from "react";
import { MAX_CELLS, validTpl, type Tpl } from "../lib/layout";
import type { GridCell, Preset } from "../lib/print";

type Props = {
  preset: Preset;
  custom: Tpl[];
  setCustom: (list: Tpl[]) => void;
  /** Start as a two-page template when the selected sheet is joined. */
  startSpread: boolean;
  onClose: () => void;
  onUse: (t: Tpl) => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Draw your own layout: set a grid, then mark frames on it by clicking two corners. */
export function TemplateEditor({ preset, custom, setCustom, startSpread, onClose, onUse }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [spread, setSpread] = useState(startSpread);
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(4);
  const [cells, setCells] = useState<GridCell[]>([]);
  const [from, setFrom] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);

  useEffect(() => { ref.current?.showModal(); }, []);

  const owner = (c: number, r: number) => cells.findIndex(([x, y, w, h]) => c >= x && c < x + w && r >= y && r < y + h);
  const rect = (a: [number, number], b: [number, number]): GridCell =>
    [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(a[0] - b[0]) + 1, Math.abs(a[1] - b[1]) + 1];
  const draft = from && hover ? rect(from, hover) : null;
  const draftOk = !!draft && validTpl(cols, rows, [...cells, draft]);

  const click = (c: number, r: number) => {
    if (!from) { setFrom([c, r]); setHover([c, r]); return; }
    const next = rect(from, [c, r]);
    if (validTpl(cols, rows, [...cells, next])) setCells([...cells, next]);
    setFrom(null); setHover(null);
  };
  const resize = (c: number, r: number) => {
    setCols(c); setRows(r); setFrom(null);
    setCells(cells.filter(([x, y, w, h]) => x + w <= c && y + h <= r));
  };
  const reset = (sp: boolean) => { setSpread(sp); setCells([]); setFrom(null); };

  const save = (use: boolean) => {
    if (!validTpl(cols, rows, cells)) return;
    // Frames are filled in reading order: top to bottom, then left to right.
    const sorted = [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const t: Tpl = { id: `c-${Date.now().toString(36)}`, n: sorted.length, label: name.trim() || `Template saya ${custom.length + 1}`, cols, rows, cells: sorted, spread, custom: true };
    setCustom([...custom, t]);
    if (use) onUse(t);
    onClose();
  };

  const aspect = ((spread ? 2 : 1) * preset.pageWmm) / preset.pageHmm;
  const inDraft = (c: number, r: number) => !!draft && c >= draft[0] && c < draft[0] + draft[2] && r >= draft[1] && r < draft[1] + draft[3];

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="tpl-title">
      <h1 id="tpl-title">Template baru</h1>
      <div className="dlg">
        <div className="dlg-side">
          <label className="field">Nama
            <input type="text" value={name} placeholder={`Template saya ${custom.length + 1}`} onChange={(e) => setName(e.target.value)} />
          </label>
          <fieldset className="plain">
            <legend>Berlaku untuk</legend>
            <label className="radio"><input type="radio" name="kind" checked={!spread} onChange={() => reset(false)} /> Satu halaman</label>
            <label className="radio"><input type="radio" name="kind" checked={spread} onChange={() => reset(true)} /> Dua halaman menyambung</label>
          </fieldset>
          <div className="two">
            <label className="field">Kolom
              <input type="number" min={1} max={12} value={cols} onChange={(e) => resize(clamp(+e.target.value || 1, 1, 12), rows)} />
            </label>
            <label className="field">Baris
              <input type="number" min={1} max={12} value={rows} onChange={(e) => resize(cols, clamp(+e.target.value || 1, 1, 12))} />
            </label>
          </div>
          <p className="dim">Klik satu kotak sebagai sudut pertama, lalu kotak lain sebagai sudut seberangnya. Klik bingkai yang sudah ada untuk menghapusnya. Kotak yang dibiarkan kosong menjadi ruang putih.</p>
          <div>{cells.length} bingkai (maksimal {MAX_CELLS}){from ? " · pilih sudut seberang" : ""}</div>
          {from && !draftOk && <div className="warn">Bingkai tidak boleh menimpa bingkai lain.</div>}

          {custom.length > 0 && (
            <>
              <h2>Template saya</h2>
              <ul className="tpl-list">
                {custom.map((t) => (
                  <li key={t.id}>
                    <span>{t.label} · {t.n} foto{t.spread ? " · dua halaman" : ""}</span>
                    <button type="button" className="btn" aria-label={`Hapus ${t.label}`} onClick={() => setCustom(custom.filter((x) => x.id !== t.id))}>Hapus</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="dlg-main">
          <div className="tgrid" style={{ aspectRatio: `${aspect}`, gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
            onMouseLeave={() => from && setHover(from)}>
            {Array.from({ length: rows * cols }, (_, i) => {
              const c = i % cols, r = Math.floor(i / cols), k = owner(c, r);
              return (
                <button key={i} type="button" className={`tcell ${k >= 0 ? "on" : ""} ${inDraft(c, r) ? (draftOk ? "draft" : "bad") : ""}`}
                  aria-label={`Kolom ${c + 1}, baris ${r + 1}${k >= 0 ? `, bingkai ${k + 1}` : ""}`}
                  onClick={() => click(c, r)} onMouseEnter={() => from && setHover([c, r])} onFocus={() => from && setHover([c, r])} />
              );
            })}
            {cells.map(([c, r, cs, rs], k) => (
              <button key={k} type="button" className="tframe" aria-label={`Bingkai ${k + 1}, klik untuk menghapus`}
                style={{ gridColumn: `${c + 1} / span ${cs}`, gridRow: `${r + 1} / span ${rs}` }}
                onClick={() => { if (from) { setFrom(null); setHover(null); } else setCells(cells.filter((_, j) => j !== k)); }}>{k + 1}</button>
            ))}
            {spread && <span className="tfold" />}
          </div>
        </div>
      </div>
      <div className="dlg-actions">
        <button type="button" className="btn" onClick={onClose}>Tutup</button>
        <button type="button" className="btn" disabled={!cells.length} onClick={() => save(false)}>Simpan</button>
        <button type="button" className="btn primary" disabled={!cells.length} onClick={() => save(true)}>Simpan dan pakai di halaman ini</button>
      </div>
    </dialog>
  );
}
