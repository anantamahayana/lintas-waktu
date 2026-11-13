"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ApiError, api, type Invoice, type InvoiceBusiness, type InvoiceItem, type SessionOut } from "@/lib/admin-api";
import { Btn, Card, Field, Input, Select, Textarea, confirm, focusFirstInvalid, toast, useUnsavedChanges, type FieldErrors } from "@/components/admin/ui";
import { InvoiceDoc, money } from "@/components/invoice/InvoiceDoc";

type Values = {
  kind: "invoice" | "quote"; client_name: string; client_email: string; client_phone: string; client_address: string; event_label: string;
  issued_at: string; due_at: string; currency: "IDR" | "USD"; lang: "en" | "id"; items: InvoiceItem[]; discount: number; tax_percent: number; deposit_paid: number;
  notes: string; session_id: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function fromInvoice(i: Invoice): Values {
  return {
    kind: i.kind, client_name: i.client_name, client_email: i.client_email ?? "", client_phone: i.client_phone ?? "", client_address: i.client_address ?? "",
    event_label: i.event_label ?? "", issued_at: i.issued_at, due_at: i.due_at ?? "", currency: i.currency, lang: i.lang ?? "en", items: i.items.length ? i.items : [{ description: "", qty: 1, unit_price: 0 }],
    discount: i.discount, tax_percent: i.tax_percent, deposit_paid: i.deposit_paid, notes: i.notes ?? "", session_id: i.session_id ?? "",
  };
}

/** Quick lines the studio bills most — one tap to add, then edit the price. */
const PRESETS: { label: string; idr: number; usd: number }[] = [
  { label: "Pernikahan · foto + film, sehari penuh", idr: 28000000, usd: 1750 },
  { label: "Pernikahan · foto, sehari penuh", idr: 18000000, usd: 1150 },
  { label: "Sesi prewedding · setengah hari", idr: 6500000, usd: 400 },
  { label: "Liputan acara · per hari", idr: 7500000, usd: 470 },
  { label: "Sesi personal · 1 jam", idr: 2500000, usd: 160 },
  { label: "Foto tambahan (di luar paket)", idr: 150000, usd: 10 },
  { label: "Transport ke luar Bali", idr: 0, usd: 0 },
];

function totalsOf(v: Values) {
  const subtotal = v.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const discount = Math.min(Number(v.discount) || 0, subtotal);
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * (Number(v.tax_percent) || 0)) / 100);
  const total = taxable + tax;
  const deposit_paid = Math.min(Number(v.deposit_paid) || 0, total);
  return { subtotal, discount, taxable, tax, total, deposit_paid, balance: total - deposit_paid };
}

export function InvoiceForm({ invoice, business }: { invoice?: Invoice; business: InvoiceBusiness }) {
  const router = useRouter();
  const initial: Values = invoice ? fromInvoice(invoice) : {
    kind: "invoice", client_name: "", client_email: "", client_phone: "", client_address: "", event_label: "", issued_at: today(),
    due_at: plusDays(business.default_due_days || 7), currency: "IDR", lang: business.default_lang ?? "id", items: [{ description: "", qty: 1, unit_price: 0 }], discount: 0,
    tax_percent: business.tax_percent || 0, deposit_paid: 0, notes: ((business.default_lang ?? "id") === "id" ? business.default_terms_id : business.default_terms) || "", session_id: "",
  };
  const [v, setV] = useState<Values>(initial);
  // The default notes follow the document language, unless they were edited by hand.
  const termsOf = (l: "en" | "id") => (l === "id" ? business.default_terms_id : business.default_terms) || "";
  const swapTerms = (notes: string, from: "en" | "id", to: "en" | "id") => (from !== to && (!notes.trim() || notes.trim() === termsOf(from).trim()) ? termsOf(to) : notes);
  const [saved, setSaved] = useState<Values>(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sessions, setSessions] = useState<SessionOut[]>([]);
  const locked = invoice?.status === "paid" || invoice?.status === "void";
  const dirty = !locked && JSON.stringify(v) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);
  useEffect(() => { api.get<SessionOut[]>("/api/admin/sessions").then(setSessions).catch(() => {}); }, []);

  const set = <K extends keyof Values>(k: K) => (e: { target: { value: string } }) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const setItem = (i: number, patch: Partial<InvoiceItem>) => setV((s) => ({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const addItem = (it?: Partial<InvoiceItem>) => setV((s) => ({ ...s, items: [...s.items.filter((x) => x.description || x.unit_price), { description: "", qty: 1, unit_price: 0, ...it }] }));
  const removeItem = (i: number) => setV((s) => ({ ...s, items: s.items.length > 1 ? s.items.filter((_, j) => j !== i) : [{ description: "", qty: 1, unit_price: 0 }] }));

  // Link a proofing session: fills the client and offers its extras as a line
  const linkSession = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    setV((x) => ({ ...x, session_id: id, client_name: x.client_name || s?.client_name || "", client_phone: x.client_phone || (s?.client_wa ? `+${s.client_wa}` : ""), event_label: x.event_label || s?.notes?.split("\n")[0] || "", ...(s && !invoice && s.lang !== x.lang && x.currency === "IDR" ? { lang: s.lang, notes: swapTerms(x.notes, x.lang, s.lang) } : {}) }));
    if (s && s.extra_count > 0 && !v.items.some((it) => /extra/i.test(it.description))) {
      const p = PRESETS.find((x) => /Extra photograph/.test(x.label))!;
      addItem({ description: `Foto tambahan yang dipilih di galeri (${s.extra_count})`, qty: s.extra_count, unit_price: v.currency === "USD" ? p.usd : p.idr });
    }
  };

  const totals = useMemo(() => totalsOf(v), [v]);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!v.client_name.trim()) e.client_name = "Untuk siapa?";
    if (v.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.client_email)) e.client_email = "Sepertinya bukan alamat email.";
    const real = v.items.filter((it) => it.description.trim());
    if (real.length === 0) e.items = "Tambahkan minimal satu baris.";
    if (v.items.some((it) => it.description.trim() && (!(it.qty >= 1) || it.unit_price < 0))) e.items = "Setiap baris perlu jumlah minimal 1 dan harga 0 atau lebih.";
    if (v.due_at && v.issued_at && v.due_at < v.issued_at) e.due_at = "Jatuh tempo sebelum tanggal terbit.";
    if (totals.deposit_paid > totals.total) e.deposit_paid = "Melebihi total.";
    return e;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) { focusFirstInvalid(); return; }
    setBusy(true);
    try {
      const body = {
        ...v, items: v.items.filter((it) => it.description.trim()).map((it) => ({ description: it.description.trim(), qty: Number(it.qty), unit_price: Number(it.unit_price) })),
        client_email: v.client_email || null, client_phone: v.client_phone || null, client_address: v.client_address || null, event_label: v.event_label || null,
        due_at: v.due_at || null, notes: v.notes || null, session_id: v.session_id || null, discount: Number(v.discount) || 0, tax_percent: Number(v.tax_percent) || 0, deposit_paid: Number(v.deposit_paid) || 0,
      };
      const r = invoice ? await api.patch<Invoice>(`/api/admin/invoices/${invoice.id}`, body) : await api.post<Invoice>("/api/admin/invoices", body);
      const next = fromInvoice(r);
      setV(next); setSaved(next);
      toast(invoice ? "Tersimpan" : `${r.number} dibuat`);
      if (!invoice) router.replace(`/admin/invoices/${r.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) { setErrors(err.fields); focusFirstInvalid(); }
      toast(err instanceof Error ? err.message : "Gagal menyimpan", true);
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!invoice) return;
    if (!(await confirm({ title: `Hapus ${invoice.number}?`, body: "Draf terhapus permanen. Invoice lunas tidak bisa dihapus — batalkan (void) saja.", action: "Hapus", danger: true }))) return;
    try { await api.del(`/api/admin/invoices/${invoice.id}`); setSaved(v); toast(`${invoice.number} dihapus`); router.push("/admin/invoices"); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", true); }
  }

  const cur = v.currency;
  const preview = {
    number: invoice?.number ?? `${business.prefix || "LW"}-${new Date().getFullYear()}-····`, status: invoice?.status ?? "draft", kind: v.kind, client_name: v.client_name || "Nama klien",
    client_email: v.client_email, client_phone: v.client_phone, client_address: v.client_address, event_label: v.event_label, issued_at: v.issued_at, due_at: v.due_at || null,
    currency: cur, lang: v.lang, items: v.items.filter((it) => it.description.trim()), discount: totals.discount, tax_percent: Number(v.tax_percent) || 0, deposit_paid: totals.deposit_paid,
    notes: v.notes, paid_at: invoice?.paid_at ?? null, totals,
    verify_code: invoice && !dirty ? invoice.verify_code : undefined, verify_url: invoice && !dirty ? invoice.verify_url : undefined,
  } as const;

  return (
    <form onSubmit={save} noValidate className="grid xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)] gap-6 items-start">
      <div className="flex flex-col gap-4">
        {locked && <p className="t-small text-mute border border-line p-3">This {invoice?.kind} is {invoice?.status} and can’t be edited. Duplicate it to write a new one.</p>}
        <fieldset disabled={locked} className="contents">
          <Card title="Klien">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Jenis">
                <Select value={v.kind} onChange={set("kind")}><option value="invoice">Invoice</option><option value="quote">Penawaran</option></Select>
              </Field>
              <Field label="Dari sesi galeri" hint="opsional — mengisi data klien, menambah foto ekstra">
                <Select value={v.session_id} onChange={(e) => linkSession(e.target.value)}>
                  <option value="">—</option>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{s.client_name}{s.extra_count ? ` · ${s.extra_count} ekstra` : ""}</option>)}
                </Select>
              </Field>
              <Field label="Nama klien" error={errors.client_name}><Input invalid={!!errors.client_name} value={v.client_name} onChange={set("client_name")} placeholder="Ayu & Marco" /></Field>
              <Field label="Acara / pekerjaan" hint="tampil di bawah nama"><Input value={v.event_label} onChange={set("event_label")} placeholder="Pernikahan · Uluwatu · 14 Juni 2026" /></Field>
              <Field label="Email" hint="opsional" error={errors.client_email}><Input invalid={!!errors.client_email} type="email" value={v.client_email} onChange={set("client_email")} /></Field>
              <Field label="Telepon / WhatsApp" hint="opsional"><Input value={v.client_phone} onChange={set("client_phone")} placeholder="+62 812 3456 7890" /></Field>
            </div>
            <Field label="Alamat" hint="opsional"><Textarea value={v.client_address} onChange={set("client_address")} rows={2} className="!min-h-[64px]" /></Field>
          </Card>

          <Card title="Rincian">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => addItem({ description: p.label, unit_price: cur === "USD" ? p.usd : p.idr })} className="t-small border border-line px-2.5 py-1 hover:border-ink transition-colors">+ {p.label}</button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <div className="hidden sm:grid grid-cols-[1fr_64px_150px_auto] gap-2 t-mono text-faint px-1"><span>Keterangan</span><span className="text-right">Jml</span><span className="text-right">Harga satuan</span><span className="w-8" /></div>
              {v.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_64px_150px_auto] gap-2 items-center">
                  <Input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Foto + film pernikahan, 10 jam" className="col-span-2 sm:col-span-1" />
                  <Input type="number" min={1} value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} className="!w-[64px] text-right" aria-label="Jumlah" />
                  <Input type="number" min={0} step={cur === "USD" ? 1 : 1000} value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} className="text-right" aria-label="Harga satuan" />
                  <button type="button" onClick={() => removeItem(i)} aria-label="Hapus baris" className="h-8 w-8 text-mute hover:text-error">×</button>
                </div>
              ))}
              {errors.items && <span className="t-small text-error">{errors.items}</span>}
              <Btn type="button" className="self-start" onClick={() => addItem()}>+ Tambah baris</Btn>
            </div>
          </Card>

          <Card title="Biaya">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Mata uang" hint={cur === "USD" ? "dolar bulat" : "rupiah"}>
                <Select value={v.currency} onChange={(e) => setV((s) => { const lang = e.target.value === "USD" ? "en" : s.lang; return { ...s, currency: e.target.value as "IDR" | "USD", lang, notes: swapTerms(s.notes, s.lang, lang) }; })}><option value="IDR">IDR — Rupiah</option><option value="USD">USD — Dolar AS</option></Select>
              </Field>
              <Field label="Bahasa dokumen" hint="bahasa yang dibaca klien">
                <Select value={v.lang} onChange={(e) => { const lang = e.target.value as "en" | "id"; setV((s) => ({ ...s, lang, notes: swapTerms(s.notes, s.lang, lang) })); }}><option value="en">English</option><option value="id">Bahasa Indonesia</option></Select>
              </Field>
              <Field label="DP diterima" hint={invoice?.payments?.length ? "dari pembayaran yang dicatat di atas" : "sudah dibayar, mengurangi sisa tagihan"} error={errors.deposit_paid}><Input invalid={!!errors.deposit_paid} type="number" min={0} value={v.deposit_paid} onChange={set("deposit_paid")} disabled={!!invoice?.payments?.length} /></Field>
              <Field label="Diskon" hint="nominal"><Input type="number" min={0} value={v.discount} onChange={set("discount")} /></Field>
              <Field label="Pajak %" hint="0 kalau tidak terdaftar"><Input type="number" min={0} max={100} value={v.tax_percent} onChange={set("tax_percent")} /></Field>
              <Field label="Tanggal terbit"><Input type="date" value={v.issued_at} onChange={set("issued_at")} /></Field>
              <Field label={v.kind === "quote" ? "Berlaku sampai" : "Jatuh tempo"} error={errors.due_at}><Input invalid={!!errors.due_at} type="date" value={v.due_at} onChange={set("due_at")} /></Field>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1 t-small tabular-nums border-t border-line pt-3">
              <dt className="text-mute">Total</dt><dd className="text-right font-medium">{money(totals.total, cur)}</dd>
              {totals.deposit_paid > 0 && <><dt className="text-mute">Sisa tagihan</dt><dd className="text-right">{money(totals.balance, cur)}</dd></>}
            </dl>
            <Field label={v.kind === "quote" ? "Ketentuan" : "Catatan di dokumen"} hint="opsional"><Textarea value={v.notes} onChange={set("notes")} rows={3} /></Field>
          </Card>
        </fieldset>

        <div className="flex flex-wrap gap-2 items-center">
          {!locked && <Btn kind="ink" type="submit" disabled={busy || (!!invoice && !dirty)}>{busy ? "Menyimpan…" : invoice ? (dirty ? "Simpan perubahan" : "Tersimpan") : "Buat invoice"}</Btn>}
          {invoice && invoice.status !== "paid" && <Btn type="button" kind="danger" onClick={remove}>Hapus</Btn>}
        </div>
      </div>

      {/* Live document */}
      <div className={clsx("xl:sticky xl:top-8 flex flex-col gap-3", locked ? "" : "")}>
        <span className="t-mono text-mute">Pratinjau — berubah saat kamu mengetik</span>
        <div className="overflow-auto max-h-[calc(100vh-120px)]">
          <InvoiceDoc doc={preview} business={business} className="!text-[13px]" />
        </div>
      </div>
    </form>
  );
}
