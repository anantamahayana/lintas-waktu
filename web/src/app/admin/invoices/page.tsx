"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type Invoice, type InvoiceStatus } from "@/lib/admin-api";
import { Empty, Input, LoadError, PageHeader, Pill, SkeletonRows, Stat, fmtDate } from "@/components/admin/ui";
import { money } from "@/components/invoice/InvoiceDoc";

type Filter = "all" | InvoiceStatus | "overdue";

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const load = () => { api.get<Invoice[]>("/api/admin/invoices").then((x) => { setRows(x); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed")); };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const is = useMemo(() => ({
    draft: (i: Invoice) => i.status === "draft",
    sent: (i: Invoice) => i.status === "sent",
    paid: (i: Invoice) => i.status === "paid",
    void: (i: Invoice) => i.status === "void",
    overdue: (i: Invoice) => i.status === "sent" && i.kind === "invoice" && !!i.due_at && i.due_at < today,
  }), [today]);
  const all = rows ?? [];
  const counts = { draft: all.filter(is.draft).length, sent: all.filter(is.sent).length, overdue: all.filter(is.overdue).length, paid: all.filter(is.paid).length };
  const outstanding = all.filter(is.sent).reduce((acc, i) => { acc[i.currency] = (acc[i.currency] ?? 0) + i.totals.balance; return acc; }, {} as Record<string, number>);

  const shown = useMemo(() => {
    let list = all;
    if (filter !== "all") list = list.filter(is[filter]);
    if (q.trim()) list = list.filter((i) => `${i.client_name} ${i.number} ${i.event_label ?? ""}`.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [all, filter, q, is]);

  const pill = (i: Invoice) => {
    if (i.status === "paid") return <Pill tone="ok">Paid</Pill>;
    if (i.status === "void") return <Pill tone="mute">Void</Pill>;
    if (is.overdue(i)) return <Pill tone="new">Overdue</Pill>;
    if (i.status === "sent") return <Pill tone="warn">{i.kind === "quote" ? "Quote sent" : "Sent"}</Pill>;
    return <Pill tone="mute">Draft</Pill>;
  };

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Invoices"
        actions={
          <>
            <Input placeholder="Search client or number…" value={q} onChange={(e) => setQ(e.target.value)} className="!w-[240px]" />
            <Link href="/admin/invoices/new" className="ink-btn !py-2.5 !px-4">+ New invoice</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {([["sent", "Awaiting payment", counts.sent], ["overdue", "Overdue", counts.overdue], ["draft", "Drafts", counts.draft], ["paid", "Paid", counts.paid]] as const).map(([k, l, n]) => (
          <Stat key={k} n={n} label={l} active={filter === k} onClick={() => setFilter(filter === k ? "all" : k)} />
        ))}
      </div>
      {Object.keys(outstanding).length > 0 && (
        <p className="t-small text-mute mb-6">Outstanding: {Object.entries(outstanding).map(([c, n]) => money(n, c)).join(" · ")}</p>
      )}

      {err ? <LoadError error={err} retry={() => { setErr(null); load(); }} /> : rows === null ? <SkeletonRows n={5} /> : shown.length === 0 ? (
        all.length === 0
          ? <Empty title="No invoices yet." body="Write an invoice or a quotation in a minute: client, lines, deposit — then share a link the client can open and print. Business details and bank account live in Site settings." action={<Link href="/admin/invoices/new" className="ink-btn !py-2.5 !px-4">Write the first invoice</Link>} />
          : <Empty title="Nothing matches." body="Try another filter or search." />
      ) : (
        <table className="w-full border-t border-line">
          <thead>
            <tr className="t-mono text-faint text-left">
              <th className="py-3 pr-4 font-normal">Number</th>
              <th className="py-3 pr-4 font-normal">Client</th>
              <th className="py-3 pr-4 font-normal">Status</th>
              <th className="py-3 pr-4 font-normal text-right hidden md:table-cell">Total</th>
              <th className="py-3 pr-4 font-normal text-right hidden md:table-cell">Balance</th>
              <th className="py-3 font-normal hidden lg:table-cell">Due</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id} className="border-t border-line hover:bg-[#f6f5f1] transition-colors">
                <td className="py-3 pr-4 font-mono t-small"><Link href={`/admin/invoices/${i.id}`}>{i.number}{i.kind === "quote" && <span className="text-faint"> · Q</span>}</Link></td>
                <td className="py-3 pr-4"><Link href={`/admin/invoices/${i.id}`} className="flex flex-col gap-0.5"><span className="text-[14px] font-medium">{i.client_name}</span><span className="t-small text-mute">{i.event_label || fmtDate(i.issued_at)}</span></Link></td>
                <td className="py-3 pr-4">{pill(i)}</td>
                <td className="py-3 pr-4 t-small text-right tabular-nums hidden md:table-cell">{money(i.totals.total, i.currency)}</td>
                <td className="py-3 pr-4 t-small text-right tabular-nums hidden md:table-cell">{i.status === "paid" ? <span className="text-faint">—</span> : money(i.totals.balance, i.currency)}</td>
                <td className="py-3 t-small text-mute hidden lg:table-cell">{i.due_at ? fmtDate(i.due_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
