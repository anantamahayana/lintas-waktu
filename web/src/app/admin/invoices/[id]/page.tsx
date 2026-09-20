"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Invoice, type InvoiceBusiness } from "@/lib/admin-api";
import { Card } from "@/components/admin/ui";
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
            <Link href={`/admin/calendar?invoice=${inv.id}`} className="action !py-2.5 !px-4">Add to calendar</Link>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        {pill}
        {inv.status !== "draft" && (
          <span className="t-small text-mute flex items-center gap-2">
            Verification code <span className="font-mono text-ink tracking-[0.12em]">{inv.verify_code}</span>
            <a href={inv.verify_url} target="_blank" rel="noreferrer" className="link">check ↗</a>
            {inv.sent_hash && inv.sent_hash !== inv.current_hash && <span className="text-error">· edited after sending — the client’s copy is out of date; the link shows the new version, resend it</span>}
          </span>
        )}
      </div>
      <InvoiceForm key={inv.updated_at} invoice={inv} business={biz} />
      <div className="mt-6 max-w-[560px]"><History id={inv.id} stamp={inv.updated_at} /></div>
    </>
  );
}

type Ev = { at: string; action: string; detail: { fields?: string[]; hash?: string; total?: number; from?: string; after_sent?: boolean } };
const LABEL: Record<string, string> = { created: "Created", updated: "Edited", sent: "Marked as sent", paid: "Marked paid", void: "Voided", draft: "Back to draft", duplicated: "Duplicated" };

/** Audit trail — who did what to this document, and when. */
function History({ id, stamp }: { id: string; stamp: string }) {
  const [rows, setRows] = useState<Ev[] | null>(null);
  useEffect(() => { api.get<Ev[]>(`/api/admin/invoices/${id}/events`).then(setRows).catch(() => setRows([])); }, [id, stamp]);
  if (!rows || rows.length === 0) return null;
  return (
    <Card title="History">
      <ol className="flex flex-col gap-2 t-small">
        {rows.map((e, i) => (
          <li key={i} className="grid grid-cols-[150px_1fr] gap-3">
            <span className="text-mute tabular-nums">{fmtDate(e.at, true)}</span>
            <span>
              {LABEL[e.action] ?? e.action}
              {e.detail.fields && <span className="text-mute"> · {e.detail.fields.join(", ")}{e.detail.after_sent && <span className="text-error"> (after sending)</span>}</span>}
              {e.detail.from && <span className="text-mute"> · from {e.detail.from}</span>}
              {e.detail.hash && <span className="text-faint font-mono"> · {e.detail.hash.slice(0, 8)}</span>}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
