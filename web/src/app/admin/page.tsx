"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type SessionOut } from "@/lib/admin-api";
import { Btn, Input, PageHeader, Pill, Stat, daysLeft, fmtDate, Empty, LoadError, SkeletonRows } from "@/components/admin/ui";

type Filter = "all" | "new" | "choosing" | "unopened" | "completed" | "deadline";

export default function SessionsPage() {
  const [rows, setRows] = useState<SessionOut[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [err, setErr] = useState<string | null>(null);
  const load = () => { api.get<SessionOut[]>("/api/admin/sessions").then((x) => { setRows(x); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed")); };
  useEffect(() => { load(); }, []);

  const buckets = useMemo(() => {
    const all = rows ?? [];
    const is = {
      new: (s: SessionOut) => s.is_new,
      choosing: (s: SessionOut) => s.status === "pending" && !!s.first_opened_at,
      unopened: (s: SessionOut) => s.status === "pending" && !s.first_opened_at,
      completed: (s: SessionOut) => s.status === "completed",
      deadline: (s: SessionOut) => s.status === "pending" && daysLeft(s.expires_at) !== null && (daysLeft(s.expires_at) as number) <= 2,
    };
    return { is, counts: Object.fromEntries(Object.entries(is).map(([k, f]) => [k, all.filter(f).length])) as Record<keyof typeof is, number> };
  }, [rows]);

  const shown = useMemo(() => {
    let list = rows ?? [];
    if (filter !== "all") list = list.filter(buckets.is[filter]);
    if (q.trim()) list = list.filter((s) => s.client_name.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [rows, filter, q, buckets]);

  const statusOf = (s: SessionOut) => {
    if (s.status === "completed") return <Pill tone="ok">Completed</Pill>;
    const d = daysLeft(s.expires_at);
    if (d !== null && d <= 2) return <Pill tone="new">Deadline soon</Pill>;
    if (!s.first_opened_at) return <Pill tone="mute">Not opened</Pill>;
    return <Pill tone="warn">Choosing</Pill>;
  };

  return (
    <>
      <PageHeader
        eyebrow="Proofing"
        title="Sessions"
        actions={
          <>
            <Input placeholder="Search client…" value={q} onChange={(e) => setQ(e.target.value)} className="!w-[220px]" />
            <Link href="/admin/sessions/new" className="ink-btn !py-2.5 !px-4">+ New session</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {([["new", "Just sent · unread"], ["choosing", "Choosing"], ["unopened", "Not opened yet"], ["completed", "Completed"], ["deadline", "Deadline ≤ 2 days"]] as const).map(([k, l]) => (
          <Stat key={k} n={buckets.counts[k]} label={l} active={filter === k} onClick={() => setFilter(filter === k ? "all" : k)} />
        ))}
      </div>

      {err ? (
        <LoadError error={err} retry={() => { setErr(null); load(); }} />
      ) : rows === null ? (
        <SkeletonRows n={6} />
      ) : shown.length === 0 ? (
        filter !== "all"
          ? <Empty title={`No ${filter} sessions.`} body="Try another filter, or create a new session." action={<Btn onClick={() => setFilter("all")}>Show all</Btn>} />
          : <Empty title="No client galleries yet." body="A session turns a Google Drive folder into a private, PIN-protected gallery where a client picks their favourites." action={<Link href="/admin/sessions/new" className="ink-btn !py-2.5 !px-4">Create the first session</Link>} />
      ) : (
        <table className="w-full border-t border-line">
          <thead>
            <tr className="t-mono text-faint text-left">
              <th className="py-3 pr-4 font-normal w-[72px]"></th>
              <th className="py-3 pr-4 font-normal">Client</th>
              <th className="py-3 pr-4 font-normal">Status</th>
              <th className="py-3 pr-4 font-normal hidden md:table-cell">PIN</th>
              <th className="py-3 pr-4 font-normal hidden md:table-cell">Selection</th>
              <th className="py-3 pr-4 font-normal hidden lg:table-cell">Deadline</th>
              <th className="py-3 font-normal hidden lg:table-cell">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.id} className="border-t border-line hover:bg-[#f6f5f1] transition-colors">
                <td className="py-3 pr-4">
                  <Link href={`/admin/sessions/${s.id}`} className="block w-16 h-12 bg-line overflow-hidden">
                    {s.preview_urls[0] && <img src={api.img(s.preview_urls[0])} alt="" className="w-full h-full object-cover" />}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <Link href={`/admin/sessions/${s.id}`} className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-medium flex items-center gap-2">{s.client_name}{s.is_new && <span className="t-mono !text-[9px] bg-error text-white px-1.5 py-0.5">New</span>}</span>
                    <span className="t-small text-mute">{s.notes?.split("\n")[0] || `Created ${fmtDate(s.created_at)}`}</span>
                  </Link>
                </td>
                <td className="py-3 pr-4">{statusOf(s)}</td>
                <td className="py-3 pr-4 t-small hidden md:table-cell">{s.has_pin ? <span className="font-mono tracking-[0.2em]">{s.pin ?? "••••"}</span> : <span className="text-faint">—</span>}</td>
                <td className="py-3 pr-4 t-small hidden md:table-cell">
                  {s.status === "completed" ? `${s.selected_count} / ${s.photo_limit}${s.extra_count ? ` +${s.extra_count}` : ""}` : `${s.draft_count} / ${s.photo_limit}`}
                </td>
                <td className="py-3 pr-4 t-small hidden lg:table-cell">
                  {s.status === "completed" ? "—" : s.expires_at ? `${fmtDate(s.expires_at)} · ${daysLeft(s.expires_at)} d` : "No deadline"}
                </td>
                <td className="py-3 t-small text-mute hidden lg:table-cell">
                  {s.status === "completed" ? `Sent ${fmtDate(s.submitted_at)}` : s.last_seen_at ? `Opened ${fmtDate(s.last_seen_at, true)}` : "Link not opened"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-8 t-small text-faint"><Btn kind="ghost" className="!py-1.5 !px-3" onClick={() => api.get<SessionOut[]>("/api/admin/sessions").then(setRows)}>Refresh</Btn></p>
    </>
  );
}
