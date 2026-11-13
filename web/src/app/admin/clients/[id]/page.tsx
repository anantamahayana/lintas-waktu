"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/admin-api";
import { Card, LoadError, PageHeader, Pill, SkeletonForm, fmtDate } from "@/components/admin/ui";
import { money } from "@/components/invoice/InvoiceDoc";
import { countsText, type ClientSummary } from "@/lib/clients";

type Item = { type: string; id: string; title: string; status: string; at: string; link: string; amount: number | null; balance: number | null; currency: string | null };
type Payment = { receipt_no: string; amount: number; currency: string; paid_on: string; invoice_number: string; receipt_url: string };
type Detail = ClientSummary & { names: string[]; items: Item[]; payments: Payment[] };
const TYPE: Record<string, string> = { session: "Galeri", proof: "Proof album", invoice: "Invoice", booking: "Booking", inquiry: "Pesan" };
const tone = (s: string): "ok" | "warn" | "mute" | "new" => (["completed", "paid", "approved", "booked", "done"].includes(s) ? "ok" : ["sent", "pending", "open", "tentative"].includes(s) ? "warn" : s === "new" ? "new" : "mute");

/** One client: every gallery, proof, invoice, payment, booking and message, newest first. */
export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [c, setC] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.get<Detail>(`/api/admin/clients/${id}`).then(setC).catch((e) => setErr(e instanceof Error ? e.message : "Failed")); }, [id]);
  if (err) return <LoadError error={err} retry={() => location.reload()} />;
  if (!c) return <SkeletonForm fields={6} />;
  return (
    <>
      <PageHeader eyebrow={<><Link href="/admin/clients" className="link">Klien</Link></> as unknown as string} title={c.name}
        actions={<>
          {c.wa && <a className="action !py-2.5 !px-4" href={`https://wa.me/${c.wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          <Link className="action !py-2.5 !px-4" href="/admin/invoices/new">Invoice baru</Link>
          <Link className="action !py-2.5 !px-4" href="/admin/sessions/new">Galeri baru</Link>
        </>} />
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-1 t-small text-mute">
        {c.wa && <span className="font-mono">+{c.wa}</span>}{c.email && <span>{c.email}</span>}<span>{countsText(c.counts)}</span>
        {c.balance > 0 && <span className="text-ink font-medium">Sisa tagihan {money(c.balance, "IDR")}</span>}
        {c.names.length > 1 && <span>Juga tercatat sebagai: {c.names.filter((n) => n !== c.name).join(", ")}</span>}
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <Card title="Semua riwayat">
          <ol className="flex flex-col">
            {c.items.map((x) => (
              <li key={x.type + x.id} className="border-b border-line last:border-b-0">
                <Link href={x.link} className="block py-3 px-1 hover:bg-[#f6f5f1]">
                  <div className="flex items-baseline gap-3"><span className="t-mono text-faint">{TYPE[x.type] ?? x.type}</span><span className="grow" /><span className="t-small text-faint">{fmtDate(x.at)}</span></div>
                  <div className="mt-1 text-[14px]">{x.title}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 t-small">
                    <Pill tone={tone(x.status)}>{x.status}</Pill>
                    {x.amount !== null && x.currency && <span className="tabular-nums">{money(x.amount, x.currency)}{x.balance ? <span className="text-mute"> · sisa {money(x.balance, x.currency)}</span> : null}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Pembayaran">
          {c.payments.length === 0 ? <p className="t-small text-mute">Belum ada pembayaran.</p> : (
            <ul className="flex flex-col gap-2 t-small">
              {c.payments.map((p) => (
                <li key={p.receipt_no} className="flex items-center gap-3 tabular-nums">
                  <a href={p.receipt_url} target="_blank" rel="noreferrer" className="link font-mono">{p.receipt_no}</a>
                  <span className="flex-1 text-right">{money(p.amount, p.currency)}</span>
                  <span className="text-faint">{fmtDate(p.paid_on)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
