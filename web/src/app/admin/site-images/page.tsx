"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api, type ProjectPhoto } from "@/lib/admin-api";
import { Btn, Card, Field, Input, LoadError, PageHeader, SkeletonCards, confirm, toast } from "@/components/admin/ui";
import { FrameEditor, type FramePreview } from "@/components/admin/FrameEditor";
import type { Frame } from "@/lib/frame";

type Slot = { slot: string; page: string; description: string; file_id: string | null; frame: Frame | null };

/** The real shapes each slot is shown in (computer / phone), and whether its layout can show a whole photo. */
const SHAPES: Record<string, { previews: FramePreview[]; whole?: boolean }> = {
  hero: { previews: [{ label: "Computer", ratio: 1.9 }, { label: "Phone", ratio: 0.6 }] },
  "card-wedding": { previews: [{ label: "Card", ratio: 3 / 4 }], whole: true },
  "card-prewedding": { previews: [{ label: "Card", ratio: 3 / 4 }], whole: true },
  "card-personal": { previews: [{ label: "Card", ratio: 3 / 4 }], whole: true },
  "behind-main": { previews: [{ label: "Computer", ratio: 1.1 }, { label: "Phone", ratio: 0.93 }], whole: true },
  cta: { previews: [{ label: "Wide", ratio: 21 / 9 }], whole: true },
  "about-portrait": { previews: [{ label: "Portrait", ratio: 4 / 5 }], whole: true },
  "about-1": { previews: [{ label: "Strip", ratio: 3 / 4 }], whole: true },
  "about-2": { previews: [{ label: "Strip", ratio: 3 / 4 }], whole: true },
  "about-3": { previews: [{ label: "Strip", ratio: 3 / 4 }], whole: true },
  "about-4": { previews: [{ label: "Strip", ratio: 3 / 4 }], whole: true },
  "service-banner": { previews: [{ label: "Computer", ratio: 3.5 }, { label: "Phone", ratio: 1 }] },
  "service-wedding": { previews: [{ label: "Computer", ratio: 5 / 6 }, { label: "Phone", ratio: 4 / 5 }], whole: true },
  "service-prewedding": { previews: [{ label: "Computer", ratio: 5 / 6 }, { label: "Phone", ratio: 4 / 5 }], whole: true },
  "service-event": { previews: [{ label: "Computer", ratio: 5 / 6 }, { label: "Phone", ratio: 4 / 5 }], whole: true },
  "service-personal": { previews: [{ label: "Computer", ratio: 5 / 6 }, { label: "Phone", ratio: 4 / 5 }], whole: true },
  "contact-1": { previews: [{ label: "Computer", ratio: 4 / 5 }], whole: true },
};
type Data = { folder_id: string; photos: ProjectPhoto[]; slots: Slot[]; folder_error: string | null };

/**
 * The photographs on the pages themselves. One Drive folder, one photo per slot.
 * Until a slot is set, the site shows its placeholder — the list makes that visible.
 */
export default function SiteImagesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<Slot | null>(null);
  const [framing, setFraming] = useState<Slot | null>(null);

  const load = () => api.get<Data>("/api/admin/site-images").then((d) => { setData(d); setFolder(d.folder_id); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  useEffect(() => { load(); }, []);

  const byId = useMemo(() => Object.fromEntries((data?.photos ?? []).map((p) => [p.file_id, p])), [data]);
  const pages = useMemo(() => Array.from(new Set((data?.slots ?? []).map((s) => s.page))), [data]);
  const setCount = (data?.slots ?? []).filter((s) => s.file_id).length;

  async function saveFolder() {
    if (data?.folder_id && folder.trim() !== data.folder_id && setCount > 0) {
      if (!(await confirm({ title: "Switch the folder?", body: `The ${setCount} photographs already chosen belong to the current folder and will be cleared. The site shows placeholders until you choose again.`, action: "Switch folder", danger: true }))) return;
    }
    setBusy(true);
    try { const d = await api.put<Data>("/api/admin/site-images", { folder_id: folder.trim() }); setData(d); setFolder(d.folder_id); toast(d.folder_id ? `Folder read · ${d.photos.length} photographs` : "Folder cleared"); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); } finally { setBusy(false); }
  }
  async function assign(slot: string, file_id: string | null) {
    try { const d = await api.put<Data>("/api/admin/site-images", { slots: { [slot]: file_id } }); setData(d); setPicking(null); toast(file_id ? "Photo set — live on the site in a moment" : "Back to placeholder"); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  }
  async function saveFrame(slot: string, frame: Frame | null) {
    try { const d = await api.put<Data>("/api/admin/site-images", { frames: { [slot]: frame } }); setData(d); setFraming(null); toast("Framing saved — live on the site in a moment"); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  }
  async function sync() {
    try { const d = await api.post<Data>("/api/admin/site-images/sync"); setData(d); toast(`Folder re-read · ${d.photos.length} photographs`); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  }

  return (
    <>
      <PageHeader eyebrow="Website" title="Site images" actions={data?.folder_id ? <Btn onClick={sync}>Sync folder</Btn> : undefined} />

      {err ? <LoadError error={err} retry={() => { setErr(null); load(); }} /> : !data ? <SkeletonCards n={4} /> : (
        <div className="flex flex-col gap-6">
          <Card title="Google Drive folder">
            <p className="t-small text-mute">One folder with the photographs you want on the pages (web-size JPEGs). Then choose a photo for each slot below. Portfolio projects have their own folders.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" />
              <Btn kind="ink" onClick={saveFolder} disabled={busy || folder.trim() === data.folder_id}>{busy ? "Reading…" : data.folder_id ? "Change folder" : "Use this folder"}</Btn>
            </div>
            {data.folder_error && <p className="t-small text-error">{data.folder_error}</p>}
            {data.folder_id && !data.folder_error && <p className="t-small text-mute">{data.photos.length} photographs · {setCount} of {data.slots.length} slots set{setCount < data.slots.length && " — the rest still show placeholder photos"}</p>}
          </Card>

          {pages.map((page) => (
            <Card key={page} title={page}>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.slots.filter((s) => s.page === page).map((s) => {
                  const p = s.file_id ? byId[s.file_id] : null;
                  return (
                    <li key={s.slot} className="flex flex-col gap-2">
                      <button type="button" disabled={!data.folder_id} onClick={() => setPicking(s)} className={clsx("relative aspect-[4/3] overflow-hidden border transition-colors text-left", p ? "border-line hover:border-ink" : "border-dashed border-line hover:border-ink bg-[#f6f5f1]")} title={data.folder_id ? "Choose a photograph" : "Set the folder first"}>
                        {p ? <img src={api.img(p.thumb_url)} alt="" className="w-full h-full object-cover" loading="lazy" style={s.frame ? { objectPosition: `${s.frame.x}% ${s.frame.y}%` } : undefined} /> : <span className="absolute inset-0 flex items-center justify-center t-mono text-faint">placeholder</span>}
                      </button>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col"><span className="t-small">{s.description}</span><span className="t-mono text-faint">{s.slot}</span></div>
                        {p && (
                          <span className="flex gap-3 shrink-0">
                            <button type="button" onClick={() => setFraming(s)} className="link t-mono text-ink">framing{s.frame ? " ✓" : ""}</button>
                            <button type="button" onClick={() => assign(s.slot, null)} className="link t-mono text-mute">clear</button>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {framing && data && framing.file_id && byId[framing.file_id] && (
        <FrameEditor
          src={api.img(byId[framing.file_id].full_url)}
          title={`${framing.page} · ${framing.description}`}
          value={framing.frame}
          previews={SHAPES[framing.slot]?.previews ?? [{ label: "Frame", ratio: 4 / 5 }]}
          allowWhole={SHAPES[framing.slot]?.whole}
          onSave={(f) => saveFrame(framing.slot, f)}
          onClose={() => setFraming(null)}
        />
      )}

      {picking && data && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-4 admin-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) setPicking(null); }}>
          <div role="dialog" aria-modal="true" className="admin-pop w-full max-w-[880px] max-h-[86vh] bg-white border border-line flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="flex flex-col"><span className="t-mono text-mute">{picking.page}</span><span className="font-serif text-[22px] leading-tight">{picking.description}</span></div>
              <button type="button" onClick={() => setPicking(null)} aria-label="Close" className="text-mute hover:text-ink text-[18px]">✕</button>
            </div>
            <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 p-4 overflow-y-auto">
              {data.photos.map((p) => (
                <li key={p.file_id}>
                  <button type="button" onClick={() => assign(picking.slot, p.file_id)} title={p.filename} className={clsx("block w-full aspect-square bg-line overflow-hidden border-2 transition-colors", picking.file_id === p.file_id ? "border-ink" : "border-transparent hover:border-line")}>
                    <img src={api.img(p.thumb_url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
