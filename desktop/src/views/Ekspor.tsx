import { useMemo, useState } from "react";
import type { Design } from "../App";
import { exportAlbum, lowResWarnings, spreadFileName, toSpreads } from "../lib/export";
import type { Tpl } from "../lib/layout";
import type { Photo } from "../lib/photos";
import { spreadPx, type Preset } from "../lib/print";
import { isEmpty } from "../lib/layout";
import { PresetForm } from "./PresetForm";
import { useLaidPages } from "./Editor";

type Props = { photos: Photo[]; design: Design; preset: Preset; setPreset: (p: Preset) => void; custom: Tpl[] };

/** Print settings (all editable) and the export itself. */
export function Ekspor({ photos, design, preset, setPreset, custom }: Props) {
  const { byId, pages } = useLaidPages(photos, design, preset, custom);
  const joinedCount = pages.filter((p) => p.side === "both").length;
  const blanks = design.album.order.filter(isEmpty).length;
  const spreads = useMemo(() => toSpreads(pages), [pages]);
  const warnings = useMemo(() => lowResWarnings(pages, byId, design.place, preset), [pages, byId, design.place, preset]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState("");

  const px = spreadPx(preset);
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

        <PresetForm preset={preset} setPreset={setPreset} />

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
          <dt>Isi</dt><dd>{spreads.length} spread · {spreads.length * 2} halaman</dd>
          <dt>Piksel</dt><dd>{px.w.toLocaleString("id-ID")} × {px.h.toLocaleString("id-ID")} per spread</dd>
          <dt>Bleed</dt><dd>{preset.bleedMm} mm, sudah termasuk</dd>
          <dt>Format</dt><dd>JPG per spread · sRGB · {preset.dpi} dpi</dd>
        </dl>
        {preset.binding === "biasa" && joinedCount > 0 && (
          <div className="notice">{joinedCount} spread memakai foto yang melintasi lipatan, padahal jilidnya biasa. Bagian di lipatan bisa tertelan jilid.</div>
        )}
        {blanks > 0 && <div className="notice">{blanks} bingkai masih kosong; di file cetak bagian itu berwarna latar.</div>}
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
