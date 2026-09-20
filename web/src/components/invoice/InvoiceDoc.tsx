import clsx from "clsx";
import { QR } from "./QR";
import { STR, type Lang } from "./strings";

/**
 * The invoice as a document: A4-ish sheet in the site's editorial voice.
 * Used by the admin preview, the client link (/i/<token>) and print/PDF
 * (browser "Save as PDF") — one component, so they never drift apart.
 */
export type Item = { description: string; qty: number; unit_price: number };
export type Totals = { subtotal: number; discount: number; taxable: number; tax: number; total: number; deposit_paid: number; balance: number };
export type Business = { name: string; tagline?: string; address?: string; email?: string; phone?: string; bank_details?: string };
export type Doc = {
  number: string; status: "draft" | "sent" | "paid" | "void"; kind: string; client_name: string; client_email?: string | null; client_phone?: string | null;
  client_address?: string | null; event_label?: string | null; issued_at: string; due_at?: string | null; currency: string; lang?: string; items: Item[];
  discount: number; tax_percent: number; deposit_paid: number; notes?: string | null; paid_at?: string | null; totals: Totals;
  /** printed on the document; anyone can check it at verify_url */
  verify_code?: string; verify_url?: string;
};

export function money(n: number, currency: string) {
  return currency === "USD"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
    : `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
}
export function InvoiceDoc({ doc, business, className }: { doc: Doc; business: Business; className?: string }) {
  const t = doc.totals;
  const L: Lang = doc.lang === "id" ? "id" : "en";
  const s = STR[L];
  const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(s.locale, { day: "numeric", month: "long", year: "numeric" }) : "—");
  const title = doc.kind === "quote" ? s.quotation : s.invoice;
  const stamp = doc.status === "paid" ? s.stampPaid : doc.status === "void" ? s.stampVoid : doc.kind === "quote" ? null : t.balance > 0 && t.deposit_paid > 0 ? s.stampBalance : null;

  return (
    <article className={clsx("invoice-doc relative bg-white text-ink w-full max-w-[820px] mx-auto px-8 py-10 sm:px-14 sm:py-16 border border-line", className)}>
      {stamp && (
        <span className={clsx("absolute right-8 top-8 sm:right-14 sm:top-14 t-mono px-3 py-1.5 border", doc.status === "paid" ? "border-[#5f7a4a] text-[#5f7a4a]" : doc.status === "void" ? "border-error text-error" : "border-line text-mute")}>
          {stamp}
        </span>
      )}

      {/* Letterhead */}
      <header className="flex flex-col gap-1">
        <span className="font-serif italic text-[28px] leading-none">{business.name}</span>
        {business.tagline && <span className="t-mono text-mute">{business.tagline}</span>}
      </header>

      <div className="mt-12 grid sm:grid-cols-[1fr_auto] gap-8 items-end">
        <div className="flex flex-col gap-1">
          <span className="t-mono text-mute">{title} {s.for}</span>
          <span className="font-serif text-[26px] leading-tight">{doc.client_name}</span>
          {doc.event_label && <span className="t-small text-mute">{doc.event_label}</span>}
          {(doc.client_address || doc.client_email || doc.client_phone) && (
            <span className="t-small text-mute whitespace-pre-line mt-2">{[doc.client_address, doc.client_email, doc.client_phone].filter(Boolean).join("\n")}</span>
          )}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1.5 t-small sm:text-right">
          <dt className="t-mono text-faint">{title} {s.no}</dt><dd className="font-mono">{doc.number}</dd>
          <dt className="t-mono text-faint">{s.issued}</dt><dd>{fmtDate(doc.issued_at)}</dd>
          {doc.due_at && doc.kind !== "quote" && <><dt className="t-mono text-faint">{s.due}</dt><dd>{fmtDate(doc.due_at)}</dd></>}
          {doc.due_at && doc.kind === "quote" && <><dt className="t-mono text-faint">{s.validUntil}</dt><dd>{fmtDate(doc.due_at)}</dd></>}
          {doc.paid_at && <><dt className="t-mono text-faint">{s.paidOn}</dt><dd>{fmtDate(doc.paid_at)}</dd></>}
        </dl>
      </div>

      {/* Lines */}
      <table className="mt-12 w-full border-t border-ink">
        <thead>
          <tr className="t-mono text-faint text-left">
            <th className="py-3 font-normal">{s.description}</th>
            <th className="py-3 font-normal text-right w-14 hidden sm:table-cell">{s.qty}</th>
            <th className="py-3 font-normal text-right w-36 hidden sm:table-cell">{s.unit}</th>
            <th className="py-3 font-normal text-right w-32 sm:w-40">{s.amount}</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={i} className="border-t border-line align-top">
              <td className="py-3.5 pr-4 text-[14px]">
                {it.description}
                {/* phones: qty × unit under the description instead of two extra columns */}
                <span className="block sm:hidden t-small text-mute tabular-nums">{it.qty} × {money(it.unit_price, doc.currency)}</span>
              </td>
              <td className="py-3.5 text-right t-small tabular-nums hidden sm:table-cell">{it.qty}</td>
              <td className="py-3.5 text-right t-small tabular-nums whitespace-nowrap hidden sm:table-cell">{money(it.unit_price, doc.currency)}</td>
              <td className="py-3.5 text-right text-[14px] tabular-nums whitespace-nowrap">{money(it.qty * it.unit_price, doc.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-full sm:w-[340px] grid grid-cols-[1fr_auto] gap-y-2 t-small tabular-nums">
          {(t.discount > 0 || t.tax > 0) && <><dt className="text-mute">{s.subtotal}</dt><dd className="text-right">{money(t.subtotal, doc.currency)}</dd></>}
          {t.discount > 0 && <><dt className="text-mute">{s.discount}</dt><dd className="text-right">− {money(t.discount, doc.currency)}</dd></>}
          {t.tax > 0 && <><dt className="text-mute">{s.tax} {doc.tax_percent}%</dt><dd className="text-right">{money(t.tax, doc.currency)}</dd></>}
          <dt className="border-t border-ink pt-3 font-serif text-[20px]">{s.total}</dt><dd className="border-t border-ink pt-3 text-right font-serif text-[20px]">{money(t.total, doc.currency)}</dd>
          {t.deposit_paid > 0 && doc.status !== "paid" && (
            <>
              <dt className="text-mute">{s.received}</dt><dd className="text-right">− {money(t.deposit_paid, doc.currency)}</dd>
              <dt className="font-medium">{s.balanceDue}</dt><dd className="text-right font-medium">{money(t.balance, doc.currency)}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Payment + notes */}
      <footer className="mt-14 grid sm:grid-cols-2 gap-8 t-small text-mute">
        {business.bank_details && doc.kind !== "quote" && doc.status !== "paid" && (
          <div className="flex flex-col gap-1.5">
            <span className="t-mono text-faint">{s.payment}</span>
            <span className="whitespace-pre-line text-ink">{business.bank_details}</span>
          </div>
        )}
        {doc.notes && (
          <div className="flex flex-col gap-1.5">
            <span className="t-mono text-faint">{doc.kind === "quote" ? s.terms : s.notes}</span>
            <span className="whitespace-pre-line">{doc.notes}</span>
          </div>
        )}
        {/* Authenticity: the QR / code resolve to our server, which knows the official amount, status and bank account */}
        {doc.verify_url && doc.verify_code && (
          <div className="sm:col-span-2 pt-6 border-t border-line grid grid-cols-[auto_1fr] gap-4 items-center">
            <QR value={doc.verify_url} size={72} className="shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="t-mono text-faint">{s.verification}</span>
              <span className="text-ink">
                {s.code} <span className="font-mono tracking-[0.12em]">{doc.verify_code}</span> · {s.verifyHint} <span className="break-all">{doc.verify_url.replace(/^https?:\/\//, "").split("?")[0]}</span>
              </span>
              <span>{s.verifyBody}</span>
            </div>
          </div>
        )}
        <div className="sm:col-span-2 pt-6 border-t border-line flex flex-wrap gap-x-6 gap-y-1">
          {business.address && <span>{business.address}</span>}
          {business.email && <span>{business.email}</span>}
          {business.phone && <span>{business.phone}</span>}
        </div>
      </footer>
    </article>
  );
}
