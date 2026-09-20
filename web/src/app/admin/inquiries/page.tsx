"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api, type Inquiry, type InquiryStatus } from "@/lib/admin-api";
import { Btn, Card, Field, PageHeader, Pill, Stat, Textarea, confirm, fmtDate, toast } from "@/components/admin/ui";

const STATUSES: InquiryStatus[] = ["new", "replied", "booked", "closed"];
const TONE: Record<InquiryStatus, "new" | "warn" | "ok" | "mute"> = { new: "new", replied: "warn", booked: "ok", closed: "mute" };
const KIND: Record<string, string> = { wedding: "Wedding", prewedding: "Pre-wedding", event: "Event", personal: "Personal", other: "Not sure yet" };
const BUDGET: Record<string, string> = { b1: "< IDR 5M / USD 300", b2: "IDR 5–15M / USD 300–950", b3: "IDR 15–30M / USD 950–1.9k", b4: "> IDR 30M / USD 1.9k", b5: "Let’s talk" };

export default function InquiriesPage() {
  const [rows, setRows] = useState<Inquiry[] | null>(null);
  const [filter, setFilter] = useState<InquiryStatus | "all">("all");
  const [sel, setSel] = useState<string | null>(null);
  const load = () => api.get<Inquiry[]>("/api/admin/inquiries").then(setRows).catch((e) => toast(e.message, true));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => (rows ?? []).filter((i) => filter === "all" || i.status === filter), [rows, filter]);
  const cur = rows?.find((i) => i.id === sel) ?? shown[0] ?? null;

  const counts = Object.fromEntries(STATUSES.map((s) => [s, (rows ?? []).filter((i) => i.status === s).length])) as Record<InquiryStatus, number>;

  async function setStatus(i: Inquiry, status: InquiryStatus) {
    try { await api.patch(`/api/admin/inquiries/${i.id}`, { status }); toast(`Marked ${status}`); load(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  }
  async function saveNote(i: Inquiry, note: string) {
    try { await api.patch(`/api/admin/inquiries/${i.id}`, { internal_note: note }); toast("Note saved"); load(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  }
  async function remove(i: Inquiry) {
    const ok = await confirm({ title: `Delete the message from ${i.name}?`, body: "The inquiry, its status and your note are removed for good. Export the CSV first if you want a record.", action: "Delete", danger: true });
    if (!ok) return;
    try { await api.del(`/api/admin/inquiries/${i.id}`); setSel(null); toast(`Message from ${i.name} deleted`); load(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  }

  const csv = () => {
    const head = ["created", "name", "partner", "email", "based", "kind", "date", "location", "budget", "status", "message"];
    const lines = (rows ?? []).map((i) => [i.created_at, i.name, i.partner, i.email, i.based, i.kind, i.date, i.location, i.budget, i.status, i.message].map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "inquiries.csv" });
    a.click();
  };

  const wa = (i: Inquiry) => `https://wa.me/?text=${encodeURIComponent(`Hi ${i.name.split(" ")[0]}, thank you for your message about a ${KIND[i.kind] ?? i.kind}${i.date ? ` in ${i.date}` : ""} — Lintas Waktu here.`)}`;

  return (
    <>
      <PageHeader eyebrow="Website" title="Inquiries" actions={<Btn onClick={csv}>Export CSV</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {STATUSES.map((s) => <Stat key={s} n={counts[s]} label={s[0].toUpperCase() + s.slice(1)} active={filter === s} onClick={() => setFilter(filter === s ? "all" : s)} />)}
      </div>

      {rows === null ? <p className="t-small text-mute">Loading…</p> : rows.length === 0 ? (
        <div className="border border-line p-10 text-center"><p className="font-serif text-[22px]">No inquiries yet.</p><p className="t-small text-mute mt-2">Messages from the contact form will appear here.</p></div>
      ) : (
        <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start">
          <ul className="flex flex-col border-t border-line">
            {shown.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => setSel(i.id)} className={clsx("w-full text-left px-3 py-3 border-b border-line flex items-start justify-between gap-3 transition-colors", cur?.id === i.id ? "bg-[#f6f5f1]" : "hover:bg-[#f6f5f1]")}>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[14px] font-medium truncate">{i.name}{i.partner ? ` & ${i.partner}` : ""}</span>
                    <span className="t-small text-mute truncate">{KIND[i.kind] ?? i.kind}{i.date ? ` · ${i.date}` : ""}{i.based ? ` · ${i.based}` : ""}</span>
                  </span>
                  <span className="shrink-0 flex flex-col items-end gap-1"><Pill tone={TONE[i.status]}>{i.status}</Pill><span className="t-small text-faint">{fmtDate(i.created_at)}</span></span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="p-6 t-small text-faint">Nothing in this view.</li>}
          </ul>

          {cur && (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="font-serif text-[26px] leading-none">{cur.name}{cur.partner ? ` & ${cur.partner}` : ""}</h2>
                  <span className="t-small text-mute"><a className="link" href={`mailto:${cur.email}`}>{cur.email}</a> · via contact form ({cur.locale.toUpperCase()}) · {fmtDate(cur.created_at, true)}</span>
                </div>
                <div className="flex gap-2">
                  <a className="t-mono inline-flex items-center px-4 py-2.5 border border-line hover:border-ink" href={`mailto:${cur.email}?subject=${encodeURIComponent("Re: your inquiry — Lintas Waktu")}`}>Reply by email</a>
                  <a className="ink-btn !py-2.5 !px-4" href={wa(cur)} target="_blank" rel="noreferrer">Open WhatsApp</a>
                </div>
              </div>
              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                {[["Kind", KIND[cur.kind] ?? cur.kind], ["Date", cur.date], ["Location", cur.location], ["Based in", cur.based], ["Budget", cur.budget ? BUDGET[cur.budget] ?? cur.budget : null]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={String(k)} className="flex flex-col gap-0.5"><dt className="t-mono text-faint">{k}</dt><dd className="t-small">{v}</dd></div>
                ))}
              </dl>
              <div className="bg-[#f6f5f1] p-4 flex flex-col gap-2"><span className="t-mono text-mute">Message</span><p className="t-small whitespace-pre-wrap">{cur.message}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="t-mono text-mute mr-2">Status</span>
                {STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(cur, s)} className={clsx("t-mono px-3 py-1.5 border transition-colors", cur.status === s ? "bg-ink text-white border-ink" : "border-line hover:border-ink")}>{s}</button>
                ))}
              </div>
              <NoteEditor key={cur.id} initial={cur.internal_note ?? ""} onSave={(n) => saveNote(cur, n)} onDelete={() => remove(cur)} />
            </Card>
          )}
        </div>
      )}
    </>
  );
}

/** Keyed by inquiry id so the draft resets when another inquiry is selected. */
function NoteEditor({ initial, onSave, onDelete }: { initial: string; onSave: (n: string) => void; onDelete: () => void }) {
  const [note, setNote] = useState(initial);
  return (
    <>
      <Field label="Internal note"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Replied 18 Sep — waiting on date. Follow up 25 Sep." /></Field>
      <div className="flex justify-between">
        <Btn kind="ink" onClick={() => onSave(note)}>Save note</Btn>
        <Btn kind="danger" onClick={onDelete}>Delete</Btn>
      </div>
    </>
  );
}
