"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, type SessionOut, type SiteSettings } from "@/lib/admin-api";
import { Btn, Card, Field, Input, PageHeader, Textarea, focusFirstInvalid, toast, useUnsavedChanges, type FieldErrors } from "@/components/admin/ui";

export default function NewSessionPage() {
  const router = useRouter();
  const [v, setV] = useState({ client_name: "", notes: "", drive_folder_id: "", photo_limit: 30, max_limit: "", pin: "", expires_at: "" });
  const [folder, setFolder] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  useUnsavedChanges(!created && (v.client_name !== "" || v.drive_folder_id !== ""));
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!v.client_name.trim()) e.client_name = "Enter the client’s name — it appears on the gallery.";
    if (!v.drive_folder_id.trim()) e.drive_folder_id = "Paste the Google Drive folder link or ID.";
    else if (folder && !folder.ok) e.drive_folder_id = folder.msg;
    const limit = Number(v.photo_limit);
    if (!Number.isInteger(limit) || limit < 1) e.photo_limit = "At least 1 photo.";
    if (v.max_limit !== "" && Number(v.max_limit) < limit) e.max_limit = `Must be at least the package size (${limit}), or leave it blank.`;
    if (v.pin && !/^\d{4}$/.test(v.pin)) e.pin = "Exactly 4 digits, or leave blank for no PIN.";
    if (v.expires_at && new Date(v.expires_at) < new Date(new Date().toDateString())) e.expires_at = "That date is already in the past.";
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
      setFolder({ ok: r.ok, msg: r.ok ? `Folder found · ${r.photo_count} images${r.mock ? " (mock mode — Drive not connected)" : ""}` : r.message || "Folder not accessible" });
    } catch (e) {
      setFolder({ ok: false, msg: e instanceof Error ? e.message : "Folder not accessible" });
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
      };
      const s = await api.post<SessionOut>("/api/admin/sessions", body);
      setCreated(true);
      toast("Session created");
      router.push(`/admin/sessions/${s.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) { setErrors(err.fields); focusFirstInvalid(); }
      toast(err instanceof Error ? err.message : "Could not create session", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Proofing" title="New session" />
      <form onSubmit={onSubmit} noValidate className="grid lg:grid-cols-[minmax(0,560px)_1fr] gap-8 items-start">
        <div className="flex flex-col gap-6">
          <Field label="Client name" error={errors.client_name}><Input invalid={!!errors.client_name} value={v.client_name} onChange={set("client_name")} placeholder="Ayu & Marco" /></Field>
          <Field label="Google Drive folder" hint="link or ID" error={errors.drive_folder_id}>
            <div className="flex gap-2">
              <Input invalid={!!errors.drive_folder_id} value={v.drive_folder_id} onChange={set("drive_folder_id")} onBlur={checkFolder} placeholder="https://drive.google.com/drive/folders/…" />
              <Btn type="button" onClick={checkFolder}>Check</Btn>
            </div>
            {folder && !errors.drive_folder_id && <span className={`t-small ${folder.ok ? "text-mute" : "text-error"}`}>{folder.msg}</span>}
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Photos in package" error={errors.photo_limit}><Input invalid={!!errors.photo_limit} type="number" min={1} max={1000} value={v.photo_limit} onChange={set("photo_limit")} /></Field>
            <Field label="Max with extras" hint="optional" error={errors.max_limit}><Input invalid={!!errors.max_limit} type="number" min={1} max={2000} value={v.max_limit} onChange={set("max_limit")} placeholder="45" /></Field>
            <Field label="PIN" hint="4 digits, optional" error={errors.pin}>
              <div className="flex gap-2">
                <Input invalid={!!errors.pin} inputMode="numeric" maxLength={4} value={v.pin} onChange={set("pin")} placeholder="leave blank for no PIN" />
                <Btn type="button" onClick={randomPin}>Random</Btn>
              </div>
            </Field>
            <Field label="Expires on" error={errors.expires_at}><Input invalid={!!errors.expires_at} type="date" value={v.expires_at} onChange={set("expires_at")} /></Field>
          </div>
          <Field label="Note to self" hint="optional"><Textarea value={v.notes} onChange={set("notes")} placeholder="Wedding · Uluwatu · deliver album by December" /></Field>
          <div className="flex gap-2 pt-2">
            <Btn kind="ink" type="submit" disabled={busy}>{busy ? "Creating…" : "Create session"}</Btn>
            <Btn type="button" onClick={() => router.push("/admin")}>Cancel</Btn>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="What happens next">
            <ol className="t-small text-mute flex flex-col gap-2 list-decimal pl-4">
              <li>The folder is read and thumbnails are prepared (a minute or two for 150 photos).</li>
              <li>When you see “Gallery ready”, send the link and PIN — the WhatsApp button writes the message for you.</li>
              <li>Picks save live. Watch progress here and export XMP when the client sends.</li>
            </ol>
          </Card>
          <Card title="Tip"><p className="t-small text-mute">Export web-size JPEGs (2048px, quality 80). Originals are never downloaded — only the folder is read.</p></Card>
        </div>
      </form>
    </>
  );
}
