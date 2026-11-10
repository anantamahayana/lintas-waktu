import { useMemo, useState } from "react";
import type { Design } from "../App";
import { exportAlbum, lowResWarnings, spreadFileName, toSpreads } from "../lib/export";
import type { Photo } from "../lib/photos";
import { SIZES, spreadPx, type Preset } from "../lib/print";
import { useLaidPages } from "./Editor";

type Props = { photos: Photo[]; design: Design; preset: Preset; setPreset: (p: Preset) => void };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Print settings (all editable) and the export itself. */
export function Ekspor({ photos, design, preset, setPreset }: Props) {
  const { byId, pages } = useLaidPages(photos, design, preset);
  const spreads = useMemo(() => toSpreads(pages), [pages]);
  const warnings = useMemo(() => lowResWarnings(pages, byId, design.place, preset), [pages, byId, design.place, preset]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState("");

  const px = spreadPx(preset);
  const landscape = preset.pageWmm >= preset.pageHmm;
  const long = Math.max(preset.pageWmm, preset.pageHmm), short = Math.min(preset.pageWmm, preset.pageHmm);
  const sizeId = SIZES.find((s) => s.w === long && s.h === short)?.id ?? "custom";
  const num = (key: keyof Preset, lo: number, hi: number) => ({
    type: "number" as const, min: lo, max: hi, value: preset[key] as number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPreset({ ...preset, [key]: clamp(+e.target.value || 0, lo, hi) }),
  });

  const run = async () => {
    setBusy(true); setDone(0); setMsg("");
    try {
      const where = await exportAlbum(spreads, byId, design.place, preset, setDone);
      setMsg(where === "folder" ? `${spreads.length} file tersimpan di folder yang dipilih.` : `${spreads.length} file diunduh ke folder Unduhan.`);
    } catch (e) {
      setMsg(e instanceof DOMException && e.name === "AbortError" ? "Ekspor dibatalkan." : `Ekspor gagal: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="work">
      <main className="form">
        <h1>Pengaturan cetak</h1>
        <p className="dim">Nilai bawaan mengikuti kebiasaan umum percetakan. Cocokkan dengan percetakan yang dipakai sebelum pesanan pertama.</p>

        <fieldset>
          <legend>Ukuran</legend>
          <label className="field">Ukuran halaman
            <select value={sizeId} onChange={(e) => {
              const s = SIZES.find((x) => x.id === e.target.value);
              if (s) setPreset({ ...preset, pageWmm: landscape ? s.w : s.h, pageHmm: landscape ? s.h : s.w });
            }}>
              {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              <option value="custom">Ukuran bebas</option>
            </select>
          </label>
          <label className="field">Orientasi
            <select value={landscape ? "l" : "p"} onChange={(e) => {
              const l = e.target.value === "l";
              setPreset({ ...preset, pageWmm: l ? long : short, pageHmm: l ? short : long });
            }}>
              <option value="l">Mendatar</option>
              <option value="p">Tegak</option>
            </select>
          </label>
          <label className="field">Lebar halaman (mm)<input {...num("pageWmm", 50, 600)} /></label>
          <label className="field">Tinggi halaman (mm)<input {...num("pageHmm", 50, 600)} /></label>
          <label className="field">Jumlah halaman (untuk susun otomatis)<input {...num("pages", 2, 200)} step={2} /></label>
        </fieldset>

        <fieldset>
          <legend>Batas cetak</legend>
          <label className="field">Bleed (mm)<input {...num("bleedMm", 0, 10)} /></label>
          <label className="field">Zona aman (mm)<input {...num("safeMm", 0, 30)} /></label>
          <label className="field">Resolusi (dpi)<input {...num("dpi", 72, 600)} /></label>
        </fieldset>

        <fieldset>
          <legend>Tampilan</legend>
          <label className="field">Margin halaman (%)<input {...num("marginPct", 0, 20)} step={0.5} /></label>
          <label className="field">Jarak antar foto (%)<input {...num("gapPct", 0, 10)} step={0.5} /></label>
          <label className="field">Latar halaman<input type="color" value={preset.bg} onChange={(e) => setPreset({ ...preset, bg: e.target.value })} /></label>
        </fieldset>

        <fieldset>
          <legend>Berkas</legend>
          <label className="field">Nama file
            <input type="text" value={preset.pattern} onChange={(e) => setPreset({ ...preset, pattern: e.target.value })} />
          </label>
          <div className="field">Contoh<div className="dim">{spreadFileName(preset, 0)}</div></div>
        </fieldset>
      </main>

      <aside className="panel wide" aria-label="Ekspor">
        <h2>Ringkasan ekspor</h2>
        <dl>
          <dt>Isi</dt><dd>{spreads.length} spread · {pages.length} halaman</dd>
          <dt>Piksel</dt><dd>{px.w.toLocaleString("id-ID")} × {px.h.toLocaleString("id-ID")} per spread</dd>
          <dt>Bleed</dt><dd>{preset.bleedMm} mm, sudah termasuk</dd>
          <dt>Format</dt><dd>JPG per spread · sRGB · {preset.dpi} dpi</dd>
        </dl>
        {warnings.length > 0 && (
          <div className="notice">
            <strong>{warnings.length} foto beresolusi rendah</strong>
            <ul>
              {warnings.slice(0, 6).map((w) => <li key={w.id}>Halaman {w.page}: {byId.get(w.id)?.name} · {w.dpi} dpi</li>)}
              {warnings.length > 6 && <li>dan {warnings.length - 6} lainnya</li>}
            </ul>
          </div>
        )}
        <button type="button" className="btn primary big" disabled={busy || !spreads.length} onClick={run}>
          {busy ? `Mengekspor ${done} dari ${spreads.length}…` : "Ekspor file cetak"}
        </button>
        {busy && <progress max={spreads.length} value={done} aria-label="Kemajuan ekspor" />}
        {msg && <p role="status">{msg}</p>}
        <p className="dim">File dibuat dari foto asli resolusi penuh. Sampul, PDF pratinjau, dan proof ke galeri klien belum tersedia di versi ini.</p>
      </aside>
    </div>
  );
}
