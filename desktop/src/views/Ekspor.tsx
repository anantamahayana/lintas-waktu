import { useMemo, useState } from "react";
import type { Design } from "../App";
import { coverFileName, exportAlbum, hasCover, lowResWarnings, printPdf, proofPdf, saveFile, spreadFileName, toSpreads } from "../lib/export";
import { coverMm } from "../lib/cover";
import { Icon, type IconName } from "../lib/icons";
import { useCommands } from "../lib/keys";
import { isEmpty, type Tpl } from "../lib/layout";
import type { Photo } from "../lib/photos";
import { mmToPx, spreadPx, type Preset } from "../lib/print";
import type { Status } from "../lib/projects";
import { useLaidPages } from "./Editor";
import { MiniSheet } from "./Overview";
import { Btn, NumField, Row, StatusBar, type Module } from "./Shell";

type Out = "proof" | "jpeg" | "pdf";
type Props = { photos: Photo[]; design: Design; preset: Preset; setPreset: (p: Preset) => void; custom: Tpl[]; onGo: (m: Module) => void; onDone: (status?: Status) => void };

const OUTS: { v: Out; icon: IconName; title: string; desc: string }[] = [
  { v: "proof", icon: "file-text", title: "Proof untuk klien", desc: "PDF ringan untuk WhatsApp/email: tanpa bleed, nomor halaman, sampul di depan." },
  { v: "jpeg", icon: "images", title: "File cetak per spread", desc: "JPEG resolusi penuh dari foto asli, bleed termasuk, sampul sebagai _00_Sampul." },
  { v: "pdf", icon: "printer", title: "PDF cetak", desc: "Satu PDF resolusi penuh: sampul + semua spread, ukuran halaman sesuai cetak." },
];

/** Export (Figma page 06): pick an output, check it, run it. */
export function Ekspor({ photos, design, preset, setPreset, custom, onGo, onDone }: Props) {
  const { byId, pages } = useLaidPages(photos, design, preset, custom);
  const spreads = useMemo(() => toSpreads(pages), [pages]);
  const warnings = useMemo(() => lowResWarnings(pages, byId, design.place, preset), [pages, byId, design.place, preset]);
  const blanks = design.album.order.filter(isEmpty).length;
  const joinedCount = pages.filter((p) => p.side === "both").length;
  const openNotes = design.album.pages.filter((p) => p.note && !p.noteDone).length;
  const texts = design.album.pages.reduce((n, p) => n + (p.texts?.length ?? 0), 0);
  const cover = design.cover ?? null;
  const withCover = !!cover && hasCover(cover);
  const [out, setOut] = useState<Out>("proof");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [toProof, setToProof] = useState(true);
  const px = spreadPx(preset), cm = coverMm(preset);
  const total = spreads.length + (withCover && out !== "proof" ? 1 : 0);
  const sizeMb = out === "proof" ? Math.max(1, Math.round(spreads.length * 0.6)) : Math.round((px.w * px.h * 3 * (spreads.length + (withCover ? 1 : 0))) / 1048576 / 9);
  const name = (preset.pattern || "Album").replace(/[\\/:*?"<>|]+/g, "-");

  const run = async () => {
    if (busy || !spreads.length) return;
    setBusy(true); setDone(0); setMsg(null);
    try {
      if (out === "jpeg") {
        const where = await exportAlbum(spreads, byId, design.place, preset, setDone, cover);
        const n = spreads.length + (withCover ? 1 : 0);
        setMsg({ ok: true, text: where === "folder" ? `${n} file tersimpan di folder yang dipilih.` : where === "zip" ? `${n} file disimpan dalam satu file .zip. Ekstrak dulu sebelum dikirim ke percetakan.` : `${n} file diunduh ke folder Unduhan.` });
        onDone();
      } else {
        const pdf = out === "pdf" ? await printPdf(cover, spreads, byId, design.place, preset, setDone) : await proofPdf(cover, spreads, byId, design.place, preset, setDone);
        await saveFile(pdf, `${name} - ${out === "pdf" ? "cetak" : "pratinjau"}.pdf`);
        setMsg({ ok: true, text: `${out === "pdf" ? "PDF cetak" : "PDF proof"} siap (${(pdf.size / 1048576).toFixed(1)} MB).${out === "proof" ? " Kirim ke klien; nomor halaman tertulis di bawah tiap spread." : ""}` });
        onDone(out === "proof" && toProof ? "proof" : undefined);
      }
    } catch (e) {
      setMsg(e instanceof DOMException && e.name === "AbortError" ? { ok: false, text: "Ekspor dibatalkan." } : { ok: false, text: `Ekspor gagal: ${e instanceof Error ? e.message : String(e)}` });
    } finally { setBusy(false); }
  };
  useCommands({ "x.run": { run: () => void run(), enabled: !busy && !!spreads.length } });

  const check = (ok: boolean, title: string, desc: string, act?: { label: string; go: () => void }) => (
    <div className={`check-i ${ok ? "ok" : "warn"}`}>
      <Icon name={ok ? "circle-check" : "triangle-alert"} />
      <div><strong>{title}</strong><p>{desc}</p></div>
      {act && <button type="button" className="act" onClick={act.go}>{act.label}</button>}
    </div>
  );

  return (
    <>
      <div className="work">
        <aside className="side" aria-label="Keluaran" style={{ width: 320 }}>
          <div className="scroll pad" style={{ gap: 8 }}>
            <span className="overline">Keluaran</span>
            {OUTS.map((o) => (
              <button key={o.v} type="button" className={`out ${out === o.v ? "on" : ""}`} onClick={() => { setOut(o.v); setMsg(null); }} aria-pressed={out === o.v}>
                <span className="radio" />
                <span><strong><Icon name={o.icon} size={14} />{o.title}</strong><p>{o.desc}</p>
                  <p className="m">{o.v === "proof" ? `1 file PDF · ±${Math.max(1, Math.round(spreads.length * 0.6))} MB` : o.v === "jpeg" ? `${spreads.length + (withCover ? 1 : 0)} file JPEG` : "1 file PDF"}</p></span>
              </button>
            ))}
            <div className="note"><Icon name="info" size={14} />Ukuran, bleed, dpi, dan jilid diatur di Album › Properti album (Ctrl+Shift+P).</div>
          </div>
        </aside>

        <main className="xmain">
          <div><h1>{OUTS.find((o) => o.v === out)!.title}</h1><p className="caption" style={{ marginTop: 4 }}>{OUTS.find((o) => o.v === out)!.desc}</p></div>
          <div className="xform">
            {out === "proof" ? (
              <>
                <Row label="Isi"><span>{withCover ? "Sampul + " : ""}{spreads.length} spread · {spreads.length * 2} halaman, nomor halaman di bawah tiap spread</span></Row>
                <Row label="Resolusi"><span>Layar &amp; HP (kecil, cepat dibuka)</span></Row>
                <Row label="Nama file"><div className="row-ctl h"><input type="text" value={preset.pattern} onChange={(e) => setPreset({ ...preset, pattern: e.target.value })} style={{ flex: 1 }} /><span className="caption">- pratinjau.pdf</span></div></Row>
                <Row label="Setelah ekspor"><label className="ck"><input type="checkbox" checked={toProof} onChange={(e) => setToProof(e.target.checked)} />Ubah tahap proyek ke “Proof ke klien”</label></Row>
                <Row label="Atau online"><Btn label="Kirim proof ke klien…" icon="send" cmd="app.proof" tip="Link + PIN di situs: klien melihat album, menulis catatan, dan menyetujui" /></Row>
              </>
            ) : (
              <>
                <Row label="Nama file"><div className="row-ctl h"><input type="text" value={preset.pattern} onChange={(e) => setPreset({ ...preset, pattern: e.target.value })} style={{ flex: 1 }} /></div></Row>
                <Row label="Contoh"><span className="caption">{out === "jpeg" ? `${spreadFileName(preset, 0)}${withCover ? ` · ${coverFileName(preset)}` : ""}` : `${name} - cetak.pdf`}</span></Row>
                <Row label="Resolusi"><div className="row-ctl h"><NumField value={preset.dpi} min={72} max={600} step={50} unit="dpi" width={120} onChange={(v) => setPreset({ ...preset, dpi: v })} /><span className="caption">{px.w.toLocaleString("id-ID")} × {px.h.toLocaleString("id-ID")} px per spread</span></div></Row>
                <Row label="Bleed"><span>{preset.bleedMm} mm di setiap tepi, sudah termasuk</span></Row>
                {withCover && <Row label="Sampul"><span>{Math.round(mmToPx(cm.w, preset.dpi)).toLocaleString("id-ID")} × {Math.round(mmToPx(cm.h, preset.dpi)).toLocaleString("id-ID")} px</span></Row>}
                <Row label="Warna"><span>sRGB · JPEG kualitas tinggi</span></Row>
              </>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="overline">Pratinjau halaman</span>
            <div className="strip-prev">
              {spreads.slice(0, 6).map((sp, i) => (
                <figure key={i}><MiniSheet sp={sp} preset={preset} byId={byId} place={design.place} /><figcaption>{i * 2 + 1}–{i * 2 + 2}</figcaption></figure>
              ))}
              {spreads.length > 6 && <figure style={{ justifyContent: "center" }}><span className="caption">+{spreads.length - 6} spread lagi</span></figure>}
            </div>
          </div>
        </main>

        <aside className="props" aria-label="Pemeriksaan sebelum ekspor" style={{ width: 340 }}>
          <div className="scroll pad" style={{ gap: 10, padding: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600 }}>Pemeriksaan sebelum ekspor</h2>
            {check(blanks === 0, blanks ? `${blanks} bingkai masih kosong` : "Semua bingkai terisi", blanks ? "Di file cetak bagian itu berwarna latar." : `${spreads.length * 2} halaman diperiksa`, blanks ? { label: "Buka", go: () => onGo("editor") } : undefined)}
            {check(!warnings.length, warnings.length ? `${warnings.length} foto di bawah ${Math.round((preset.dpi * 2) / 3)} dpi` : "Resolusi foto cukup", warnings.length ? warnings.slice(0, 3).map((w) => `hal. ${w.page} (${w.dpi} dpi)`).join(", ") + (warnings.length > 3 ? `, +${warnings.length - 3}` : "") : `Target ${preset.dpi} dpi`, warnings.length ? { label: "Tampilkan", go: () => onGo("editor") } : undefined)}
            {check(!openNotes, openNotes ? `${openNotes} catatan revisi belum selesai` : "Tidak ada catatan revisi terbuka", openNotes ? "Centang “Sudah dikerjakan” di panel Tata letak." : "Semua catatan sudah dikerjakan", openNotes ? { label: "Buka", go: () => onGo("editor") } : undefined)}
            {check(!(preset.binding === "biasa" && joinedCount), preset.binding === "biasa" && joinedCount ? `${joinedCount} panorama di jilid biasa` : "Jilid sesuai tata letak", preset.binding === "biasa" && joinedCount ? "Bagian foto di lipatan bisa tertelan jilid." : preset.binding === "layflat" ? "Lay-flat: panorama aman" : "Tidak ada panorama")}
            {check(withCover, withCover ? "Sampul lengkap" : "Belum ada sampul", withCover ? `Punggung ${preset.spineMm} mm` : "Atur di modul Sampul bila percetakan memerlukannya.", withCover ? undefined : { label: "Buka", go: () => onGo("sampul") })}
            {texts > 0 && check(true, "Teks ikut tercetak", `${texts} kotak teks digambar ke dalam file; percetakan tidak perlu font.`)}
            <span className="grow" />
            <div className="sum">
              <div><span>Keluaran</span>{out === "jpeg" ? `${total} file JPEG` : `1 file PDF · ${spreads.length * 2 + (withCover ? 1 : 0)} halaman`}</div>
              <div><span>Perkiraan ukuran</span>±{sizeMb} MB</div>
              <div><span>Spread</span>{spreads.length}</div>
            </div>
            {busy && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="caption">Merender {Math.min(done + 1, total)} dari {total}…</span>
              <div className="progress"><i style={{ width: `${(done / Math.max(1, total)) * 100}%` }} /></div>
            </div>}
            {msg && <div className={`note ${msg.ok ? "ok" : "danger"}`} role="status"><Icon name={msg.ok ? "circle-check" : "circle-x"} size={14} />{msg.text}</div>}
            <Btn label={busy ? "Mengekspor…" : out === "proof" ? "Ekspor proof" : out === "pdf" ? "Ekspor PDF cetak" : "Ekspor file cetak"} icon="download" kind="primary" full className="big" cmd="x.run" disabled={busy || !spreads.length} />
            <p className="caption">Peringatan tidak menghalangi ekspor. Ctrl+Enter = ekspor.</p>
          </div>
        </aside>
      </div>
      <StatusBar left={`Album ${preset.pageWmm / 10} × ${preset.pageHmm / 10} cm · ${spreads.length} spread${withCover ? " · sampul" : ""}`}
        warn={warnings.length ? `${warnings.length} foto resolusi rendah` : undefined} right={<span className="dimtext">Keluaran: {OUTS.find((o) => o.v === out)!.title}</span>} />
    </>
  );
}
