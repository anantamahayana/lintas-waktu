import { notFound } from "next/navigation";
import { InvoiceDoc, type Business, type Doc } from "@/components/invoice/InvoiceDoc";
import { PrintButton } from "@/components/invoice/PrintButton";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** /i/<token> — what the client opens from WhatsApp/email. Read-only; Print → Save as PDF. */
export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await fetch(`${API}/api/public/invoices/${token}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const doc = (await res.json()) as Doc & { business: Business };

  return (
    <main className="px-4 py-8 sm:py-14">
      <div className="max-w-[820px] mx-auto flex items-center justify-between pb-5 print:hidden">
        <span className="t-mono text-mute whitespace-nowrap">{doc.number}</span>
        <PrintButton />
      </div>
      <InvoiceDoc doc={doc} business={doc.business} />
      <p className="max-w-[820px] mx-auto pt-6 t-small text-faint text-center print:hidden">Questions about this {doc.kind === "quote" ? "quotation" : "invoice"}? Reply to the message you received it in.</p>
    </main>
  );
}
