"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, type SiteSettings } from "@/lib/admin-api";
import { Btn, Card, Field, Input, PageHeader, Textarea, confirm, toast, useUnsavedChanges } from "@/components/admin/ui";

type Branding = { studio_name: string; tagline: string; contact: string; logo_url: string | null };

export default function SettingsPage() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [b, setB] = useState<Branding | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<SiteSettings | null>(null);
  const dirty = !!s && !!saved && JSON.stringify(s) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);

  useEffect(() => {
    api.get<SiteSettings>("/api/admin/site-settings").then((x) => { setS(x); setSaved(x); }).catch((e) => toast(e.message, true));
    api.get<Branding>("/api/admin/branding").then(setB).catch(() => {});
  }, []);
  if (!s) return <p className="t-small text-mute">Loading…</p>;

  const set = (k: keyof SiteSettings) => (e: { target: { value: string } }) => setS((x) => (x ? { ...x, [k]: typeof x[k] === "number" ? Number(e.target.value) : e.target.value } : x));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    try {
      await api.put("/api/admin/site-settings", s);
      // keep the proofing gallery's branding in step (studio name + tagline + contact)
      await api.put("/api/admin/branding", { studio_name: s.studio_name, tagline: s.descriptor_en, contact: s.whatsapp_display || s.email }).catch(() => {});
      setSaved(s);
      toast("Settings saved");
    } catch (err) { toast(err instanceof Error ? err.message : "Failed", true); } finally { setBusy(false); }
  }

  async function uploadLogo(file: File) {
    const fd = new FormData(); fd.append("file", file);
    try { const r = await api.upload<Branding>("/api/admin/branding/logo", fd); setB(r); toast("Logo uploaded"); } catch (err) { toast(err instanceof Error ? err.message : "Failed", true); }
  }
  async function removeLogo() {
    if (!(await confirm({ title: "Remove the logo?", body: "Client galleries show the studio name as text instead. You can upload a logo again any time.", action: "Remove logo", danger: true }))) return;
    try { await api.del("/api/admin/branding/logo"); setB((x) => (x ? { ...x, logo_url: null } : x)); toast("Logo removed"); } catch (err) { toast(err instanceof Error ? err.message : "Failed", true); }
  }

  return (
    <>
      <PageHeader eyebrow="Website" title="Site settings" actions={<Btn kind="ink" onClick={(e) => save(e as unknown as FormEvent)} disabled={busy || !dirty}>{busy ? "Saving…" : dirty ? "Save changes" : "Saved"}</Btn>} />
      <form onSubmit={save} className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
          <Card title="Studio">
            <Field label="Studio name"><Input value={s.studio_name} onChange={set("studio_name")} /></Field>
            <Field label="Descriptor (EN)"><Input value={s.descriptor_en} onChange={set("descriptor_en")} /></Field>
            <Field label="Descriptor (ID)"><Input value={s.descriptor_id} onChange={set("descriptor_id")} /></Field>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 border border-line bg-[#f6f5f1] flex items-center justify-center overflow-hidden shrink-0">
                {b?.logo_url ? <img src={api.img(b.logo_url)} alt="logo" className="max-h-full max-w-full object-contain" /> : <span className="font-serif italic text-[18px] text-faint">LW</span>}
              </div>
              <div className="flex flex-col gap-2">
                <p className="t-small text-mute">Logo for the client gallery intro. PNG with transparency, ≥ 600px wide. Until a logo exists the wordmark is shown.</p>
                <div className="flex gap-2">
                  <label className="t-mono inline-flex items-center px-4 py-2.5 border border-line hover:border-ink cursor-pointer">Upload logo<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></label>
                  {b?.logo_url && <Btn type="button" kind="danger" onClick={removeLogo}>Remove</Btn>}
                </div>
              </div>
            </div>
          </Card>
          <Card title="Contact & social">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="WhatsApp number" hint="digits, with country code"><Input value={s.whatsapp_number} onChange={set("whatsapp_number")} placeholder="6281234567890" /></Field>
              <Field label="WhatsApp (as shown)"><Input value={s.whatsapp_display} onChange={set("whatsapp_display")} placeholder="+62 812 3456 7890" /></Field>
              <Field label="Email"><Input type="email" value={s.email} onChange={set("email")} placeholder="hello@lintaswaktu.com" /></Field>
              <Field label="Instagram" hint="without @"><Input value={s.instagram} onChange={set("instagram")} placeholder="lintaswaktu" /></Field>
            </div>
            <Field label="Service area"><Input value={s.service_area} onChange={set("service_area")} placeholder="Bali · beyond on request" /></Field>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Languages & currency">
            <p className="t-small text-mute">English is the primary language; Indonesian is served at /id. Prices are entered in IDR; the USD figure uses this rate.</p>
            <Field label="USD rate" hint="IDR per 1 USD"><Input type="number" min={1000} value={s.usd_rate} onChange={set("usd_rate")} /></Field>
          </Card>
          <Card title="Client gallery defaults">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Default package size"><Input type="number" min={1} value={s.default_package_size} onChange={set("default_package_size")} /></Field>
              <Field label="Default validity (days)"><Input type="number" min={1} value={s.default_validity_days} onChange={set("default_validity_days")} /></Field>
            </div>
            <Field label="WhatsApp message template" hint="{name} {link} {pin} {deadline}"><Textarea value={s.whatsapp_template} onChange={set("whatsapp_template")} rows={3} /></Field>
          </Card>
        </div>
      </form>
    </>
  );
}
