import { useEffect, useRef, useState } from "react";
import { Icon } from "../lib/icons";
import { isNative } from "../lib/platform";
import { autoCheckOn, checkForUpdate, downloadUpdate, installNow, installOnClose, mb, setAutoCheck, useUpdate } from "../lib/update";
import { Btn, IconBtn } from "./Shell";

const RELEASES = "https://github.com/anantamahayana/lintas-waktu/releases";
/** Release notes are a short Markdown list; show its lines without the bullets. */
const noteLines = (s?: string) => (s ?? "").split("\n").map((l) => l.replace(/^\s*[-*•]\s*/, "").trim()).filter(Boolean).slice(0, 6);

/** Update available → downloading → ready to install (Figma page 07). */
export function UpdateDialog({ onClose, save, project }: { onClose: () => void; save: () => Promise<unknown> | void; project?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const u = useUpdate();
  const [auto, setAuto] = useState(autoCheckOn);
  useEffect(() => { ref.current?.showModal(); }, []);
  const close = () => ref.current?.close();
  const title = u.phase === "ready" ? "Siap dipasang" : u.phase === "downloading" ? "Mengunduh pembaruan" : u.phase === "available" ? "Pembaruan tersedia"
    : u.phase === "checking" ? "Memeriksa pembaruan…" : u.phase === "none" ? "Sudah versi terbaru" : u.phase === "off" ? "Pembaruan otomatis" : "Pembaruan";
  const icon = u.phase === "ready" || u.phase === "none" ? "circle-check" : u.phase === "downloading" ? "download" : u.phase === "error" ? "triangle-alert" : "circle-arrow-up";
  const pct = u.total ? Math.round(((u.got ?? 0) / u.total) * 100) : 0;
  return (
    <dialog ref={ref} className="dlg" style={{ width: "min(520px, 92vw)" }} onClose={onClose} aria-labelledby="upd-t">
      <header className="dlg-h"><Icon name={icon} size={18} className={`upd-ic ${u.phase}`} /><h1 id="upd-t">{title}</h1><span className="grow" /><IconBtn icon="x" tip="Tutup (Esc)" onClick={close} /></header>
      <div className="dlg-b fs" style={{ gap: 12 }}>
        {u.phase === "available" && (
          <>
            <p>LW Album {u.version} siap diunduh. Versi Anda {u.current}.</p>
            {noteLines(u.notes).length > 0 && <><span className="overline">Yang baru</span><ul className="upd-notes">{noteLines(u.notes).map((l, i) => <li key={i}>{l}</li>)}</ul></>}
            <label className="ck"><input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); setAutoCheck(e.target.checked); }} />Periksa pembaruan setiap kali aplikasi dibuka</label>
          </>
        )}
        {u.phase === "downloading" && (
          <>
            <div className="fs" style={{ gap: 6 }}>
              <div className="hrow"><span>{u.version} · {mb(u.got)}{u.total ? ` dari ${mb(u.total)}` : ""}</span><span className="grow" /><span className="caption">{u.total ? `${pct}%` : ""}</span></div>
              <div className="progress"><i style={{ width: `${u.total ? pct : 30}%` }} /></div>
            </div>
            <p className="caption">Anda bisa terus bekerja. Kami beri tahu kalau sudah siap dipasang.</p>
          </>
        )}
        {u.phase === "ready" && (
          <>
            <p>Versi {u.version} sudah diunduh. Mulai ulang untuk memasang (±10 detik).</p>
            <div className="note ok"><Icon name="circle-check" size={14} className="ic" />{project ? `“${project}” disimpan dulu dan dibuka lagi setelah mulai ulang.` : "Aplikasi dibuka lagi setelah dipasang."}</div>
          </>
        )}
        {u.phase === "checking" && <p className="caption">Menghubungi GitHub…</p>}
        {u.phase === "none" && <p>LW Album {u.current} adalah versi terbaru.</p>}
        {u.phase === "error" && <div className="note warn"><Icon name="triangle-alert" size={14} className="ic" />Tidak bisa memeriksa atau mengunduh pembaruan. Periksa internet lalu coba lagi.<br />{u.error}</div>}
        {u.phase === "off" && <p>{isNative ? "Versi ini dipasang tanpa tanda tangan pembaruan, jadi belum bisa memperbarui sendiri. Pasang installer terbaru sekali lagi dari GitHub; versi berikutnya memperbarui sendiri." : "Pembaruan otomatis hanya ada di aplikasi Windows."}</p>}
      </div>
      <footer className="dlg-f">
        {u.phase === "available" && <><span className="grow" /><Btn label="Nanti" onClick={close} /><Btn label="Perbarui sekarang" icon="download" kind="primary" onClick={() => void downloadUpdate()} /></>}
        {u.phase === "downloading" && <><span className="grow" /><Btn label="Lanjut di latar" onClick={close} /></>}
        {u.phase === "ready" && <><span className="grow" /><Btn label="Saat aplikasi ditutup" tip="Pasang otomatis waktu jendela ditutup" onClick={() => { installOnClose(true); close(); }} /><Btn label="Mulai ulang sekarang" icon="refresh-cw" kind="primary" onClick={() => void installNow(save)} /></>}
        {(u.phase === "none" || u.phase === "off" || u.phase === "checking" || u.phase === "idle") && <><span className="grow" /><Btn label="Tutup" kind="primary" onClick={close} /></>}
        {u.phase === "error" && <><span className="grow" /><Btn label="Tutup" onClick={close} /><Btn label="Coba lagi" icon="refresh-cw" kind="primary" onClick={() => void checkForUpdate(true)} /></>}
      </footer>
    </dialog>
  );
}

export function AboutDialog({ onClose, onCheck }: { onClose: () => void; onCheck: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const u = useUpdate();
  useEffect(() => { ref.current?.showModal(); }, []);
  const when = u.checkedAt ? new Date(u.checkedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "belum";
  return (
    <dialog ref={ref} className="dlg dlg-sm" onClose={onClose} aria-labelledby="about-t">
      <header className="dlg-h"><Icon name="info" size={18} className="upd-ic" /><h1 id="about-t">Tentang LW Album</h1><span className="grow" /><IconBtn icon="x" tip="Tutup (Esc)" onClick={() => ref.current?.close()} /></header>
      <div className="dlg-b fs" style={{ gap: 8 }}>
        <h2 style={{ fontSize: 18 }}>LW Album {u.current || ""}</h2>
        <p className="caption" style={{ fontSize: 12, lineHeight: "18px" }}>Aplikasi album Lintas Waktu · Windows<br />Terakhir diperiksa: {when}</p>
        <p className="caption">Catatan rilis: {RELEASES}</p>
      </div>
      <footer className="dlg-f"><span className="grow" /><Btn label="Periksa pembaruan" icon="refresh-cw" kind="primary" onClick={() => { ref.current?.close(); onCheck(); }} /></footer>
    </dialog>
  );
}

/** Small note bottom-right when an update was found by the quiet check (hidden after "Nanti"). */
export function UpdateToast({ onOpen }: { onOpen: () => void }) {
  const u = useUpdate();
  const [gone, setGone] = useState<string>("");
  if (u.phase !== "available" || !u.version || gone === u.version) return null;
  return (
    <div className="toast" role="status">
      <Icon name="circle-arrow-up" size={16} className="upd-ic" />
      <div className="fs" style={{ gap: 2 }}><b>Versi {u.version} tersedia</b><span className="caption">Klik Lihat untuk yang baru.</span></div>
      <Btn label="Lihat" kind="ghost" onClick={() => { setGone(u.version!); onOpen(); }} />
      <IconBtn icon="x" small tip="Nanti" onClick={() => setGone(u.version!)} />
    </div>
  );
}

/** Status bar chip once the download is done. */
export function UpdateChip({ onOpen }: { onOpen: () => void }) {
  const u = useUpdate();
  if (u.phase !== "ready" && u.phase !== "downloading") return null;
  return (
    <button type="button" className="sb-chip" onClick={onOpen}>
      <Icon name={u.phase === "ready" ? "refresh-cw" : "download"} size={12} />{u.phase === "ready" ? "Pembaruan siap · mulai ulang" : `Mengunduh ${u.total ? Math.round(((u.got ?? 0) / u.total) * 100) : 0}%`}
    </button>
  );
}
