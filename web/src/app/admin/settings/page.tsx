"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api, type InvoiceBusiness, type SiteSettings } from "@/lib/admin-api";
import { Btn, Card, Field, Input, PageHeader, Textarea, confirm, focusFirstInvalid, toast, useUnsavedChanges, LoadError, SkeletonForm, type FieldErrors } from "@/components/admin/ui";

type Branding = { studio_name: string; tagline: string; contact: string; logo_url: string | null };

export default function SettingsPage() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [b, setB] = useState<Branding | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState<SiteSettings | null>(null);
  const dirty = !!s && !!saved && JSON.stringify(s) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);

  const [err, setErr] = useState<string | null>(null);
  const load = () => {
    api.get<SiteSettings>("/api/admin/site-settings").then((x) => { setS(x); setSaved(x); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
    api.get<Branding>("/api/admin/branding").then(setB).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  if (err) return <LoadError error={err} retry={() => { setErr(null); load(); }} />;
  if (!s) return <SkeletonForm fields={10} />;

  const set = (k: keyof SiteSettings) => (e: { target: { value: string } }) => {
    setS((x) => (x ? { ...x, [k]: typeof x[k] === "number" ? Number(e.target.value) : e.target.value } : x));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!s) return e;
    if (!s.studio_name.trim()) e.studio_name = "The studio name appears on every page.";
    if (s.whatsapp_number && !/^\d{8,15}$/.test(s.whatsapp_number)) e.whatsapp_number = "Digits only, with country code — e.g. 6281234567890.";
    if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) e.email = "That doesn’t look like an email address.";
    if (s.instagram && /[@\s/]/.test(s.instagram)) e.instagram = "Just the handle, without @ or a link.";
    if (!(s.usd_rate > 0)) e.usd_rate = "Enter the IDR value of 1 USD.";
    if (!(s.default_package_size >= 1)) e.default_package_size = "At least 1.";
    if (!(s.default_validity_days >= 1)) e.default_validity_days = "At least 1 day.";
    return e;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) { focusFirstInvalid(); return; }
    setBusy(true);
    try {
      await api.put("/api/admin/site-settings", s);
      // keep the proofing gallery's branding in step (studio name + tagline + contact)
      await api.put("/api/admin/branding", { studio_name: s.studio_name, tagline: s.descriptor_en, contact: s.whatsapp_display || s.email }).catch(() => {});
      setSaved(s);
      toast("Settings saved");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) { setErrors(err.fields); focusFirstInvalid(); }
      toast(err instanceof Error ? err.message : "Failed", true);
    } finally { setBusy(false); }
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
      <form onSubmit={save} noValidate className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
          <Card title="Studio">
            <Field label="Studio name" error={errors.studio_name}><Input invalid={!!errors.studio_name} value={s.studio_name} onChange={set("studio_name")} /></Field>
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
              <Field label="WhatsApp number" hint="digits, with country code" error={errors.whatsapp_number}><Input invalid={!!errors.whatsapp_number} value={s.whatsapp_number} onChange={set("whatsapp_number")} placeholder="6281234567890" /></Field>
              <Field label="WhatsApp (as shown)"><Input value={s.whatsapp_display} onChange={set("whatsapp_display")} placeholder="+62 812 3456 7890" /></Field>
              <Field label="Email" error={errors.email}><Input invalid={!!errors.email} type="email" value={s.email} onChange={set("email")} placeholder="hello@lintaswaktu.com" /></Field>
              <Field label="Instagram" hint="without @" error={errors.instagram}><Input invalid={!!errors.instagram} value={s.instagram} onChange={set("instagram")} placeholder="lintaswaktu" /></Field>
            </div>
            <Field label="Service area"><Input value={s.service_area} onChange={set("service_area")} placeholder="Bali · beyond on request" /></Field>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Languages & currency">
            <p className="t-small text-mute">English is the primary language; Indonesian is served at /id. Prices are entered in IDR; the USD figure uses this rate.</p>
            <Field label="USD rate" hint="IDR per 1 USD" error={errors.usd_rate}><Input invalid={!!errors.usd_rate} type="number" min={1000} value={s.usd_rate} onChange={set("usd_rate")} /></Field>
          </Card>
          <Card title="Client gallery defaults">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Default package size" error={errors.default_package_size}><Input invalid={!!errors.default_package_size} type="number" min={1} value={s.default_package_size} onChange={set("default_package_size")} /></Field>
              <Field label="Default validity (days)" error={errors.default_validity_days}><Input invalid={!!errors.default_validity_days} type="number" min={1} value={s.default_validity_days} onChange={set("default_validity_days")} /></Field>
            </div>
            <Field label="WhatsApp message · English" hint="{name} {link} {pin} {package} {extras} {deadline} {studio} — lines whose value is empty are dropped"><Textarea value={s.whatsapp_template} onChange={set("whatsapp_template")} rows={6} /></Field>
            <Field label="WhatsApp message · Bahasa Indonesia" hint="same placeholders — used for sessions whose client language is Indonesian"><Textarea value={s.whatsapp_template_id} onChange={set("whatsapp_template_id")} rows={6} /></Field>
          </Card>
          <InvoiceCard />
          <PasswordCard />
        </div>
      </form>
    </>
  );
}

/** Admin password set here overrides ADMIN_PASSWORD in api/.env (stored hashed). */
function PasswordCard() {
  const [v, setV] = useState({ current: "", next: "", again: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => { setV((x) => ({ ...x, [k]: e.target.value })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined })); };
  async function change() {
    const e: FieldErrors = {};
    if (!v.current) e.current = "Enter your current password.";
    if (v.next.length < 8) e.next = "At least 8 characters.";
    if (v.again !== v.next) e.again = "Doesn’t match the new password.";
    setErrors(e);
    if (Object.values(e).some(Boolean)) { focusFirstInvalid(); return; }
    if (!(await confirm({ title: "Change the admin password?", body: "You stay signed in here; any other device will need the new password next time.", action: "Change password" }))) return;
    setBusy(true);
    try {
      await api.post("/api/admin/password", { current: v.current, new: v.next });
      setV({ current: "", next: "", again: "" });
      toast("Password changed");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) { setErrors({ current: "That isn’t the current password." }); focusFirstInvalid(); }
      else toast(err instanceof Error ? err.message : "Failed", true);
    } finally { setBusy(false); }
  }
  return (
    <Card title="Admin password">
      <p className="t-small text-mute">Set from here, the password replaces the one in the server’s .env file.</p>
      <Field label="Current password" error={errors.current}><Input invalid={!!errors.current} type="password" autoComplete="current-password" value={v.current} onChange={set("current")} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="New password" hint="8+ characters" error={errors.next}><Input invalid={!!errors.next} type="password" autoComplete="new-password" value={v.next} onChange={set("next")} /></Field>
        <Field label="Repeat new password" error={errors.again}><Input invalid={!!errors.again} type="password" autoComplete="new-password" value={v.again} onChange={set("again")} /></Field>
      </div>
      <div><Btn type="button" onClick={change} disabled={busy}>{busy ? "Changing…" : "Change password"}</Btn></div>
    </Card>
  );
}

/** Letterhead + bank details printed on invoices. Never exposed on the public site (only on invoice links). */
function InvoiceCard() {
  const [b, setB] = useState<InvoiceBusiness | null>(null);
  const [saved, setSaved] = useState<InvoiceBusiness | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get<InvoiceBusiness>("/api/admin/invoice-settings").then((x) => { setB(x); setSaved(x); }).catch(() => {}); }, []);
  const dirty = !!b && !!saved && JSON.stringify(b) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);
  if (!b) return null;
  const set = (k: keyof InvoiceBusiness) => (e: { target: { value: string } }) => setB((x) => (x ? { ...x, [k]: typeof x[k] === "number" ? Number(e.target.value) : e.target.value } : x));
  async function save() {
    if (!b) return;
    setBusy(true);
    try { const r = await api.put<InvoiceBusiness>("/api/admin/invoice-settings", b); setB(r); setSaved(r); toast("Invoice details saved"); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", true); } finally { setBusy(false); }
  }
  return (
    <Card title="Invoices · letterhead & payment">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Business name"><Input value={b.name} onChange={set("name")} /></Field>
        <Field label="Tagline"><Input value={b.tagline} onChange={set("tagline")} /></Field>
        <Field label="Email on invoices"><Input value={b.email} onChange={set("email")} /></Field>
        <Field label="Phone on invoices"><Input value={b.phone} onChange={set("phone")} /></Field>
        <Field label="Number prefix" hint="LW → LW-2026-0001"><Input value={b.prefix} onChange={set("prefix")} maxLength={8} /></Field>
        <Field label="Default due (days)"><Input type="number" min={0} value={b.default_due_days} onChange={set("default_due_days")} /></Field>
        <Field label="Default tax %" hint="0 if not PKP"><Input type="number" min={0} max={100} value={b.tax_percent} onChange={set("tax_percent")} /></Field>
      </div>
      <Field label="Address" hint="footer of the document"><Textarea value={b.address} onChange={set("address")} rows={2} className="!min-h-[64px]" /></Field>
      <Field label="Bank / payment details" hint="printed on invoices that still have a balance"><Textarea value={b.bank_details} onChange={set("bank_details")} rows={3} placeholder={"BCA 123 456 7890 · a.n. I Komang Ananta Mahayana"} /></Field>
      <Field label="Default notes / terms"><Textarea value={b.default_terms} onChange={set("default_terms")} rows={3} /></Field>
      <div><Btn type="button" kind="ink" onClick={save} disabled={busy || !dirty}>{busy ? "Saving…" : dirty ? "Save invoice details" : "Saved"}</Btn></div>
    </Card>
  );
}
