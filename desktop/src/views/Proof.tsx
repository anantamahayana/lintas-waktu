import { useEffect, useRef, useState } from "react";
import { hasCover, proofImages, type Spread } from "../lib/export";
import type { Cover } from "../lib/cover";
import { Icon } from "../lib/icons";
import { isNative } from "../lib/platform";
import type { Photo } from "../lib/photos";
import type { Placement, Preset } from "../lib/print";
import { ApiError, copyText, openExternal, proofs, signedIn, signIn, waMessage, type ProofInfo, type ProofNote } from "../lib/proofs";
import { Btn, IconBtn, NumField, Row, Seg } from "./Shell";

/** Which proof images were spreads (the first one is the cover when `cover` is set), kept per proof on this computer. */
const coverKey = (id: string) => `lwalbum:proofCover:${id}`;
export const proofHasCover = (id: string) => { try { return localStorage.getItem(coverKey(id)) === "1"; } catch { return false; } };

type SendProps = {
  projectKey: string; name: string; cover: Cover | null; spreads: Spread[]; byId: Map<string, Photo>; place: Record<string, Placement>; preset: Preset;
  onClose: () => void; onSent: (p: ProofInfo) => void;
};

/** Album › Kirim proof ke klien (Figma page 07): sign in once, render, upload, publish, share. */
export function ProofSendDialog({ projectKey, name, cover, spreads, byId, place, preset, onClose, onSent }: SendProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"login" | "form" | "upload" | "done">(signedIn() ? "form" : "login");
  const [pw, setPw] = useState("");
  const [client, setClient] = useState(name);
  const [lang, setLang] = useState<"en" | "id">("en");
  const [days, setDays] = useState(14);
  const [notes, setNotes] = useState(true);
  const [mark, setMark] = useState(true);
  const [withCover, setWithCover] = useState(!!cover && hasCover(cover));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState({ n: 0, total: 0, phase: "" });
  const [info, setInfo] = useState<ProofInfo | null>(null);
  const [copied, setCopied] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  // The language and name of an earlier proof of this album, if there is one.
  useEffect(() => {
    if (step !== "form") return;
    proofs.find(projectKey).then((p) => { if (p) { setClient(p.client_name); setLang(p.lang); setNotes(p.allow_notes); } }).catch(() => {});
  }, [step, projectKey]);
  const close = () => ref.current?.close();
  const fail = (e: unknown) => { setErr(e instanceof ApiError || e instanceof Error ? e.message : String(e)); if (e instanceof ApiError && e.status === 401) setStep("login"); };

  const login = async () => {
    setBusy(true); setErr("");
    try { await signIn(pw); setPw(""); setStep("form"); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true); setErr(""); setStep("upload");
    const total = spreads.length + (withCover ? 1 : 0);
    try {
      const p = await proofs.create({ project_key: projectKey, client_name: client.trim() || name, lang, expires_days: days, allow_notes: notes });
      const meta: { label: string; w: number; h: number }[] = [];
      setDone({ n: 0, total, phase: "Menyiapkan" });
      await proofImages(withCover ? cover : null, spreads, byId, place, preset, lang, mark, async (i, img) => {
        await proofs.upload(p.id, i, img.blob);
        meta[i] = { label: img.label, w: img.w, h: img.h };
        setDone({ n: i + 1, total, phase: "Mengunggah" });
      });
      const out = await proofs.publish(p.id, meta);
      try { localStorage.setItem(coverKey(out.id), withCover ? "1" : "0"); } catch { /* ignore */ }
      setInfo(out); setStep("done"); onSent(out);
    } catch (e) { fail(e); if (step !== "login") setStep("form"); }
    finally { setBusy(false); }
  };
  const copy = async (what: string, s: string) => { if (await copyText(s)) { setCopied(what); setTimeout(() => setCopied(""), 1500); } };
  const msg = info ? waMessage(info) : "";

  const title = step === "done" ? `Proof v${info?.version ?? 1} siap dibagikan` : "Kirim proof ke klien";
  return (
    <dialog ref={ref} className="dlg" onClose={onClose} aria-labelledby="pf-t">
      <header className="dlg-h"><Icon name={step === "done" ? "circle-check" : "send"} size={18} className={`upd-ic ${step === "done" ? "ready" : ""}`} /><h1 id="pf-t">{title}</h1><span className="grow" /><IconBtn icon="x" tip="Tutup (Esc)" onClick={close} /></header>
      <div className="dlg-b fs" style={{ gap: 14 }}>
        {step === "login" && (
          <>
            <p>Masuk ke server Lintas Waktu dengan password admin situs. Yang disimpan di komputer ini hanya tanda masuk selama 8 jam, bukan password-nya.</p>
            <Row label="Password admin"><input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void login(); }} style={{ flex: 1 }} /></Row>
          </>
        )}
        {step === "form" && (
          <>
            <Row label="Nama di halaman"><input type="text" value={client} onChange={(e) => setClient(e.target.value)} maxLength={120} style={{ flex: 1 }} /></Row>
            <Row label="Bahasa klien"><Seg value={lang} onChange={setLang} items={[{ v: "en", label: "English" }, { v: "id", label: "Indonesia" }]} /></Row>
            <Row label="Link berlaku"><NumField value={days} min={1} max={120} unit="hari" onChange={(v) => setDays(Math.round(v))} /></Row>
            <div className="fs" style={{ gap: 8, paddingLeft: 96 }}>
              <label className="ck"><input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} />Klien boleh menulis catatan per halaman</label>
              <label className="ck"><input type="checkbox" checked={mark} onChange={(e) => setMark(e.target.checked)} />Tanda air “PROOF” di setiap spread</label>
              <label className="ck"><input type="checkbox" checked={withCover} disabled={!cover || !hasCover(cover)} onChange={(e) => setWithCover(e.target.checked)} />Sertakan sampul</label>
            </div>
            <div className="note"><Icon name="info" size={14} className="ic" />{spreads.length} spread{withCover ? " + sampul" : ""} diunggah sebagai gambar ±2.000 px (±{Math.max(1, Math.round((spreads.length + (withCover ? 1 : 0)) * 0.35))} MB). File cetak tidak ikut. Mengirim lagi memakai link dan PIN yang sama; klien melihat versi terbaru.</div>
          </>
        )}
        {step === "upload" && (
          <div className="fs" style={{ gap: 6 }}>
            <div className="hrow"><span>{done.phase} spread {done.n} dari {done.total}</span><span className="grow" /><span className="caption">{done.total ? Math.round((done.n / done.total) * 100) : 0}%</span></div>
            <div className="progress"><i style={{ width: `${done.total ? (done.n / done.total) * 100 : 5}%` }} /></div>
            <p className="caption">Biarkan jendela ini terbuka sampai selesai.</p>
          </div>
        )}
        {step === "done" && info && (
          <>
            <Row label="Link"><input type="text" readOnly value={info.url} style={{ flex: 1 }} onFocus={(e) => e.target.select()} /><Btn label={copied === "link" ? "Tersalin" : "Salin"} icon="copy" onClick={() => void copy("link", info.url)} /></Row>
            <Row label="PIN"><input type="text" readOnly value={info.pin} style={{ width: 80 }} /></Row>
            <span className="overline">Pesan WhatsApp ({info.lang === "id" ? "Indonesia" : "English"})</span>
            <textarea readOnly value={msg} rows={4} style={{ resize: "none" }} />
          </>
        )}
        {err && <div className="note warn"><Icon name="triangle-alert" size={14} className="ic" />{err}</div>}
        {!isNative && step !== "done" && <p className="caption">Di pratinjau web, pengiriman bisa ditolak server (khusus aplikasi Windows).</p>}
      </div>
      <footer className="dlg-f">
        {step === "login" && <><span className="grow" /><Btn label="Batal" onClick={close} /><Btn label="Masuk" kind="primary" disabled={busy || !pw} onClick={() => void login()} /></>}
        {step === "form" && <><span className="grow" /><Btn label="Batal" onClick={close} /><Btn label="Unggah & buat link" icon="upload" kind="primary" disabled={busy || !spreads.length} onClick={() => void send()} /></>}
        {step === "upload" && <span className="grow" />}
        {step === "done" && info && (
          <>
            <Btn label="Buka di browser" icon="external-link" kind="ghost" onClick={() => void openExternal(info.url)} />
            <span className="grow" />
            <Btn label={copied === "msg" ? "Tersalin" : "Salin pesan"} icon="copy" onClick={() => void copy("msg", msg)} />
            <Btn label="Kirim lewat WhatsApp" icon="send" kind="primary" onClick={() => void openExternal(`https://wa.me/?text=${encodeURIComponent(msg)}`)} />
          </>
        )}
      </footer>
    </dialog>
  );
}

/** Editor › Revisi tab: status of the online proof and the client's notes. */
export function RevisionPanel({ info, loading, error, onRefresh, onSend, onOpen, onMark, labelOf }: {
  info: ProofInfo | null; loading: boolean; error: string; onRefresh: () => void; onSend: () => void;
  onOpen: (n: ProofNote) => void; onMark: (n: ProofNote, done: boolean) => void; labelOf: (spread: number) => string;
}) {
  const when = (s: string | null) => (s ? new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
  if (!info) {
    return (
      <div className="fs" style={{ gap: 12, padding: 12 }}>
        <p className="caption" style={{ fontSize: 12, lineHeight: "18px" }}>{loading ? "Memeriksa proof…" : "Belum ada proof online untuk album ini. Kirim proof ke klien; catatan mereka muncul di sini dan di catatan revisi tiap halaman."}</p>
        {error && <div className="note warn"><Icon name="triangle-alert" size={14} className="ic" />{error}</div>}
        <Btn label="Kirim proof ke klien…" icon="send" kind="primary" full onClick={onSend} />
        {error && <Btn label="Coba lagi" icon="refresh-cw" full onClick={onRefresh} />}
      </div>
    );
  }
  const open = info.notes.filter((n) => !n.done);
  const pins = new Map<number, number>();
  for (const s of new Set(info.notes.map((n) => n.spread))) info.notes.filter((n) => n.spread === s && n.version === info.version && n.x !== null).forEach((n, k) => pins.set(n.id, k + 1));
  return (
    <div className="fs" style={{ gap: 12, padding: 12 }}>
      <div className="rev-card">
        <div className="hrow" style={{ gap: 8 }}><b>Proof v{info.version}</b>
          <span className={`chip ${info.status === "approved" ? "ok" : "warn"}`}>{info.status === "approved" ? `Disetujui ${when(info.approved_at)}` : "Menunggu persetujuan"}</span></div>
        <p className="caption" style={{ fontSize: 12, lineHeight: "17px" }}>Dibuka {info.open_count}× · terakhir {when(info.last_seen_at)}<br />Berlaku sampai {when(info.expires_at)} · PIN {info.pin}</p>
        <div className="hrow"><Btn label={loading ? "Memuat…" : "Segarkan"} icon="refresh-cw" full disabled={loading} onClick={onRefresh} /><Btn label="Salin link" icon="link" full onClick={() => void copyText(info.url)} /></div>
      </div>
      {error && <div className="note warn"><Icon name="triangle-alert" size={14} className="ic" />{error}</div>}
      <span className="overline">Catatan klien · {open.length} belum selesai</span>
      {info.notes.length === 0 && <p className="caption">Belum ada catatan.</p>}
      {[...info.notes].sort((a, b) => Number(a.done) - Number(b.done) || b.id - a.id).map((n) => (
        <div key={n.id} className={`rev-note ${n.done ? "done" : ""}`}>
          <div className="hrow" style={{ gap: 8 }}>
            {pins.has(n.id) && <span className="rev-no">{pins.get(n.id)}</span>}
            <b>{labelOf(n.spread)}</b><span className="grow" /><span className="caption">{n.author} · {when(n.created_at)}</span>
          </div>
          <p>{n.text}{n.version !== info.version && <span className="caption"> · versi {n.version}</span>}</p>
          <div className="hrow"><label className="ck"><input type="checkbox" checked={n.done} onChange={(e) => onMark(n, e.target.checked)} />Selesai</label><span className="grow" /><Btn label="Buka" kind="ghost" onClick={() => onOpen(n)} /></div>
        </div>
      ))}
      <Btn label={`Kirim versi ${info.version + 1}`} icon="send" kind={open.length === 0 && info.status !== "approved" ? "primary" : "secondary"} full onClick={onSend} />
      <p className="caption">Catatan baru juga ditambahkan ke Catatan revisi halamannya, jadi terlihat di daftar spread dan Semua spread.</p>
    </div>
  );
}
