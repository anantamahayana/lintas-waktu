"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/admin-api";
import { diffCopy, mergeCopy } from "@/lib/copy";
import { Btn, PageHeader, confirm, toast, useUnsavedChanges, LoadError, SkeletonForm } from "@/components/admin/ui";
import enDefaults from "../../../../messages/en.json";
import idDefaults from "../../../../messages/id.json";

type Tree = Record<string, unknown>;
type Loc = "en" | "id";
type Path = (string | number)[];

/** Tabs follow the site's pages; each shows the text blocks that page reads. */
const TABS: { key: string; label: string; roots: string[][]; skip?: string[] }[] = [
  { key: "home", label: "Home", roots: [["home"]], skip: ["packages"] },
  { key: "packages", label: "Packages", roots: [["home", "packages"]] },
  { key: "services", label: "Services", roots: [["services"]] },
  { key: "about", label: "About", roots: [["about"]] },
  { key: "contact", label: "Contact", roots: [["contact"]] },
  { key: "work", label: "Work", roots: [["work"], ["project"], ["categories"]] },
  { key: "global", label: "Menu & footer", roots: [["brand"], ["nav"], ["cta"], ["footer"], ["notFound"]] },
  { key: "seo", label: "SEO", roots: [["meta"]] },
];

const DEFAULTS: Record<Loc, Tree> = { en: enDefaults as Tree, id: idDefaults as Tree };

const at = (o: unknown, p: Path): unknown => p.reduce<unknown>((x, k) => (x == null ? undefined : (x as Record<string | number, unknown>)[k]), o);
function setAt<T>(o: T, p: Path, v: unknown): T {
  if (!p.length) return v as T;
  const [k, ...rest] = p;
  const copy = (Array.isArray(o) ? [...o] : { ...(o as object) }) as Record<string | number, unknown>;
  copy[k] = setAt(copy[k], rest, v);
  return copy as T;
}
/** A new list item: the first item's shape with every text empty. */
const blank = (x: unknown): unknown => (typeof x === "string" ? "" : Array.isArray(x) ? [] : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, blank(v)])) : x);
const human = (k: string | number) => (typeof k === "number" ? `#${k + 1}` : k.replace(/_/g, " ").replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()));

export default function SiteTextPage() {
  const [val, setVal] = useState<Record<Loc, Tree> | null>(null);
  const [saved, setSaved] = useState("");
  const [tab, setTab] = useState(TABS[0].key);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = () => {
    api.get<Record<Loc, Tree>>("/api/admin/copy").then((o) => {
      const v = { en: mergeCopy(DEFAULTS.en, o.en), id: mergeCopy(DEFAULTS.id, o.id) };
      setVal(v); setSaved(JSON.stringify(v)); setErr(null);
    }).catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  };
  useEffect(() => { load(); }, []);
  const dirty = !!val && JSON.stringify(val) !== saved;
  useUnsavedChanges(dirty);

  const changed = useMemo(() => {
    if (!val) return 0;
    let n = 0;
    const count = (d: unknown) => { if (d === undefined) return; if (d && typeof d === "object" && !Array.isArray(d)) Object.values(d).forEach(count); else n++; };
    count(diffCopy(val.en, DEFAULTS.en)); count(diffCopy(val.id, DEFAULTS.id));
    return n;
  }, [val]);

  if (err) return <LoadError error={err} retry={load} />;
  if (!val) return <SkeletonForm fields={10} />;

  const setText = (loc: Loc, p: Path, v: string) => setVal((x) => (x ? { ...x, [loc]: setAt(x[loc], p, v) } : x));
  // list edits change both languages together so the items stay paired
  const editList = (p: Path, f: (list: unknown[], loc: Loc) => unknown[]) =>
    setVal((x) => (x ? { en: setAt(x.en, p, f([...(at(x.en, p) as unknown[])], "en")), id: setAt(x.id, p, f([...(at(x.id, p) as unknown[])], "id")) } : x));
  const reset = (p: Path) => setVal((x) => (x ? { en: setAt(x.en, p, at(DEFAULTS.en, p)), id: setAt(x.id, p, at(DEFAULTS.id, p)) } : x));

  async function save() {
    if (!val) return;
    setBusy(true);
    try {
      await api.put("/api/admin/copy", { en: diffCopy(val.en, DEFAULTS.en) ?? {}, id: diffCopy(val.id, DEFAULTS.id) ?? {} });
      setSaved(JSON.stringify(val));
      toast("Site text saved — the website updates within a minute");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", true);
    } finally {
      setBusy(false);
    }
  }
  async function resetAll() {
    if (!(await confirm({ title: "Reset all site text?", body: "Every text goes back to the original wording, in both languages. Nothing is saved until you press Save.", action: "Reset all", danger: true }))) return;
    setVal({ en: DEFAULTS.en, id: DEFAULTS.id });
  }

  const current = TABS.find((x) => x.key === tab)!;
  const needle = q.trim().toLowerCase();
  const matches = (p: Path) => !needle || [at(val.en, p), at(val.id, p), p.join(" ")].some((s) => String(s ?? "").toLowerCase().includes(needle));

  // ------------------------------------------------------------ renderers (plain functions, not components: inputs keep focus while typing)
  function renderText(p: Path, label: string) {
    if (!matches(p)) return null;
    const d = { en: at(DEFAULTS.en, p) as string | undefined, id: at(DEFAULTS.id, p) as string | undefined };
    const v = { en: String(at(val!.en, p) ?? ""), id: String(at(val!.id, p) ?? "") };
    const isChanged = d.en !== undefined && (v.en !== d.en || v.id !== d.id);
    const sample = d.en ?? v.en;
    const long = sample.length > 70 || sample.includes("\n") || label.toLowerCase().includes("includes");
    const vars = [...new Set(sample.match(/\{\w+\}/g) ?? [])];
    const hints = [
      vars.length ? `keep ${vars.join(" ")} — filled in automatically` : "",
      /<\w+>/.test(sample) ? "text inside <em>…</em> shows in italics" : "",
      label.toLowerCase().includes("includes") ? "one item per line" : "",
    ].filter(Boolean);
    return (
      <div key={p.join(".")} className={clsx("flex flex-col gap-2 py-3 border-b border-line last:border-0", isChanged && "bg-[#faf6ea] -mx-3 px-3")}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="t-mono text-mute">{label}{hints.length > 0 && <span className="text-faint normal-case tracking-normal"> · {hints.join(" · ")}</span>}</span>
          {isChanged && <button type="button" onClick={() => reset(p)} className="link t-mono text-faint hover:text-ink shrink-0">Reset</button>}
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          {(["en", "id"] as const).map((loc) => (
            <label key={loc} className="relative">
              <span className="absolute right-2 top-2 t-mono !text-[10px] text-faint pointer-events-none">{loc.toUpperCase()}</span>
              {long ? (
                <textarea value={v[loc]} onChange={(e) => setText(loc, p, e.target.value)} rows={Math.min(8, Math.max(2, Math.ceil(v[loc].length / 60) + (v[loc].match(/\n/g)?.length ?? 0)))} className="field !min-h-0 pr-9 w-full" />
              ) : (
                <input value={v[loc]} onChange={(e) => setText(loc, p, e.target.value)} className="field !h-11 pr-9 w-full" />
              )}
            </label>
          ))}
        </div>
      </div>
    );
  }

  function renderList(p: Path, label: string) {
    const list = at(val!.en, p) as unknown[];
    const listChanged = JSON.stringify(at(val!.en, p)) !== JSON.stringify(at(DEFAULTS.en, p)) || JSON.stringify(at(val!.id, p)) !== JSON.stringify(at(DEFAULTS.id, p));
    const template = (at(DEFAULTS.en, p) as unknown[])[0];
    return (
      <div key={p.join(".")} className="flex flex-col gap-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="t-mono text-ink">{label} <span className="text-faint">· {list.length}</span></span>
          {listChanged && <button type="button" onClick={() => reset(p)} className="link t-mono text-faint hover:text-ink">Reset list</button>}
        </div>
        {list.map((item, i) => {
          const title = item && typeof item === "object" ? String(Object.values(item as object).find((x) => typeof x === "string" && x) ?? "") : "";
          return (
            <div key={i} className="border border-line p-3 sm:p-4 flex flex-col">
              <div className="flex items-center justify-between gap-2 pb-1">
                <span className="t-small truncate"><span className="t-mono text-faint mr-2">{i + 1}</span>{title.slice(0, 60)}</span>
                <span className="flex gap-1 shrink-0">
                  <button type="button" disabled={i === 0} onClick={() => editList(p, (l) => { [l[i - 1], l[i]] = [l[i], l[i - 1]]; return l; })} aria-label="Move up" className="h-9 w-9 border border-line disabled:opacity-30">↑</button>
                  <button type="button" disabled={i === list.length - 1} onClick={() => editList(p, (l) => { [l[i + 1], l[i]] = [l[i], l[i + 1]]; return l; })} aria-label="Move down" className="h-9 w-9 border border-line disabled:opacity-30">↓</button>
                  <button type="button" disabled={list.length <= 1} onClick={async () => { if (await confirm({ title: `Remove “${title.slice(0, 40) || `item ${i + 1}`}”?`, body: "Removed in both languages. Nothing is saved until you press Save.", action: "Remove", danger: true })) editList(p, (l) => l.filter((_, j) => j !== i)); }} aria-label="Remove" className="h-9 w-9 border border-line text-mute hover:text-error disabled:opacity-30">✕</button>
                </span>
              </div>
              {renderNode([...p, i])}
            </div>
          );
        })}
        <Btn type="button" className="self-start" onClick={() => editList(p, (l) => [...l, blank(template)])}>+ Add {label.toLowerCase().replace(/s$/, "")}</Btn>
      </div>
    );
  }

  function renderNode(p: Path, skip?: string[]): React.ReactNode {
    const d = at(DEFAULTS.en, p) ?? at(val!.en, p);
    if (typeof d === "string") return renderText(p, human(p[p.length - 1]));
    if (Array.isArray(d)) return renderList(p, human(p[p.length - 1]));
    if (d && typeof d === "object") {
      const keys = Object.keys(d).filter((k) => !skip?.includes(k));
      const leafy = keys.filter((k) => typeof (d as Tree)[k] === "string");
      const lists = keys.filter((k) => Array.isArray((d as Tree)[k]));
      const groups = keys.filter((k) => typeof (d as Tree)[k] !== "string" && !Array.isArray((d as Tree)[k]));
      return (
        <div className="flex flex-col">
          {leafy.map((k) => renderText([...p, k], human(k)))}
          {lists.map((k) => renderList([...p, k], human(k)))}
          {groups.map((k) => (
            <details key={k} open={!!needle || p.length > 1} className="group border-t border-line first:border-t-0">
              <summary className="cursor-pointer list-none py-3 flex items-center justify-between t-mono text-ink">
                {human(k)} <span className="text-faint transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="pl-0 sm:pl-3 pb-3">{renderNode([...p, k])}</div>
            </details>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Site text"
        actions={
          <>
            <a className="action !py-2.5 !px-4" href="/" target="_blank" rel="noreferrer">View site ↗</a>
            <Btn kind="ink" disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : dirty ? "Save" : "Saved"}</Btn>
          </>
        }
      />
      <p className="t-small text-mute max-w-[70ch] -mt-2 mb-5">
        Every text on the public website, in English and Indonesian. Changed fields are highlighted; “Reset” brings back the original wording. Layout and photos are set elsewhere (Projects, Site images).
        {changed > 0 && <span className="text-ink"> · {changed} change{changed === 1 ? "" : "s"} from the original</span>}
      </p>

      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-line -mx-1 px-1 pb-3 pt-1 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div role="tablist" className="flex flex-wrap gap-1">
          {TABS.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} onClick={() => setTab(x.key)} className={clsx("t-mono px-3 py-2 border", tab === x.key ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink")}>{x.label}</button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find text…" className="field !h-10 sm:ml-auto sm:w-56" />
      </div>

      <div className="border border-line bg-white p-4 sm:p-6 flex flex-col gap-2">
        {current.roots.map((r) => (
          <div key={r.join(".")} className="flex flex-col">
            {current.roots.length > 1 && <h3 className="t-mono text-ink pt-4 first:pt-0 pb-1">{human(r[r.length - 1])}</h3>}
            {renderNode(r, current.skip)}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-5">
        <button type="button" onClick={resetAll} className="link t-mono text-faint hover:text-error">Reset all text to the original</button>
        <Btn kind="ink" disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : dirty ? "Save" : "Saved"}</Btn>
      </div>
    </>
  );
}
