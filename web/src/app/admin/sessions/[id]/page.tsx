"use client";

import { use, useCallback, useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { API_URL, ApiError, api, fillWaTemplate, type CacheStatus, type SessionDetail, type SiteSettings } from "@/lib/admin-api";
import { Btn, Card, Field, Input, LangPick, PageHeader, Pill, Textarea, confirm, daysLeft, fmtDate, focusFirstInvalid, toast, useUnsavedChanges, type ConfirmOptions, type FieldErrors, LoadError, SkeletonForm } from "@/components/admin/ui";

// Chrome/Edge on desktop can write straight into a chosen folder (no zip, no extracting)
const canPickFolder = typeof window !== "undefined" && "showDirectoryPicker" in window;

async function saveXmpToFolder(id: string): Promise<number> {
  type Picker = (o: { id?: string; mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await (window as unknown as { showDirectoryPicker: Picker }).showDirectoryPicker({ id: "raw-folder", mode: "readwrite" });
  } catch {
    return 0; // cancelled
  }
  const { files } = await api.get<{ files: { name: string; content: string }[] }>(`/api/admin/sessions/${id}/export/xmp-files`);
  for (const f of files) {
    const h = await dir.getFileHandle(f.name, { create: true });
    const w = await h.createWritable();
    await w.write(f.content);
    await w.close();
  }
  return files.length;
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [s, setS] = useState<SessionDetail | null>(null);
  const [cache, setCache] = useState<CacheStatus | null>(null);
  const [site, setSite] = useState<SiteSettings | null>(null);
  useEffect(() => { api.get<SiteSettings>("/api/admin/site-settings").then(setSite).catch(() => {}); }, []);
  const [editing, setEditing] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api.get<SessionDetail>(`/api/admin/sessions/${id}`).then((x) => { setS(x); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed")), [id]);
  useEffect(() => { load(); }, [load]);

  // cache progress while the gallery is being prepared
  useEffect(() => {
    if (!s) return;
    let stop = false;
    const tick = async () => {
      const c = await api.get<CacheStatus>(`/api/admin/sessions/${id}/cache`).catch(() => null);
      if (stop) return;
      setCache(c);
      if (c && !c.ready) setTimeout(tick, 3000);
    };
    tick();
    return () => { stop = true; };
  }, [s?.id, id, s]);

  // live picks while pending
  useEffect(() => {
    if (!s || s.status !== "pending") return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [s, load]);

  if (err && !s) return <LoadError error={err} retry={() => { setErr(null); load(); }} />;
  if (!s) return <SkeletonForm fields={8} />;

  const act = async (label: string, fn: () => Promise<unknown>, ask?: ConfirmOptions) => {
    if (ask && !(await confirm(ask))) return;
    try { await fn(); toast(label); await load(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  };
  const nPicks = s.selected_count + s.extra_count;

  // Message text comes from Site settings → WhatsApp message templates, one per language; the
  // session's language picks the template and how the deadline date is written.
  const isId = s.lang === "id";
  const template = (isId ? site?.whatsapp_template_id : site?.whatsapp_template)
    || (isId ? "Halo {name}! Galeri Anda sudah siap: {link}\nPIN {pin}\nSilakan pilih {package} foto sebelum {deadline}.\n— {studio}" : "Hi {name}! Your gallery is ready: {link}\nPIN {pin}\nPlease choose {package} photographs by {deadline}.\n— {studio}");
  const deadline = s.expires_at ? new Date(s.expires_at).toLocaleDateString(isId ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
  const waText = fillWaTemplate(template, {
    name: s.client_name, link: s.gallery_url, pin: s.has_pin ? (s.pin ?? (isId ? "[PIN tidak diketahui — buat yang baru]" : "[PIN unknown — set a new one]")) : null,
    package: s.photo_limit, extras: s.max_limit, deadline, studio: site?.studio_name || "Lintas Waktu",
  });
  const waHref = `https://wa.me/${s.client_wa ?? ""}?text=${encodeURIComponent(waText)}`;

  // Sharing before the thumbnails are ready makes the client the one who waits (and the tiles stay
  // grey on a phone). Ask once; the photographer can still send it.
  const preparing = s.status !== "completed" && !!cache && !cache.ready;
  const okToShare = () => !preparing || confirm({
    title: "Galeri masih disiapkan",
    body: `${cache!.thumb} dari ${cache!.total} foto sudah siap. Kalau klien membuka sekarang, sisanya dimuat lambat. Tetap bagikan, atau tunggu sampai muncul “Galeri siap”?`,
    action: "Tetap bagikan",
    cancel: "Tunggu",
  });
  const copyLink = async () => {
    if (!(await okToShare())) return;
    try { await navigator.clipboard.writeText(s.gallery_url); toast("Link disalin"); } catch { toast("Gagal menyalin — pilih link di bagian Sesi", true); }
  };
  const sendWa = async (e: MouseEvent) => {
    if (!preparing) return; // plain link
    e.preventDefault();
    if (!(await okToShare())) return;
    if (!window.open(waHref, "_blank", "noreferrer")) window.location.href = waHref; // popup blocked after the dialog
  };

  const status = s.status === "completed" ? <Pill tone="ok">Completed · sent {fmtDate(s.submitted_at)}</Pill>
    : cache && !cache.ready ? <Pill tone="warn">Preparing gallery… {cache.thumb} / {cache.total}</Pill>
    : s.first_opened_at ? <Pill tone="warn">Sedang memilih · galeri siap</Pill> : <Pill tone="mute">Galeri siap · belum dibuka</Pill>;

  const picks = s.status === "completed" ? s.selected_photos.map((p) => ({ id: p.drive_file_id, name: p.filename, note: p.note, extra: p.is_extra })) : s.draft_photos.map((p) => ({ id: p.drive_file_id, name: p.filename, note: p.note, extra: false }));
  const notes = picks.filter((p) => p.note);

  return (
    <>
      <PageHeader
        eyebrow={<><Link href="/admin" className="link">Sesi galeri</Link> · {s.notes?.split("\n")[0] || fmtDate(s.created_at)}</> as unknown as string}
        title={s.client_name}
        actions={
          <>
            <a className="action !py-2.5 !px-4" href={`${s.gallery_url}?preview=1`} target="_blank" rel="noreferrer" title="Membuka galeri sebagai fotografer: tanpa PIN, tidak ada yang tersimpan, tombol Kirim nonaktif">Pratinjau</a>
            <Btn onClick={copyLink}>Salin link</Btn>
            <a className="ink-btn !py-2.5 !px-4" href={waHref} target="_blank" rel="noreferrer" onClick={sendWa} title={`Pesan dalam ${isId ? "Bahasa Indonesia" : "English"} · ${s.client_wa ? `opens the chat with +${s.client_wa}` : "nomor klien belum disimpan — WhatsApp akan memintamu memilih kontak"}`}>Send via WhatsApp · {isId ? "ID" : "EN"}</a>
          </>
        }
      />
      <div className="mb-6">{status}</div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <Card title="Sesi">
            {!editing ? (
              <>
                <dl className="flex flex-col t-small">
                  {[
                    ["Link", <a key="l" href={s.gallery_url} target="_blank" rel="noreferrer" className="link break-all">{s.gallery_url.replace(/^https?:\/\//, "")}</a>],
                    ["PIN", s.has_pin
                      ? (s.pin
                        ? <span key="p" className="flex items-center gap-3"><span className="font-mono text-[15px] tracking-[0.3em]">{s.pin}</span><button type="button" className="link t-mono" onClick={() => { navigator.clipboard.writeText(s.pin!); toast("PIN disalin"); }}>salin</button></span>
                        : <span key="p" className="text-mute">dibuat sebelum versi ini — tekan Ubah untuk membuat yang baru</span>)
                      : <span key="p" className="text-mute">tidak ada · siapa pun yang punya link bisa membuka</span>],
                    ["WhatsApp", s.client_wa ? <a key="w" href={`https://wa.me/${s.client_wa}`} target="_blank" rel="noreferrer" className="link font-mono">+{s.client_wa}</a> : <span key="w" className="text-mute">belum disimpan · tambahkan lewat Ubah supaya tombol membuka chat klien</span>],
                    ["Language", isId ? "Bahasa Indonesia" : "English"],
                    ["Package", <span key="k">{s.photo_limit} photos{s.max_limit ? ` · maks ${s.max_limit}` : ""}
                      {/* a package larger than the folder can never be filled: the client is stuck below the count */}
                      {cache && cache.total > 0 && s.photo_limit > cache.total && <span className="block t-small text-error">The folder has only {cache.total}. Lower the package or add photos, then Sync.</span>}</span>],
                    ["Deadline", s.expires_at ? `${fmtDate(s.expires_at)} · ${daysLeft(s.expires_at)} hari lagi` : "—"],
                    ["Folder Drive", <a key="d" href={`https://drive.google.com/drive/folders/${s.drive_folder_id}`} target="_blank" rel="noreferrer" className="link">buka ↗</a>],
                    ["Photos", cache ? `${cache.total} · ${cache.ready ? "cache siap" : "disiapkan"}` : "—"],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between gap-4 py-2 border-b border-line last:border-0"><dt className="text-mute shrink-0">{k}</dt><dd className="text-right">{v}</dd></div>
                  ))}
                </dl>
                <Btn onClick={() => setEditing(true)}>Ubah sesi</Btn>
              </>
            ) : (
              <EditForm s={s} onDone={() => { setEditing(false); load(); }} />
            )}
          </Card>

          <Card title="Aktivitas klien">
            <dl className="flex flex-col t-small">
              {[["Pertama dibuka", fmtDate(s.first_opened_at, true)], ["Terakhir dilihat", fmtDate(s.last_seen_at, true)], ["Catatan ditulis", String(notes.length)], ["Created", fmtDate(s.created_at)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 border-b border-line last:border-0"><dt className="text-mute">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </Card>

          <Card title="Kelola">
            <div className="flex flex-col gap-2">
              <Btn onClick={() => act("Folder dibaca ulang", () => api.post(`/api/admin/sessions/${id}/sync`))}>Sinkronkan folder Drive</Btn>
              <Btn onClick={() => act("Semua perangkat dikeluarkan", () => api.post(`/api/admin/sessions/${id}/relock`), { title: "Kunci ulang semua perangkat?", body: "Semua yang pernah membuka galeri ini harus memasukkan PIN lagi. Pilihan mereka tetap tersimpan.", action: "Kunci ulang" })}>Kunci ulang semua perangkat</Btn>
              {s.status === "completed" && <Btn onClick={() => act("Reopened", () => api.post(`/api/admin/sessions/${id}/reopen`), { title: "Buka lagi untuk perubahan?", body: <>{s.client_name} can edit their selection again; the {nPicks} photos they sent become the starting draft. You will get a new submission when they press Send.</>, action: "Buka lagi" })}>Buka lagi untuk perubahan</Btn>}
              <Btn kind="danger" onClick={() => act("Pilihan dihapus", () => api.post(`/api/admin/sessions/${id}/reset`), { title: "Hapus semua pilihan?", body: <>Every pick, note and mark by {s.client_name} is wiped{nPicks ? <> — {nPicks} photos so far</> : null}. They start from zero. This cannot be undone.</>, action: "Hapus semuanya", danger: true })}>Hapus semua pilihan</Btn>
              <Btn kind="danger" onClick={() => act(`Sesi ${s.client_name} dihapus`, async () => { await api.del(`/api/admin/sessions/${id}`); router.push("/admin"); }, { title: `Hapus sesi ${s.client_name}?`, body: "Link galeri langsung tidak berfungsi dan pilihan, catatan, serta ekspor hilang permanen. Foto di Google Drive tidak disentuh.", action: "Delete session", danger: true })}>Hapus sesi</Btn>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-serif text-[24px] leading-none">
                  {s.status === "completed" ? "Pilihan" : "Pemilihan berlangsung"} · {picks.length} / {s.photo_limit}
                  {s.extra_count > 0 && <span className="text-mute"> +{s.extra_count}</span>}
                </h2>
                <span className="t-small text-mute">{s.status === "completed" ? "Final. Ekspor di bawah." : "Langsung — diperbarui saat klien memilih (tiap 15 detik)."}</span>
              </div>
              {s.status === "completed" && (
                <div className="flex flex-wrap gap-2">
                  {canPickFolder && <Btn kind="ink" onClick={() => saveXmpToFolder(id).then((n) => n && toast(`${n} file XMP ditulis — buka foldernya di Lightroom/Capture One`)).catch((e) => toast(e instanceof Error ? e.message : "Failed", true))}>Simpan XMP ke folder RAW</Btn>}
                  <Btn onClick={() => api.download(`/api/admin/sessions/${id}/export/xmp`, `${s.client_name}-xmp.zip`).catch((e) => toast(e.message, true))}>XMP .zip</Btn>
                  <Btn onClick={() => api.download(`/api/admin/sessions/${id}/export/csv`, `${s.client_name}.csv`).catch((e) => toast(e.message, true))}>CSV</Btn>
                  <Btn onClick={async () => { const r = await fetch(`${API_URL}/api/admin/sessions/${id}/export/filenames`, { headers: { authorization: `Bearer ${localStorage.getItem("lw_admin_token")}` } }); navigator.clipboard.writeText(await r.text()); toast("Nama file disalin"); }}>Salin nama file</Btn>
                </div>
              )}
            </div>
            {picks.length === 0 ? (
              <p className="t-small text-faint py-8 text-center">Belum ada pilihan.</p>
            ) : (
              <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {picks.map((p) => (
                  <li key={p.id} className="relative aspect-[4/5] bg-line overflow-hidden group">
                    <img src={api.img(`/api/gallery/${s.slug}/img/${p.id}?size=thumb`, s.gallery_token)} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    {p.extra && <span className="absolute left-1.5 bottom-1.5 bg-ink text-[#c9a84c] t-mono !text-[9px] px-1.5 py-0.5">Ekstra</span>}
                    {p.note && <span className="absolute right-1.5 top-1.5 h-5 w-5 rounded-full bg-white text-[10px] flex items-center justify-center">✎</span>}
                    <span className={clsx("absolute inset-x-0 bottom-0 bg-white/90 t-mono !text-[9px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity")}>{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {notes.length > 0 && (
            <Card title="Catatan klien">
              <ul className="flex flex-col divide-y divide-line">
                {notes.map((p) => (
                  <li key={p.id} className="py-3 flex gap-4"><span className="t-mono text-mute w-[160px] shrink-0 truncate">{p.name}</span><span className="t-small">{p.note}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function EditForm({ s, onDone }: { s: SessionDetail; onDone: () => void }) {
  const [v, setV] = useState({
    client_name: s.client_name, drive_folder_id: s.drive_folder_id, photo_limit: s.photo_limit, max_limit: s.max_limit ?? "",
    pin: "", expires_at: s.expires_at ? s.expires_at.slice(0, 10) : "", notes: s.notes ?? "", client_wa: s.client_wa ?? "", lang: s.lang ?? "en",
  });
  const [busy, setBusy] = useState(false);
  const [initial] = useState(v);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  useUnsavedChanges(dirty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!v.client_name.trim()) e.client_name = "Isi nama klien.";
    if (!v.drive_folder_id.trim()) e.drive_folder_id = "Tempel link atau ID folder Google Drive.";
    const limit = Number(v.photo_limit);
    if (!Number.isInteger(limit) || limit < 1) e.photo_limit = "Minimal 1 foto.";
    if (v.max_limit !== "" && Number(v.max_limit) < limit) e.max_limit = `Minimal sebesar paket (${limit}), atau kosongkan.`;
    if (v.pin && !/^\d{4}$/.test(v.pin)) e.pin = "Tepat 4 angka.";
    if (v.client_wa && v.client_wa.replace(/\D/g, "").length < 8) e.client_wa = "Number with country code, e.g. +62 812 3456 7890.";
    return e;
  }
  async function save() {
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) { focusFirstInvalid(); return; }
    if (v.pin !== "" && !(await confirm({ title: "Ganti PIN?", body: "PIN lama langsung tidak berlaku — jangan lupa kirim PIN baru ke klien.", action: "Ganti PIN" }))) return;
    if (v.drive_folder_id !== s.drive_folder_id && !(await confirm({ title: "Ganti folder Drive?", body: "Pilihan untuk foto yang tidak ada di folder baru akan dihapus dari galeri.", action: "Ganti folder" }))) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/sessions/${s.id}`, {
        client_name: v.client_name, drive_folder_id: v.drive_folder_id, photo_limit: Number(v.photo_limit),
        max_limit: v.max_limit === "" ? null : Number(v.max_limit), notes: v.notes || null, client_wa: v.client_wa, lang: v.lang,
        ...(v.pin !== "" ? { pin: v.pin } : {}),
        ...(v.expires_at ? { expires_at: new Date(v.expires_at + "T23:59:59").toISOString() } : { clear_expiry: true }),
      });
      toast("Tersimpan"); onDone();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) { setErrors(e.fields); focusFirstInvalid(); }
      toast(e instanceof Error ? e.message : "Failed", true);
    } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-col gap-4">
      <Field label="Nama klien" error={errors.client_name}><Input invalid={!!errors.client_name} value={v.client_name} onChange={set("client_name")} /></Field>
      <Field label="WhatsApp klien" hint="opsional · dengan kode negara" error={errors.client_wa}><Input invalid={!!errors.client_wa} inputMode="tel" value={v.client_wa} onChange={set("client_wa")} placeholder="+62 812 3456 7890" /></Field>
      <Field label="Bahasa klien" hint="galeri dan pesan WhatsApp"><LangPick value={v.lang} onChange={(l) => setV((x) => ({ ...x, lang: l }))} /></Field>
      <Field label="Folder Drive" error={errors.drive_folder_id}><Input invalid={!!errors.drive_folder_id} value={v.drive_folder_id} onChange={set("drive_folder_id")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Paket" error={errors.photo_limit}><Input invalid={!!errors.photo_limit} type="number" min={1} value={v.photo_limit} onChange={set("photo_limit")} /></Field>
        <Field label="Maks" error={errors.max_limit}><Input invalid={!!errors.max_limit} type="number" min={1} value={v.max_limit} onChange={set("max_limit")} /></Field>
        <Field label={s.has_pin ? "PIN" : "Tambah PIN"} hint={s.has_pin ? "kosong = tetap" : "4 angka, opsional"} error={errors.pin}>
          <div className="flex gap-2">
            <Input invalid={!!errors.pin} inputMode="numeric" maxLength={4} value={v.pin} onChange={set("pin")} placeholder={s.pin ?? "••••"} />
            <Btn type="button" onClick={() => setV((x) => ({ ...x, pin: String(Math.floor(1000 + Math.random() * 9000)) }))}>Acak</Btn>
          </div>
        </Field>
        <Field label="Berakhir"><Input type="date" value={v.expires_at} onChange={set("expires_at")} /></Field>
      </div>
      <Field label="Catatan"><Textarea value={v.notes} onChange={set("notes")} /></Field>
      <div className="flex gap-2"><Btn kind="ink" onClick={save} disabled={busy}>Simpan</Btn><Btn onClick={onDone}>Batal</Btn></div>
    </div>
  );
}
