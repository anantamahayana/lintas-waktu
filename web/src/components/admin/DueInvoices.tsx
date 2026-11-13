"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Invoice, type InvoiceBusiness } from "@/lib/admin-api";
import { money } from "@/components/invoice/InvoiceDoc";
import { fmtDate } from "@/components/admin/ui";

const dayDiff = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);

/** Invoices with money still owed that are due within a week or already late, each with a polite WhatsApp nudge. */
export function DueInvoices() {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [biz, setBiz] = useState<InvoiceBusiness | null>(null);
  useEffect(() => {
    Promise.all([api.get<Invoice[]>("/api/admin/invoices?status=sent"), api.get<InvoiceBusiness>("/api/admin/invoice-settings")])
      .then(([list, b]) => { setRows(list.filter((i) => i.kind === "invoice" && i.totals.balance > 0 && !!i.due_at && dayDiff(i.due_at) <= 7).sort((a, b) => a.due_at!.localeCompare(b.due_at!))); setBiz(b); })
      .catch(() => setRows([]));
  }, []);
  if (!rows || rows.length === 0 || !biz) return null;
  const nudge = (i: Invoice) => {
    const first = i.client_name.split(" ")[0], d = dayDiff(i.due_at!), bal = money(i.totals.balance, i.currency), when = fmtDate(i.due_at);
    const text = i.lang === "id"
      ? `Halo ${first}, semoga sehat selalu 🙏 Sekadar mengingatkan, sisa tagihan ${i.number} sebesar ${bal} ${d < 0 ? `jatuh tempo pada ${when}` : d === 0 ? "jatuh tempo hari ini" : `jatuh tempo ${when}`}.\nDetail & rekening: ${i.public_url}\n\nKalau sudah transfer, abaikan pesan ini ya. Terima kasih!\n${biz.name}`
      : `Hi ${first}, hope you're well 🙏 A gentle reminder that the balance on ${i.number}, ${bal}, ${d < 0 ? `was due on ${when}` : d === 0 ? "is due today" : `is due on ${when}`}.\nDetails & payment info: ${i.public_url}\n\nIf you've already paid, please ignore this. Thank you!\n${biz.name}`;
    window.open(`https://wa.me/${i.client_wa}?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
  };
  return (
    <div className="mb-8 border border-line">
      <div className="px-4 py-3 border-b border-line t-mono text-faint">Payments due · {rows.length}</div>
      {rows.map((i) => {
        const d = dayDiff(i.due_at!);
        return (
          <div key={i.id} className="px-4 py-3 border-b border-line last:border-b-0 flex flex-wrap items-center gap-x-5 gap-y-1 t-small">
            <Link href={`/admin/invoices/${i.id}`} className="link font-mono">{i.number}</Link>
            <span className="font-medium">{i.client_name}</span>
            <span className="tabular-nums">{money(i.totals.balance, i.currency)}</span>
            <span className={d < 0 ? "text-error" : d <= 2 ? "text-[#a8741a]" : "text-mute"}>{d < 0 ? `${-d} d late` : d === 0 ? "due today" : `due in ${d} d`} · {fmtDate(i.due_at)}</span>
            <span className="grow" />
            {i.client_wa ? <button type="button" className="link" onClick={() => nudge(i)}>Remind via WhatsApp</button> : <span className="text-faint">no WhatsApp number</span>}
          </div>
        );
      })}
    </div>
  );
}
