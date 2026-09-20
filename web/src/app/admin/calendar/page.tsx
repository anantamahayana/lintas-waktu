"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ApiError, api, type Booking, type BookingStatus, type Invoice } from "@/lib/admin-api";
import { Btn, Field, Input, LoadError, PageHeader, Select, Textarea, confirm, focusFirstInvalid, toast, useUnsavedChanges, type FieldErrors } from "@/components/admin/ui";

/* ------------------------------------------------------------------ date helpers (local, no TZ surprises) */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const long = (s: string) => parse(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const STATUS: Record<BookingStatus, { label: string; chip: string; dot: string }> = {
  tentative: { label: "Tentative", chip: "border border-dashed border-ink/50 text-ink bg-white", dot: "bg-white border border-ink" },
  booked: { label: "Booked", chip: "bg-ink text-white", dot: "bg-ink" },
  blocked: { label: "Blocked", chip: "bg-line text-mute", dot: "bg-faint" },
  done: { label: "Done", chip: "bg-[#5f7a4a] text-white", dot: "bg-[#5f7a4a]" },
  cancelled: { label: "Cancelled", chip: "line-through text-faint border border-line", dot: "bg-white border border-line" },
};
const KINDS = [["wedding", "Wedding"], ["prewedding", "Pre-wedding"], ["event", "Event"], ["personal", "Personal"], ["block", "Block (personal / travel)"]] as const;

export default function CalendarPage() {
  const today = iso(new Date());
  const [ym, setYm] = useState(() => today.slice(0, 7));
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Booking | { start_date: string; invoice_id?: string } | null>(null);
  // /admin/calendar?invoice=<id> (from an invoice page): open the sheet pre-linked to it
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("invoice");
    if (!id) return;
    const t = setTimeout(() => setEditing({ start_date: today, invoice_id: id }), 0);
    return () => clearTimeout(t);
  }, [today]);

  const load = useCallback(() => {
    const first = `${ym}-01`;
    const from = addDays(first, -7), to = addDays(first, 45);
    api.get<Booking[]>(`/api/admin/bookings?from=${from}&to=${to}`).then((x) => { setRows(x); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [ym]);
  useEffect(() => { load(); }, [load]);

  // month grid: Monday-first, 6 rows
  const days = useMemo(() => {
    const [y, m] = ym.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(y, m - 1, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return iso(d); });
  }, [ym]);
  const byDay = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of rows ?? []) for (let d = b.start_date; d <= b.end_date; d = addDays(d, 1)) (map[d] ??= []).push(b);
    return map;
  }, [rows]);
  const shift = (n: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); setYm(iso(d).slice(0, 7)); };
  const upcoming = (rows ?? []).filter((b) => b.end_date >= today && b.status !== "cancelled").sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Calendar"
        actions={
          <>
            <div className="flex items-center gap-1">
              <Btn onClick={() => shift(-1)} aria-label="Previous month">←</Btn>
              <button type="button" onClick={() => setYm(today.slice(0, 7))} className="t-mono px-3 min-w-[150px] text-center">{MONTHS[Number(ym.slice(5)) - 1]} {ym.slice(0, 4)}</button>
              <Btn onClick={() => shift(1)} aria-label="Next month">→</Btn>
            </div>
            <Btn kind="ink" onClick={() => setEditing({ start_date: today })}>+ Add booking</Btn>
          </>
        }
      />

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5 t-small text-mute">
        {(Object.keys(STATUS) as BookingStatus[]).map((s) => <span key={s} className="inline-flex items-center gap-2"><span className={clsx("h-2.5 w-2.5 rounded-full", STATUS[s].dot)} />{STATUS[s].label}</span>)}
      </div>

      {err ? <LoadError error={err} retry={() => { setErr(null); load(); }} /> : (
        <div className="border border-line bg-white">
          <div className="grid grid-cols-7 border-b border-line">{DOW.map((d) => <span key={d} className="t-mono text-faint px-2 py-2">{d}</span>)}</div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const inMonth = d.slice(0, 7) === ym;
              const list = byDay[d] ?? [];
              const taken = list.some((b) => b.status === "booked" || b.status === "blocked" || b.status === "done");
              return (
                <div key={d} className={clsx("min-h-[96px] lg:min-h-[112px] border-line p-1.5 flex flex-col gap-1 relative group", i % 7 !== 6 && "border-r", i < 35 && "border-b", !inMonth && "bg-[#f6f5f1] text-faint", taken && inMonth && "bg-[#fbfaf7]")}>
                  <button type="button" onClick={() => setEditing({ start_date: d })} className="flex items-center justify-between" aria-label={`Add booking on ${long(d)}`}>
                    <span className={clsx("t-small tabular-nums h-6 w-6 flex items-center justify-center rounded-full", d === today && "bg-ink text-white")}>{Number(d.slice(8))}</span>
                    <span className="t-mono text-faint opacity-0 group-hover:opacity-100 transition-opacity">+</span>
                  </button>
                  {list.slice(0, 3).map((b) => (
                    <button key={b.id} type="button" onClick={() => setEditing(b)} title={`${b.title}${b.location ? ` · ${b.location}` : ""}`} className={clsx("text-left t-small !text-[11px] leading-tight px-1.5 py-0.5 truncate", STATUS[b.status].chip, rows === null && "invisible")}>
                      {b.start_time && d === b.start_date ? `${b.start_time} ` : ""}{b.title}
                    </button>
                  ))}
                  {list.length > 3 && <span className="t-small !text-[11px] text-faint px-1.5">+{list.length - 3} more</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-8">
          <h2 className="t-mono text-mute mb-3">Coming up</h2>
          <ul className="border-t border-line">
            {upcoming.map((b) => (
              <li key={b.id} className="border-b border-line py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="t-small tabular-nums text-mute w-[150px]">{long(b.start_date)}{b.end_date !== b.start_date && ` → ${long(b.end_date).slice(0, 6)}`}</span>
                <button type="button" onClick={() => setEditing(b)} className="link text-[14px]">{b.title}</button>
                <span className="t-small text-mute">{b.location}</span>
                <span className={clsx("t-mono !text-[9px] px-1.5 py-0.5", STATUS[b.status].chip)}>{STATUS[b.status].label}</span>
                {b.conflicts.length > 0 && <span className="t-small text-error">overlaps {b.conflicts.join(", ")}</span>}
                {b.invoice_number && <Link href={`/admin/invoices/${b.invoice_id}`} className="link t-small">{b.invoice_number}</Link>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && <BookingSheet initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

/* ------------------------------------------------------------------ side sheet: create / edit one booking */
type Values = { title: string; kind: string; status: BookingStatus; start_date: string; end_date: string; start_time: string; location: string; client_name: string; client_wa: string; notes: string; invoice_id: string; public: boolean };

function BookingSheet({ initial, onClose, onSaved }: { initial: Booking | { start_date: string; invoice_id?: string }; onClose: () => void; onSaved: () => void }) {
  const existing = "id" in initial ? initial : null;
  const init: Values = existing
    ? { title: existing.title, kind: existing.kind, status: existing.status, start_date: existing.start_date, end_date: existing.end_date, start_time: existing.start_time ?? "", location: existing.location ?? "", client_name: existing.client_name ?? "", client_wa: existing.client_wa ?? "", notes: existing.notes ?? "", invoice_id: existing.invoice_id ?? "", public: existing.public }
    : { title: "", kind: "wedding", status: "tentative", start_date: initial.start_date, end_date: initial.start_date, start_time: "", location: "", client_name: "", client_wa: "", notes: "", invoice_id: initial.invoice_id ?? "", public: true };
  const [v, setV] = useState<Values>(init);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const dirty = JSON.stringify(v) !== JSON.stringify(init);
  useUnsavedChanges(dirty);
  useEffect(() => {
    api.get<Invoice[]>("/api/admin/invoices").then((l) => {
      const list = l.filter((i) => i.status !== "void");
      setInvoices(list);
      // arrived pre-linked from an invoice page: fill title/client from it
      const i = init.invoice_id ? list.find((x) => x.id === init.invoice_id) : null;
      if (i) setV((s) => ({ ...s, title: s.title || i.event_label || i.client_name, client_name: s.client_name || i.client_name, client_wa: s.client_wa || i.client_phone || "" }));
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Values>(k: K) => (e: { target: { value: string } }) => { setV((s) => ({ ...s, [k]: e.target.value })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined })); };
  const isBlock = v.kind === "block";
  const pickInvoice = (id: string) => {
    const i = invoices.find((x) => x.id === id);
    setV((s) => ({ ...s, invoice_id: id, title: s.title || i?.event_label || i?.client_name || "", client_name: s.client_name || i?.client_name || "", client_wa: s.client_wa || i?.client_phone || "" }));
  };

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!v.title.trim()) e.title = isBlock ? "Say what the block is for (e.g. Holiday, Editing week)." : "Give it a name — usually the couple or the event.";
    if (!v.start_date) e.start_date = "Pick a date.";
    if (v.end_date && v.end_date < v.start_date) e.end_date = "Ends before it starts.";
    if (v.start_time && !/^\d{2}:\d{2}$/.test(v.start_time)) e.start_time = "Use HH:MM.";
    return e;
  }

  async function save() {
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) { focusFirstInvalid(); return; }
    setBusy(true);
    try {
      const body = { ...v, status: isBlock && v.status === "tentative" ? "blocked" : v.status, end_date: v.end_date || v.start_date, start_time: v.start_time || null, location: v.location || null, client_name: v.client_name || null, client_wa: v.client_wa || null, notes: v.notes || null, invoice_id: v.invoice_id || null };
      const r = existing ? await api.patch<Booking>(`/api/admin/bookings/${existing.id}`, body) : await api.post<Booking>("/api/admin/bookings", body);
      toast(existing ? "Saved" : "Added to the calendar");
      if (r.conflicts.length) toast(`Heads up: overlaps ${r.conflicts.join(", ")}`, true);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) { setErrors(err.fields); focusFirstInvalid(); }
      toast(err instanceof Error ? err.message : "Could not save", true);
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!existing) return;
    if (!(await confirm({ title: `Remove “${existing.title}” from the calendar?`, body: "Prefer marking it Cancelled if the client backed out — that keeps the record. Delete only mistakes.", action: "Delete", danger: true }))) return;
    try { await api.del(`/api/admin/bookings/${existing.id}`); toast("Removed"); onSaved(); } catch (err) { toast(err instanceof Error ? err.message : "Failed", true); }
  }
  const close = async () => { if (!dirty || (await confirm({ title: "Discard changes?", action: "Discard", danger: true, cancel: "Keep editing" }))) onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 admin-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <aside role="dialog" aria-modal="true" aria-label={existing ? "Edit booking" : "New booking"} className="admin-pop w-full max-w-[460px] h-full overflow-y-auto bg-white border-l border-line p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="t-mono text-mute">{existing ? "Booking" : "New booking"}</span>
            <span className="font-serif text-[26px] leading-tight">{v.title || long(v.start_date)}</span>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="text-mute hover:text-ink text-[18px]">✕</button>
        </div>
        {existing && existing.conflicts.length > 0 && <p className="t-small text-error border border-error/40 p-3">Overlaps: {existing.conflicts.join(", ")}</p>}

        <Field label="Kind">
          <Select value={v.kind} onChange={set("kind")}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        </Field>
        <Field label={isBlock ? "What for" : "Title"} error={errors.title}><Input invalid={!!errors.title} value={v.title} onChange={set("title")} placeholder={isBlock ? "Holiday · Editing week" : "Ayu & Marco"} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" error={errors.start_date}><Input invalid={!!errors.start_date} type="date" value={v.start_date} onChange={(e) => setV((s) => ({ ...s, start_date: e.target.value, end_date: s.end_date < e.target.value ? e.target.value : s.end_date }))} /></Field>
          <Field label="To" hint="same day if blank" error={errors.end_date}><Input invalid={!!errors.end_date} type="date" value={v.end_date} min={v.start_date} onChange={set("end_date")} /></Field>
        </div>
        {!isBlock && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select value={v.status} onChange={set("status")}>{(["tentative", "booked", "done", "cancelled"] as const).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}</Select>
              </Field>
              <Field label="Start time" hint="optional" error={errors.start_time}><Input invalid={!!errors.start_time} value={v.start_time} onChange={set("start_time")} placeholder="14:00" /></Field>
            </div>
            <Field label="Location" hint="optional"><Input value={v.location} onChange={set("location")} placeholder="Uluwatu" /></Field>
            <Field label="Invoice / quotation" hint="optional — money on it confirms the booking">
              <Select value={v.invoice_id} onChange={(e) => pickInvoice(e.target.value)}>
                <option value="">—</option>
                {invoices.map((i) => <option key={i.id} value={i.id}>{i.number} · {i.client_name}{i.event_label ? ` · ${i.event_label}` : ""}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client" hint="optional"><Input value={v.client_name} onChange={set("client_name")} /></Field>
              <Field label="WhatsApp" hint="optional"><Input value={v.client_wa} onChange={set("client_wa")} placeholder="+62 812…" /></Field>
            </div>
          </>
        )}
        <Field label="Notes" hint="optional"><Textarea value={v.notes} onChange={set("notes")} rows={3} /></Field>
        <div className="mt-auto pt-4 flex flex-wrap gap-2">
          <Btn kind="ink" type="button" onClick={save} disabled={busy || (!!existing && !dirty)}>{busy ? "Saving…" : existing ? (dirty ? "Save changes" : "Saved") : "Add to calendar"}</Btn>
          <Btn type="button" onClick={close}>Close</Btn>
          {existing && <Btn type="button" kind="danger" className="ml-auto" onClick={remove}>Delete</Btn>}
        </div>
      </aside>
    </div>
  );
}
