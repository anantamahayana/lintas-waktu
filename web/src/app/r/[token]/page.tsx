import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { money } from "@/components/invoice/InvoiceDoc";
import { PrintButton } from "@/components/invoice/PrintButton";
import { RECEIPT } from "@/components/invoice/strings";

const API = process.env.API_URL || "http://localhost:8000";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Receipt = {
  receipt_no: string; amount: number; paid_on: string; method: string; note: string | null; currency: string; lang: string; client_name: string;
  event_label: string | null; invoice_number: string; invoice_url: string; invoice_total: number; paid_so_far: number; balance_after: number;
  business: { name: string; tagline?: string; address?: string; email?: string; phone?: string };
};

/** Proof of payment the client can keep: one per recorded payment, in the invoice's language. */
export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await fetch(`${API}/api/public/receipts/${token}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const r = (await res.json()) as Receipt;
  const L = r.lang === "id" ? "id" : "en";
  const s = RECEIPT[L];
  const date = new Date(r.paid_on).toLocaleDateString(s.locale, { day: "numeric", month: "long", year: "numeric" });
  const row = (k: string, v: React.ReactNode, strong = false) => (
    <div className="grid grid-cols-[1fr_auto] gap-4 py-2.5 border-t border-line"><dt className="text-mute">{k}</dt><dd className={strong ? "font-medium text-right" : "text-right"}>{v}</dd></div>
  );
  return (
    <main lang={L} className="px-4 py-8 sm:py-14">
      <div className="max-w-[640px] mx-auto flex items-center justify-between pb-5 print:hidden">
        <span className="t-mono text-mute">{r.receipt_no}</span><PrintButton label={s.print} />
      </div>
      <article className="invoice-doc bg-white text-ink w-full max-w-[640px] mx-auto px-8 py-10 sm:px-12 sm:py-12 border border-line">
        <header className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1"><Logo size={30} label={r.business.name} className="mb-1" />{r.business.tagline && <span className="t-mono text-mute">{r.business.tagline}</span>}</div>
          <span className="font-serif text-[28px] leading-none">{s.title}</span>
        </header>
        <div className="mt-10 flex flex-col gap-1">
          <span className="t-mono text-mute">{s.amount}</span>
          <span className="font-serif text-[40px] leading-tight tabular-nums">{money(r.amount, r.currency)}</span>
          {r.balance_after === 0 && <span className="t-small text-[#5f7a4a] font-medium">{s.settled}</span>}
        </div>
        <dl className="mt-8 t-small tabular-nums">
          {row(s.no, <span className="font-mono">{r.receipt_no}</span>)}
          {row(s.received, <>{r.client_name}{r.event_label && <span className="block text-mute">{r.event_label}</span>}</>)}
          {row(s.forInv, <a href={r.invoice_url} className="link font-mono">{r.invoice_number}</a>)}
          {row(s.date, date)}
          {row(s.method, s.methods[r.method] ?? r.method)}
          {row(s.total, money(r.invoice_total, r.currency))}
          {row(s.paidSoFar, money(r.paid_so_far, r.currency))}
          {row(s.balance, money(r.balance_after, r.currency), true)}
        </dl>
        <footer className="mt-10 pt-6 border-t border-line t-small text-mute flex flex-col gap-1">
          <span>{s.thanks(r.business.name)}</span>
          <span className="flex flex-wrap gap-x-5">{[r.business.address, r.business.email, r.business.phone].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</span>
        </footer>
      </article>
    </main>
  );
}
