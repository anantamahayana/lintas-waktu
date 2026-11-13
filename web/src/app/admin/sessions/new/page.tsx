"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, type SessionOut, type SiteSettings } from "@/lib/admin-api";
import { Btn, Card, Field, Input, LangPick, PageHeader, Textarea, focusFirstInvalid, toast, useUnsavedChanges, type FieldErrors } from "@/components/admin/ui";

export default function NewSessionPage() {
  const router = useRouter();
  const [v, setV] = useState({ client_name: "", notes: "", drive_folder_id: "", photo_limit: 30, max_limit: "", pin: "", expires_at: "", client_wa: "", lang: "en" as "en" | "id" });
  const [langTouched, setLangTouched] = useState(false);
  const [folder, setFolder] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  useUnsavedChanges(!created && (v.client_name !== "" || v.drive_folder_id !== ""));
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => {
    setV((s) => {
      const next = { ...s, [k]: e.target.value };
      // an Indonesian number suggests Bahasa Indonesia, until the photographer picks a language themselves
      if (k === "client_wa" && !langTouched) { const d = e.target.value.replace(/\D/g, ""); if (d.length >= 4) next.lang = /^(62|0)/.test(d) ? "id" : "en"; }
      return next;
    });
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!v.client_name.trim()) e.client_name = "Isi nama klien — tampil di galeri.";
    if (!v.drive_folder_id.trim()) e.drive_folder_id = "Tempel link atau ID folder Google Drive.";
    else if (folder && !folder.ok) e.drive_folder_id = folder.msg;
    const limit = Number(v.photo_limit);
    if (!Number.isInteger(limit) || limit < 1) e.photo_limit = "Minimal 1 foto.";
    if (v.max_limit !== "" && Number(v.max_limit) < limit) e.max_limit = `Minimal sebesar paket (${limit}), atau kosongkan.`;
    if (v.pin && !/^\d{4}$/.test(v.pin)) e.pin = "Tepat 4 angka, atau kosongkan untuk tanpa PIN.";
    if (v.expires_at && new Date(v.expires_at) < new Date(new Date().toDateString())) e.expires_at = "Tanggal itu sudah lewat.";
    if (v.client_wa && v.client_wa.replace(/\D/g, "").length < 8) e.client_wa = "Enter the number with country code, e.g. +62 812 3456 7890.";
    return e;
  }

  // defaults from site settings
  useEffect(() => {
    api.get<SiteSettings>("/api/admin/site-settings").then((s) => {
      const d = new Date(); d.setDate(d.getDate() + (s.default_validity_days || 21));
      setV((x) => ({ ...x, photo_limit: s.default_package_size || 30, expires_at: d.toISOString().slice(0, 10) }));
    }).catch(() => {});
  }, []);

  async function checkFolder() {
    if (!v.drive_folder_id.trim()) return;
    setFolder(null);
    try {
      const r = await api.post<{ ok: boolean; photo_count: number; mock: boolean; message: string }>("/api/admin/check-folder", { drive_folder_id: v.drive_folder_id });
      setFolder({ ok: r.ok, msg: r.ok ? `Folder ditemukan · ${r.photo_count} foto${r.mock ? " (mode uji — Drive belum terhubung)" : ""}` : r.message || "Folder tidak bisa diakses" });
    } catch (e) {
      setFolder({ ok: false, msg: e instanceof Error ? e.message : "Folder tidak bisa diakses" });
    }
  }

  const randomPin = () => setV((s) => ({ ...s, pin: String(Math.floor(1000 + Math.random() * 9000)) }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) { focusFirstInvalid(); return; }
    setBusy(true);
    try {
      const body = {
        client_name: v.client_name,
        notes: v.notes || null,
        drive_folder_id: v.drive_folder_id,
        photo_limit: Number(v.photo_limit),
        max_limit: v.max_limit ? Number(v.max_limit) : null,
        pin: v.pin || null,
        expires_at: v.expires_at ? new Date(v.expires_at + "T23:59:59").toISOString() : null,
        client_wa: v.client_wa || null,
        lang: v.lang,
      };
      const s = await api.post<SessionOut>("/api/admin/sessions", body);
      setCreated(true);
      toast("Sesi dibuat");
      router.push(`/admin/sessions/${s.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) { setErrors(err.fields); focusFirstInvalid(); }
      toast(err instanceof Error ? err.message : "Gagal membuat sesi", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Galeri klien" title="Sesi baru" />
      <form onSubmit={onSubmit} noValidate className="grid lg:grid-cols-[minmax(0,560px)_1fr] gap-8 items-start">
        <div className="flex flex-col gap-6">
          <div className="grid sm:grid-cols-[1fr_220px] gap-5">
            <Field label="Nama klien" error={errors.client_name}><Input invalid={!!errors.client_name} value={v.client_name} onChange={set("client_name")} placeholder="Ayu & Marco" /></Field>
            <Field label="WhatsApp klien" hint="opsional" error={errors.client_wa}><Input invalid={!!errors.client_wa} inputMode="tel" value={v.client_wa} onChange={set("client_wa")} placeholder="+62 812 3456 7890" /></Field>
          </div>
          <Field label="Bahasa klien" hint="galeri dan pesan WhatsApp">
            <LangPick value={v.lang} onChange={(l) => { setLangTouched(true); setV((x) => ({ ...x, lang: l })); }} />
          </Field>
          <Field label="Folder Google Drive" hint="link atau ID" error={errors.drive_folder_id}>
            <div className="flex gap-2">
              <Input invalid={!!errors.drive_folder_id} value={v.drive_folder_id} onChange={set("drive_folder_id")} onBlur={checkFolder} placeholder="https://drive.google.com/drive/folders/…" />
              <Btn type="button" onClick={checkFolder}>Cek</Btn>
            </div>
            {folder && !errors.drive_folder_id && <span className={`t-small ${folder.ok ? "text-mute" : "text-error"}`}>{folder.msg}</span>}
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Foto dalam paket" error={errors.photo_limit}><Input invalid={!!errors.photo_limit} type="number" min={1} max={1000} value={v.photo_limit} onChange={set("photo_limit")} /></Field>
            <Field label="Maks dengan ekstra" hint="opsional" error={errors.max_limit}><Input invalid={!!errors.max_limit} type="number" min={1} max={2000} value={v.max_limit} onChange={set("max_limit")} placeholder="45" /></Field>
            <Field label="PIN" hint="4 angka, opsional" error={errors.pin}>
              <div className="flex gap-2">
                <Input invalid={!!errors.pin} inputMode="numeric" maxLength={4} value={v.pin} onChange={set("pin")} placeholder="kosongkan untuk tanpa PIN" />
                <Btn type="button" onClick={randomPin}>Acak</Btn>
              </div>
            </Field>
            <Field label="Berlaku sampai" error={errors.expires_at}><Input invalid={!!errors.expires_at} type="date" value={v.expires_at} onChange={set("expires_at")} /></Field>
          </div>
          <Field label="Catatan pribadi" hint="opsional"><Textarea value={v.notes} onChange={set("notes")} placeholder="Pernikahan · Uluwatu · album selesai Desember" /></Field>
          <div className="flex gap-2 pt-2">
            <Btn kind="ink" type="submit" disabled={busy}>{busy ? "Membuat…" : "Buat sesi"}</Btn>
            <Btn type="button" onClick={() => router.push("/admin")}>Batal</Btn>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Langkah selanjutnya">
            <ol className="t-small text-mute flex flex-col gap-2 list-decimal pl-4">
              <li>Folder dibaca dan thumbnail disiapkan (satu-dua menit untuk 150 foto).</li>
              <li>Saat muncul “Galeri siap”, kirim link dan PIN — tombol WhatsApp menuliskan pesannya untukmu.</li>
              <li>Pilihan tersimpan langsung. Pantau di sini dan ekspor XMP saat klien mengirim.</li>
            </ol>
          </Card>
          <Card title="Tips"><p className="t-small text-mute">Ekspor JPEG ukuran web (2048px, kualitas 80). File asli tidak pernah diunduh — hanya foldernya yang dibaca.</p></Card>
        </div>
      </form>
    </>
  );
}
