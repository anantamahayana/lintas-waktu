"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { api, type CacheStatus, type SessionDetail } from "@/lib/admin-api";
import { Btn, Card, Field, Input, PageHeader, Pill, Textarea, daysLeft, fmtDate, toast } from "@/components/admin/ui";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [s, setS] = useState<SessionDetail | null>(null);
  const [cache, setCache] = useState<CacheStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState("");

  const load = useCallback(() => api.get<SessionDetail>(`/api/admin/sessions/${id}`).then(setS).catch((e) => toast(e.message, true)), [id]);
  useEffect(() => { load(); }, [load]);

  // cache progress while the gallery is being prepared
  useEffect(() => {
    if (!s) return;
    let stop = false;
    const tick = async () => {
      const c = await api.get<CacheStatus>(`/api/admin/sessions/${id}/cache`).catch(() => null);
      if (stop) return;
      setCache(c);
      if (c && !c.ready) setTimeout(tick, 3000);
    };
    tick();
    return () => { stop = true; };
  }, [s?.id, id, s]);

  // live picks while pending
  useEffect(() => {
    if (!s || s.status !== "pending") return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [s, load]);

  if (!s) return <p className="t-small text-mute">Loading…</p>;

  const act = async (label: string, fn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try { await fn(); toast(label); await load(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", true); }
  };

  const waText = [
    `Hi ${s.client_name}, your photographs are ready to choose from.`,
    "",
    s.gallery_url,
    s.has_pin ? `PIN: ${pin || "[fill in PIN]"}` : null,
    "",
    `Please pick your ${s.photo_limit} favourites${s.max_limit && s.max_limit > s.photo_limit ? ` (up to ${s.max_limit} with extras)` : ""}, then press Send.`,
    s.expires_at ? `The gallery stays open until ${fmtDate(s.expires_at)}.` : null,
    "",
    "Thank you — Lintas Waktu",
  ].filter((l) => l !== null).join("\n");

  const status = s.status === "completed" ? <Pill tone="ok">Completed · sent {fmtDate(s.submitted_at)}</Pill>
    : cache && !cache.ready ? <Pill tone="warn">Preparing gallery… {cache.thumb} / {cache.total}</Pill>
    : s.first_opened_at ? <Pill tone="warn">Choosing · gallery ready</Pill> : <Pill tone="mute">Gallery ready · not opened yet</Pill>;

  const picks = s.status === "completed" ? s.selected_photos.map((p) => ({ id: p.drive_file_id, name: p.filename, note: p.note, extra: p.is_extra })) : s.draft_photos.map((p) => ({ id: p.drive_file_id, name: p.filename, note: p.note, extra: false }));
  const notes = picks.filter((p) => p.note);

  return (
    <>
      <PageHeader
        eyebrow={<><Link href="/admin" className="link">Sessions</Link> · {s.notes?.split("\n")[0] || fmtDate(s.created_at)}</> as unknown as string}
        title={s.client_name}
        actions={
          <>
            <Btn onClick={() => { navigator.clipboard.writeText(s.gallery_url); toast("Link copied"); }}>Copy link</Btn>
            <a className="ink-btn !py-2.5 !px-4" href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer">Send via WhatsApp</a>
          </>
        }
      />
      <div className="mb-6">{status}</div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <Card title="Session">
            {!editing ? (
              <>
                <dl className="flex flex-col t-small">
                  {[
                    ["Link", <a key="l" href={s.gallery_url} target="_blank" rel="noreferrer" className="link break-all">{s.gallery_url.replace(/^https?:\/\//, "")}</a>],
                    ["PIN", s.has_pin ? <span key="p" className="flex items-center gap-2">set <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="for WhatsApp msg" className="!h-8 !w-[150px]" /></span> : "none"],
                    ["Package", `${s.photo_limit} photos${s.max_limit ? ` · up to ${s.max_limit}` : ""}`],
                    ["Deadline", s.expires_at ? `${fmtDate(s.expires_at)} · ${daysLeft(s.expires_at)} days left` : "—"],
                    ["Drive folder", <a key="d" href={`https://drive.google.com/drive/folders/${s.drive_folder_id}`} target="_blank" rel="noreferrer" className="link">open ↗</a>],
                    ["Photos", cache ? `${cache.total} · ${cache.ready ? "cache ready" : "preparing"}` : "—"],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between gap-4 py-2 border-b border-line last:border-0"><dt className="text-mute shrink-0">{k}</dt><dd className="text-right">{v}</dd></div>
                  ))}
                </dl>
                <Btn onClick={() => setEditing(true)}>Edit session</Btn>
              </>
            ) : (
              <EditForm s={s} onDone={() => { setEditing(false); load(); }} />
            )}
          </Card>

          <Card title="Client activity">
            <dl className="flex flex-col t-small">
              {[["First opened", fmtDate(s.first_opened_at, true)], ["Last seen", fmtDate(s.last_seen_at, true)], ["Notes written", String(notes.length)], ["Created", fmtDate(s.created_at)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 border-b border-line last:border-0"><dt className="text-mute">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </Card>

          <Card title="Manage">
            <div className="flex flex-col gap-2">
              <Btn onClick={() => act("Folder re-read", () => api.post(`/api/admin/sessions/${id}/sync`))}>Sync Drive folder</Btn>
              <Btn onClick={() => act("All devices signed out", () => api.post(`/api/admin/sessions/${id}/relock`))}>Re-lock all devices</Btn>
              {s.status === "completed" && <Btn onClick={() => act("Reopened", () => api.post(`/api/admin/sessions/${id}/reopen`), "Let the client change their selection? Their picks become the starting draft.")}>Reopen for changes</Btn>}
              <Btn kind="danger" onClick={() => act("Selections reset", () => api.post(`/api/admin/sessions/${id}/reset`), "Wipe every pick, note and mark? The client starts from zero.")}>Reset all selections</Btn>
              <Btn kind="danger" onClick={() => act("Deleted", async () => { await api.del(`/api/admin/sessions/${id}`); router.push("/admin"); }, "Delete this session permanently?")}>Delete session</Btn>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-serif text-[24px] leading-none">
                  {s.status === "completed" ? "Selection" : "Selection in progress"} · {picks.length} / {s.photo_limit}
                  {s.extra_count > 0 && <span className="text-mute"> +{s.extra_count}</span>}
                </h2>
                <span className="t-small text-mute">{s.status === "completed" ? "Final. Export below." : "Live — updates as the client chooses (every 15 s)."}</span>
              </div>
              {s.status === "completed" && (
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => api.download(`/api/admin/sessions/${id}/export/xmp`, `${s.client_name}-xmp.zip`).catch((e) => toast(e.message, true))}>XMP .zip</Btn>
                  <Btn onClick={() => api.download(`/api/admin/sessions/${id}/export/csv`, `${s.client_name}.csv`).catch((e) => toast(e.message, true))}>CSV</Btn>
                  <Btn onClick={async () => { const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/admin/sessions/${id}/export/filenames`, { headers: { authorization: `Bearer ${localStorage.getItem("lw_admin_token")}` } }); navigator.clipboard.writeText(await r.text()); toast("Filenames copied"); }}>Copy filenames</Btn>
                </div>
              )}
            </div>
            {picks.length === 0 ? (
              <p className="t-small text-faint py-8 text-center">No picks yet.</p>
            ) : (
              <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {picks.map((p) => (
                  <li key={p.id} className="relative aspect-[4/5] bg-line overflow-hidden group">
                    <img src={api.img(`/api/gallery/${s.slug}/img/${p.id}?size=thumb`, s.gallery_token)} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    {p.extra && <span className="absolute left-1.5 bottom-1.5 bg-ink text-[#c9a84c] t-mono !text-[9px] px-1.5 py-0.5">Extra</span>}
                    {p.note && <span className="absolute right-1.5 top-1.5 h-5 w-5 rounded-full bg-white text-[10px] flex items-center justify-center">✎</span>}
                    <span className={clsx("absolute inset-x-0 bottom-0 bg-white/90 t-mono !text-[9px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity")}>{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {notes.length > 0 && (
            <Card title="Client notes">
              <ul className="flex flex-col divide-y divide-line">
                {notes.map((p) => (
                  <li key={p.id} className="py-3 flex gap-4"><span className="t-mono text-mute w-[160px] shrink-0 truncate">{p.name}</span><span className="t-small">{p.note}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function EditForm({ s, onDone }: { s: SessionDetail; onDone: () => void }) {
  const [v, setV] = useState({
    client_name: s.client_name, drive_folder_id: s.drive_folder_id, photo_limit: s.photo_limit, max_limit: s.max_limit ?? "",
    pin: "", expires_at: s.expires_at ? s.expires_at.slice(0, 10) : "", notes: s.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  async function save() {
    setBusy(true);
    try {
      await api.patch(`/api/admin/sessions/${s.id}`, {
        client_name: v.client_name, drive_folder_id: v.drive_folder_id, photo_limit: Number(v.photo_limit),
        max_limit: v.max_limit === "" ? null : Number(v.max_limit), notes: v.notes || null,
        ...(v.pin !== "" ? { pin: v.pin } : {}),
        ...(v.expires_at ? { expires_at: new Date(v.expires_at + "T23:59:59").toISOString() } : { clear_expiry: true }),
      });
      toast("Saved"); onDone();
    } catch (e) { toast(e instanceof Error ? e.message : "Failed", true); } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-col gap-4">
      <Field label="Client name"><Input value={v.client_name} onChange={set("client_name")} /></Field>
      <Field label="Drive folder"><Input value={v.drive_folder_id} onChange={set("drive_folder_id")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Package"><Input type="number" min={1} value={v.photo_limit} onChange={set("photo_limit")} /></Field>
        <Field label="Max"><Input type="number" min={1} value={v.max_limit} onChange={set("max_limit")} /></Field>
        <Field label="New PIN" hint="blank = keep"><Input maxLength={4} value={v.pin} onChange={set("pin")} placeholder="••••" /></Field>
        <Field label="Expires"><Input type="date" value={v.expires_at} onChange={set("expires_at")} /></Field>
      </div>
      <Field label="Note"><Textarea value={v.notes} onChange={set("notes")} /></Field>
      <div className="flex gap-2"><Btn kind="ink" onClick={save} disabled={busy}>Save</Btn><Btn onClick={onDone}>Cancel</Btn></div>
    </div>
  );
}
