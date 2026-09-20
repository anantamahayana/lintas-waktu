"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Invoice, type InvoiceBusiness } from "@/lib/admin-api";
import { Btn, LoadError, PageHeader, Pill, SkeletonForm, confirm, fmtDate, toast } from "@/components/admin/ui";
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
    try { const r = await api.post<Invoice>(`/api/admin/invoices/${inv.id}/status`, { status }); setInv(r); toast(`Marked ${status}`); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  };
  const copyLink = () => { navigator.clipboard.writeText(inv.public_url); toast("Link copied"); };
  const wa = () => {
    const text = `Hi ${inv.client_name.split(" ")[0]}, here is your ${inv.kind === "quote" ? "quotation" : "invoice"} ${inv.number} from ${biz.name}:\n${inv.public_url}${inv.kind !== "quote" && t.balance > 0 ? `\n\nBalance due: ${money(t.balance, inv.currency)}${inv.due_at ? ` by ${fmtDate(inv.due_at)}` : ""}` : ""}\n\nThank you!`;
    window.open(`https://wa.me/${(inv.client_phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
  };
  const duplicate = async () => {
    try { const r = await api.post<Invoice>(`/api/admin/invoices/${inv.id}/duplicate`); toast(`${r.number} created`); router.push(`/admin/invoices/${r.id}`); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  };

  const pill = inv.status === "paid" ? <Pill tone="ok">Paid {fmtDate(inv.paid_at)}</Pill> : inv.status === "void" ? <Pill tone="mute">Void</Pill> : inv.status === "sent" ? <Pill tone="warn">Sent {fmtDate(inv.sent_at)} · balance {money(t.balance, inv.currency)}</Pill> : <Pill tone="mute">Draft · not visible to the client yet</Pill>;

  return (
    <>
      <PageHeader
        eyebrow={<><Link href="/admin/invoices" className="link">Invoices</Link> · {inv.kind === "quote" ? "quotation" : "invoice"}</> as unknown as string}
        title={inv.number}
        actions={
          <>
            {inv.status === "draft" && <Btn kind="ink" onClick={() => setStatus("sent", { title: `Send ${inv.number}?`, body: "The client link becomes active. You can still edit the document afterwards; the client always sees the latest version.", action: "Mark as sent" })}>Mark as sent</Btn>}
            {inv.status !== "draft" && inv.status !== "void" && <Btn onClick={copyLink}>Copy client link</Btn>}
            {inv.status !== "draft" && inv.status !== "void" && <Btn onClick={wa}>Send via WhatsApp</Btn>}
            <a className="action !py-2.5 !px-4" href={`/admin/invoices/${inv.id}/print`} target="_blank" rel="noreferrer">Print / PDF</a>
            {inv.status === "sent" && <Btn kind="ink" onClick={() => setStatus("paid", { title: `Mark ${inv.number} as paid?`, body: `${money(t.total, inv.currency)} in full. The document gets a Paid stamp and can’t be edited any more.`, action: "Mark paid" })}>Mark paid</Btn>}
            {inv.status !== "void" && inv.status !== "draft" && <Btn kind="danger" onClick={() => setStatus("void", { title: `Void ${inv.number}?`, body: "The link stays open but the document is stamped Void. Use this instead of deleting a sent or paid invoice.", action: "Void", danger: true })}>Void</Btn>}
            <Btn onClick={duplicate}>Duplicate</Btn>
          </>
        }
      />
      <div className="mb-6">{pill}</div>
      <InvoiceForm key={inv.updated_at} invoice={inv} business={biz} />
    </>
  );
}
