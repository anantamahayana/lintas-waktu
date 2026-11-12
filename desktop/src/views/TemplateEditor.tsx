import { useEffect, useRef, useState } from "react";
import { Icon } from "../lib/icons";
import { MAX_CELLS, validTpl, type Tpl } from "../lib/layout";
import type { GridCell, Preset } from "../lib/print";
import { Btn, IconBtn, NumField, Row, Seg } from "./Shell";

type Props = {
  preset: Preset;
  custom: Tpl[];
  setCustom: (list: Tpl[]) => void;
  /** Start as a two-page template when the selected sheet is joined. */
  startSpread: boolean;
  onClose: () => void;
  /** Set when a page is selected in the editor: "Simpan dan pakai" puts the template there. */
  onUse?: (t: Tpl) => void;
};

/** Template editor (Figma page 07): set a grid, then mark frames on it by clicking two corners. */
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
  const resize = (c: number, r: number) => { setCols(c); setRows(r); setFrom(null); setCells(cells.filter(([x, y, w, h]) => x + w <= c && y + h <= r)); };
  const reset = (sp: boolean) => { setSpread(sp); setCells([]); setFrom(null); };
  const save = (use: boolean) => {
    if (!validTpl(cols, rows, cells)) return;
    const sorted = [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const t: Tpl = { id: `c-${Date.now().toString(36)}`, n: sorted.length, label: name.trim() || `Template saya ${custom.length + 1}`, cols, rows, cells: sorted, spread, custom: true };
    setCustom([...custom, t]);
    if (use) onUse?.(t);
    ref.current?.close();
  };
  const aspect = ((spread ? 2 : 1) * preset.pageWmm) / preset.pageHmm;
  const inDraft = (c: number, r: number) => !!draft && c >= draft[0] && c < draft[0] + draft[2] && r >= draft[1] && r < draft[1] + draft[3];

  return (
    <dialog ref={ref} className="dlg dlg-xl" onClose={onClose} aria-labelledby="tpl-t">
      <header className="dlg-h"><h1 id="tpl-t">Editor template</h1><span className="grow" /><IconBtn icon="x" tip="Tutup (Esc)" onClick={() => ref.current?.close()} /></header>
      <div className="dlg-b te">
        <div className="te-list">
          <span className="overline">Template saya</span>
          {custom.length === 0 ? <p className="caption">Belum ada. Template yang disimpan tampil di panel Tata letak untuk jumlah foto yang sama.</p> : (
            <ul className="tpl-list">
              {custom.map((t) => (
                <li key={t.id}><Icon name="layout-template" size={14} /><span title={t.label}>{t.label} · {t.n} foto{t.spread ? " · panorama" : ""}</span>
                  <IconBtn icon="trash-2" small tip={`Hapus ${t.label}`} onClick={() => setCustom(custom.filter((x) => x.id !== t.id))} /></li>
              ))}
            </ul>
          )}
        </div>
        <div className="te-main">
          <Seg items={[{ v: "page", label: "Satu halaman" }, { v: "spread", label: "Panorama dua halaman" }]} value={spread ? "spread" : "page"} onChange={(v) => reset(v === "spread")} />
          <div className="tgrid" style={{ aspectRatio: `${aspect}`, gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, width: aspect >= 1 ? "100%" : `${aspect * 380}px` }}
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
              <button key={k} type="button" className="tframe" aria-label={`Bingkai ${k + 1}, klik untuk menghapus`} data-tip="Klik untuk menghapus bingkai ini"
                style={{ gridColumn: `${c + 1} / span ${cs}`, gridRow: `${r + 1} / span ${rs}` }}
                onClick={() => { if (from) { setFrom(null); setHover(null); } else setCells(cells.filter((_, j) => j !== k)); }}>{k + 1}</button>
            ))}
            {spread && <span className="tfold" />}
          </div>
          <span className="caption">{from ? "Klik kotak sudut seberangnya" : "Klik satu kotak sebagai sudut pertama, lalu kotak sudut seberangnya"}</span>
        </div>
        <div className="te-side">
          <Row label="Nama"><input type="text" value={name} placeholder={`Template saya ${custom.length + 1}`} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} /></Row>
          <Row label="Kolom"><NumField value={cols} min={1} max={12} onChange={(v) => resize(Math.round(v), rows)} /></Row>
          <Row label="Baris"><NumField value={rows} min={1} max={12} onChange={(v) => resize(cols, Math.round(v))} /></Row>
          <p className="caption">{cells.length} bingkai (maksimal {MAX_CELLS}). Kotak yang dibiarkan kosong menjadi ruang putih. Foto mengisi bingkai dari kiri atas ke kanan bawah.</p>
          {from && !draftOk && <div className="note warn"><Icon name="triangle-alert" size={14} />Bingkai tidak boleh menimpa bingkai lain.</div>}
          <Btn label="Kosongkan grid" icon="rotate-ccw" kind="ghost" disabled={!cells.length} onClick={() => { setCells([]); setFrom(null); }} />
        </div>
      </div>
      <footer className="dlg-f">
        <span className="caption">{onUse ? "“Simpan dan pakai” memasang template di halaman yang sedang dipilih." : "Buka dari Tata letak untuk langsung memakai template di halaman."}</span>
        <span className="grow" />
        <Btn label="Tutup" onClick={() => ref.current?.close()} />
        <Btn label="Simpan" disabled={!cells.length} onClick={() => save(false)} />
        {onUse && <Btn label="Simpan dan pakai" kind="primary" disabled={!cells.length} onClick={() => save(true)} />}
      </footer>
    </dialog>
  );
}
