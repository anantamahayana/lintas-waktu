"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/admin-api";
import { Empty, LoadError, PageHeader, SkeletonRows } from "@/components/admin/ui";

type Item = { id: number; at: string; kind: string; title: string; link: string | null; read: boolean };
const ICON: Record<string, string> = {
  gallery_open: "◎", gallery_submit: "✓", proof_open: "◎", proof_note: "✎", proof_approve: "✓", invoice_open: "◎", receipt_open: "◎", inquiry: "✉",
};
const when = (iso: string) => {
  const d = new Date(iso), mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

/** What clients did, newest first. Opening the page marks everything as read. */
export default function ActivityPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ items: Item[] }>("/api/admin/activity?limit=150")
      .then((r) => { setItems(r.items); if (r.items.some((x) => !x.read)) api.post("/api/admin/activity/read").catch(() => {}); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, []);
  return (
    <>
      <PageHeader eyebrow="Clients" title="Activity" />
      {err ? <LoadError error={err} retry={() => location.reload()} />
        : items === null ? <SkeletonRows n={8} />
        : items.length === 0 ? <Empty title="Nothing yet." body="When a client opens a gallery, proof, invoice or receipt, or sends a message, it shows up here." />
        : (
          <ol className="border-t border-line">
            {items.map((x) => {
              const row = (
                <div className="flex items-start gap-4 py-3.5">
                  <span className={`w-5 text-center ${x.kind.endsWith("approve") || x.kind.endsWith("submit") ? "text-[#5f7a4a]" : "text-mute"}`} aria-hidden>{ICON[x.kind] ?? "·"}</span>
                  <span className={`flex-1 text-[14px] ${x.read ? "text-ink/80" : "font-medium"}`}>{x.title}</span>
                  <span className="t-small text-faint whitespace-nowrap">{when(x.at)}</span>
                  {!x.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-ink" aria-label="new" />}
                </div>
              );
              return <li key={x.id} className="border-b border-line">{x.link ? <Link href={x.link} className="block hover:bg-[#f6f5f1] px-1">{row}</Link> : <div className="px-1">{row}</div>}</li>;
            })}
          </ol>
        )}
    </>
  );
}
