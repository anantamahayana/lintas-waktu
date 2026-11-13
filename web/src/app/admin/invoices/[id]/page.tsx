"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Invoice, type InvoiceBusiness, type InvoicePayment } from "@/lib/admin-api";
import { Card } from "@/components/admin/ui";
import { Btn, Field, Input, LoadError, PageHeader, Pill, Select, SkeletonForm, confirm, fmtDate, toast } from "@/components/admin/ui";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { money } from "@/components/invoice/InvoiceDoc";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [biz, setBiz] = useState<InvoiceBusiness | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => {
    Promise.all([api.get<Invoice>(`/api/admin/invoices/${id}`), api.get<InvoiceBusiness>("/api/admin/invoice-settings")])
      .then(([i, b]) => { setInv(i); setBiz(b); setErr(null); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (err) return <LoadError error={err} retry={() => { setErr(null); load(); }} />;
  if (!inv || !biz) return <SkeletonForm fields={8} />;

  const t = inv.totals;
  const setStatus = async (status: Invoice["status"], ask?: Parameters<typeof confirm>[0]) => {
    if (ask && !(await confirm(ask))) return;
    try { const r = await api.post<Invoice>(`/api/admin/invoices/${inv.id}/status`, { status }); setInv(r); toast(`Ditandai ${status}`); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  };
  const copyLink = () => { navigator.clipboard.writeText(inv.public_url); toast("Link disalin"); };
  const wa = () => {
    const first = inv.client_name.split(" ")[0];
    const text = inv.lang === "id"
      ? `Halo ${first}, berikut ${inv.kind === "quote" ? "penawaran" : "invoice"} ${inv.number} dari ${biz.name}:\n${inv.public_url}${inv.kind !== "quote" && t.balance > 0 ? `\n\nSisa tagihan: ${money(t.balance, inv.currency)}${inv.due_at ? ` sebelum ${fmtDate(inv.due_at)}` : ""}` : ""}\n\nTerima kasih!`
      : `Hi ${first}, here is your ${inv.kind === "quote" ? "quotation" : "invoice"} ${inv.number} from ${biz.name}:\n${inv.public_url}${inv.kind !== "quote" && t.balance > 0 ? `\n\nBalance due: ${money(t.balance, inv.currency)}${inv.due_at ? ` by ${fmtDate(inv.due_at)}` : ""}` : ""}\n\nThank you!`;
    window.open(`https://wa.me/${inv.client_wa}?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
  };
  const duplicate = async () => {
    try { const r = await api.post<Invoice>(`/api/admin/invoices/${inv.id}/duplicate`); toast(`${r.number} dibuat`); router.push(`/admin/invoices/${r.id}`); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  };

  const pill = inv.status === "paid" ? <Pill tone="ok">Lunas {fmtDate(inv.paid_at)}</Pill> : inv.status === "void" ? <Pill tone="mute">Batal (void)</Pill> : inv.status === "sent" ? <Pill tone="warn">Terkirim {fmtDate(inv.sent_at)} · sisa {money(t.balance, inv.currency)}</Pill> : <Pill tone="mute">Draf · belum terlihat oleh klien</Pill>;

  return (
    <>
      <PageHeader
        eyebrow={<><Link href="/admin/invoices" className="link">Invoice</Link> · {inv.kind === "quote" ? "penawaran" : "invoice"}</> as unknown as string}
        title={inv.number}
        actions={
          <>
            {inv.status === "draft" && <Btn kind="ink" onClick={() => setStatus("sent", { title: `Kirim ${inv.number}?`, body: "Link klien menjadi aktif. Dokumen masih bisa diubah setelahnya; klien selalu melihat versi terbaru.", action: "Tandai terkirim" })}>Tandai terkirim</Btn>}
            {inv.status !== "draft" && inv.status !== "void" && <Btn onClick={copyLink}>Salin link klien</Btn>}
            {inv.status !== "draft" && inv.status !== "void" && <Btn onClick={wa}>Kirim via WhatsApp</Btn>}
            <a className="action !py-2.5 !px-4" href={`/admin/invoices/${inv.id}/print`} target="_blank" rel="noreferrer">Cetak / PDF</a>
            {inv.status === "sent" && <Btn kind="ink" onClick={() => setStatus("paid", { title: `Tandai ${inv.number} lunas?`, body: `${money(t.total, inv.currency)} dibayar penuh. Dokumen mendapat cap Lunas dan tidak bisa diubah lagi.`, action: "Tandai lunas" })}>Tandai lunas</Btn>}
            {inv.status !== "void" && inv.status !== "draft" && <Btn kind="danger" onClick={() => setStatus("void", { title: `Batalkan ${inv.number}?`, body: "Link tetap terbuka tetapi dokumen diberi cap Batal. Pakai ini daripada menghapus invoice yang sudah dikirim atau lunas.", action: "Batalkan", danger: true })}>Batal (void)</Btn>}
            <Btn onClick={duplicate}>Duplikat</Btn>
            <Link href={`/admin/calendar?invoice=${inv.id}`} className="action !py-2.5 !px-4">Tambah ke kalender</Link>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        {pill}
        {inv.status !== "draft" && (
          <span className="t-small text-mute flex items-center gap-2">
            Kode verifikasi <span className="font-mono text-ink tracking-[0.12em]">{inv.verify_code}</span>
            <a href={inv.verify_url} target="_blank" rel="noreferrer" className="link">cek ↗</a>
            {inv.sent_hash && inv.sent_hash !== inv.current_hash && <span className="text-error">· diubah setelah dikirim — salinan klien sudah tidak sama; link menampilkan versi baru, kirim ulang</span>}
          </span>
        )}
      </div>
      {inv.kind === "invoice" && inv.status !== "void" && <Payments inv={inv} biz={biz} onChange={setInv} />}
      <InvoiceForm key={inv.updated_at} invoice={inv} business={biz} />
      <div className="mt-6 max-w-[560px]"><History id={inv.id} stamp={inv.updated_at} /></div>
    </>
  );
}

type Ev = { at: string; action: string; detail: { fields?: string[]; hash?: string; total?: number; from?: string; after_sent?: boolean } };
const LABEL: Record<string, string> = { created: "Dibuat", updated: "Diubah", sent: "Ditandai terkirim", paid: "Ditandai lunas", void: "Dibatalkan", draft: "Kembali ke draf", duplicated: "Diduplikat", payment: "Pembayaran diterima", payment_removed: "Pembayaran dihapus" };

const METHOD: Record<InvoicePayment["method"], string> = { transfer: "Transfer bank", qris: "QRIS", cash: "Tunai", other: "Lainnya" };
const today = () => new Date().toISOString().slice(0, 10);

/** Money in: record a booking fee, instalment or settlement; each gets a receipt the client can open. */
function Payments({ inv, biz, onChange }: { inv: Invoice; biz: InvoiceBusiness; onChange: (i: Invoice) => void }) {
  const t = inv.totals;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(t.balance));
  const [paidOn, setPaidOn] = useState(today());
  const [method, setMethod] = useState<InvoicePayment["method"]>("transfer");
  const [busy, setBusy] = useState(false);
  const half = Math.round(t.total / 2);
  const start = () => { setAmount(String(inv.payments.length === 0 && t.balance === t.total ? half : t.balance)); setPaidOn(today()); setOpen(true); };
  const save = async () => {
    const n = Number(amount.replace(/\D/g, ""));
    if (!n || n > t.balance) { toast(`Isi 1 – ${money(t.balance, inv.currency)}`, true); return; }
    setBusy(true);
    try { const r = await api.post<Invoice>(`/api/admin/invoices/${inv.id}/payments`, { amount: n, paid_on: paidOn, method }); onChange(r); setOpen(false); toast(r.status === "paid" ? "Lunas" : "Pembayaran dicatat"); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
    finally { setBusy(false); }
  };
  const remove = async (p: InvoicePayment) => {
    if (!(await confirm({ title: `Hapus ${p.receipt_no}?`, body: `${money(p.amount, inv.currency)} tanggal ${fmtDate(p.paid_on)}. Sisa tagihan naik lagi dan link kuitansinya tidak berlaku.`, action: "Hapus", danger: true }))) return;
    try { await api.del(`/api/admin/invoices/${inv.id}/payments/${p.id}`); onChange(await api.get<Invoice>(`/api/admin/invoices/${inv.id}`)); toast("Pembayaran dihapus"); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  };
  const waReceipt = (p: InvoicePayment, i: number) => {
    const first = inv.client_name.split(" ")[0];
    const after = inv.payments.slice(0, i + 1).reduce((a, x) => a + x.amount, 0), left = Math.max(0, t.total - after);
    const text = inv.lang === "id"
      ? `Halo ${first}, terima kasih — pembayaran ${money(p.amount, inv.currency)} sudah kami terima 🙏\nKuitansi ${p.receipt_no}: ${p.receipt_url}${left > 0 ? `\n\nSisa tagihan: ${money(left, inv.currency)}${inv.due_at ? ` sebelum ${fmtDate(inv.due_at)}` : ""}.` : "\n\nTagihan sudah lunas."}\n\n${biz.name}`
      : `Hi ${first}, thank you — we've received your payment of ${money(p.amount, inv.currency)} 🙏\nReceipt ${p.receipt_no}: ${p.receipt_url}${left > 0 ? `\n\nBalance due: ${money(left, inv.currency)}${inv.due_at ? ` by ${fmtDate(inv.due_at)}` : ""}.` : "\n\nThe invoice is now paid in full."}\n\n${biz.name}`;
    window.open(`https://wa.me/${inv.client_wa}?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
  };
  return (
    <div className="mb-6"><Card title="Pembayaran">
      <div className="flex flex-col gap-3">
        {inv.payments.length === 0 && <p className="t-small text-mute">Belum ada pembayaran. Catat DP atau transfer di sini — klien mendapat link kuitansi.</p>}
        {inv.payments.map((p, i) => (
          <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line pb-3 t-small">
            <span className="font-mono text-mute">{p.receipt_no}</span>
            <span className="tabular-nums font-medium">{money(p.amount, inv.currency)}</span>
            <span className="text-mute">{fmtDate(p.paid_on)} · {METHOD[p.method]}</span>
            <span className="grow" />
            <a href={p.receipt_url} target="_blank" rel="noreferrer" className="link">Kuitansi ↗</a>
            {inv.client_wa && <button type="button" className="link" onClick={() => waReceipt(p, i)}>Kirim via WhatsApp</button>}
            <button type="button" className="link text-error" onClick={() => remove(p)}>Hapus</button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 t-small tabular-nums">
          <span>Total {money(t.total, inv.currency)}</span><span>Diterima {money(t.deposit_paid, inv.currency)}</span>
          <span className={t.balance > 0 ? "font-medium" : "text-[#5f7a4a] font-medium"}>{t.balance > 0 ? `Sisa ${money(t.balance, inv.currency)}` : "Lunas"}</span>
        </div>
        {t.balance > 0 && !open && <div><Btn kind="ink" onClick={start}>Terima pembayaran</Btn></div>}
        {open && (
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <Field label="Jumlah" hint={`sisa ${money(t.balance, inv.currency)}`}><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
            <Field label="Tanggal diterima"><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
            <Field label="Cara bayar"><Select value={method} onChange={(e) => setMethod(e.target.value as InvoicePayment["method"])}>{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <div className="sm:col-span-3 flex gap-3">
              <Btn kind="ink" onClick={save} disabled={busy}>{busy ? "Menyimpan…" : "Catat pembayaran"}</Btn>
              <Btn onClick={() => setAmount(String(half > t.balance ? t.balance : half))}>50%</Btn>
              <Btn onClick={() => setAmount(String(t.balance))}>Lunasi sisa</Btn>
              <Btn onClick={() => setOpen(false)}>Batal</Btn>
            </div>
          </div>
        )}
      </div>
    </Card></div>
  );
}

/** Audit trail — who did what to this document, and when. */
function History({ id, stamp }: { id: string; stamp: string }) {
  const [rows, setRows] = useState<Ev[] | null>(null);
  useEffect(() => { api.get<Ev[]>(`/api/admin/invoices/${id}/events`).then(setRows).catch(() => setRows([])); }, [id, stamp]);
  if (!rows || rows.length === 0) return null;
  return (
    <Card title="Riwayat">
      <ol className="flex flex-col gap-2 t-small">
        {rows.map((e, i) => (
          <li key={i} className="grid grid-cols-[150px_1fr] gap-3">
            <span className="text-mute tabular-nums">{fmtDate(e.at, true)}</span>
            <span>
              {LABEL[e.action] ?? e.action}
              {e.detail.fields && <span className="text-mute"> · {e.detail.fields.join(", ")}{e.detail.after_sent && <span className="text-error"> (setelah dikirim)</span>}</span>}
              {e.detail.from && <span className="text-mute"> · dari {e.detail.from}</span>}
              {e.detail.hash && <span className="text-faint font-mono"> · {e.detail.hash.slice(0, 8)}</span>}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
