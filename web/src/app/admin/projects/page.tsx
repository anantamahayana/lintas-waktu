"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { api, type Category, type Project } from "@/lib/admin-api";
import { Btn, PageHeader, Pill, toast, Empty, LoadError, SkeletonCards } from "@/components/admin/ui";

const CATS: (Category | "all" | "draft")[] = ["all", "wedding", "prewedding", "event", "personal", "draft"];
const LABEL: Record<string, string> = { all: "All", wedding: "Wedding", prewedding: "Pre-wedding", event: "Event", personal: "Personal", draft: "Drafts" };

export default function ProjectsPage() {
  const [rows, setRows] = useState<Project[] | null>(null);
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const [reorder, setReorder] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = () => { return api.get<Project[]>("/api/admin/projects").then((x) => { setRows(x); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed")); };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const all = rows ?? [];
    if (cat === "all") return all;
    if (cat === "draft") return all.filter((p) => !p.published);
    return all.filter((p) => p.category === cat);
  }, [rows, cat]);

  const move = (i: number, d: -1 | 1) => {
    if (!rows) return;
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };
  const saveOrder = async () => {
    if (!rows) return;
    try { await api.post("/api/admin/projects/reorder", rows.map((p) => p.id)); toast("Order saved"); setReorder(false); load(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Projects"
        actions={
          <>
            {reorder ? <Btn kind="ink" onClick={saveOrder}>Save order</Btn> : <Btn onClick={() => { setCat("all"); setReorder(true); }}>Reorder</Btn>}
            <Link href="/admin/projects/new" className="ink-btn !py-2.5 !px-4">+ New project</Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-8">
        {CATS.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} disabled={reorder} className={clsx("t-mono px-3.5 py-2 border transition-colors", cat === c ? "bg-ink text-white border-ink" : "border-line hover:border-ink")}>
            {LABEL[c]} <span className="opacity-60">{c === "all" ? rows?.length ?? "" : c === "draft" ? rows?.filter((p) => !p.published).length ?? "" : rows?.filter((p) => p.category === c).length ?? ""}</span>
          </button>
        ))}
      </div>

      {err ? <LoadError error={err} retry={() => { setErr(null); load(); }} /> : rows === null ? <SkeletonCards /> : shown.length === 0 ? (
        rows.length === 0
          ? <Empty title="No portfolio projects yet." body="Each project is a Google Drive folder of web-size JPEGs plus a short story in English and Indonesian. Published projects appear on the website within seconds." action={<Link href="/admin/projects/new" className="ink-btn !py-2.5 !px-4">Add the first project</Link>} />
          : <Empty title="Nothing matches this filter." body="Change the category or publish state above." />
      ) : (
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {shown.map((p, i) => (
            <li key={p.id} className="border border-line bg-white p-3 flex flex-col gap-3">
              <Link href={`/admin/projects/${p.id}`} className="block aspect-[4/5] bg-line overflow-hidden">
                {p.cover_url && <img src={api.img(p.cover_url)} alt="" className="w-full h-full object-cover" loading="lazy" />}
              </Link>
              <div className="flex flex-col gap-0.5">
                <Link href={`/admin/projects/${p.id}`} className="text-[14px] font-medium">{p.title}</Link>
                <span className="t-small text-mute">{LABEL[p.category]} · {p.location} · {p.date_label}</span>
              </div>
              <div className="flex items-center justify-between">
                <Pill tone={p.published ? "ok" : "mute"}>{p.published ? (p.featured ? "Published · featured" : "Published") : "Draft"}</Pill>
                {reorder ? (
                  <span className="flex gap-1">
                    <Btn className="!px-2 !py-1" onClick={() => move(i, -1)}>↑</Btn>
                    <Btn className="!px-2 !py-1" onClick={() => move(i, 1)}>↓</Btn>
                  </span>
                ) : (
                  <Link href={`/admin/projects/${p.id}`} className="link t-small text-mute">Edit</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 t-small text-faint max-w-[70ch]">Galleries are read from a Google Drive folder per project — the same way proofing sessions work. Cover, title, story and order are edited here; photographs are managed in Drive.</p>
    </>
  );
}
