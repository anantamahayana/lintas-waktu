"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { gapi, galleryToken, localDraft, GalleryError, type DraftOut, type GalleryData, type GalleryMeta, type GPhoto } from "@/lib/gallery-api";
import { T, type Dict, type Lang } from "./i18n";
import { AlbumPreview } from "./AlbumPreview";

type Filter = "all" | "selected" | "maybe";
type Stage = "loading" | "pin" | "gallery" | "confirm" | "sent" | "expired";
type IntroPhase = "in" | "out" | "gone";
const INTRO_MS = 2600;

const GOLD = "#c9a84c";

type Picks = { ids: string[]; notes: Record<string, string>; maybe: string[] };
const PULL_MS = 12000; // an open gallery checks for picks made on other devices this often

const picksKey = (p: Picks) => JSON.stringify([p.ids, Object.entries(p.notes).sort(([a], [b]) => (a < b ? -1 : 1)), p.maybe]);

/**
 * Three-way merge for picks when another device saved first: start from theirs, then replay
 * what changed here since the common base (added / removed picks and marks, edited notes).
 */
function mergePicks(base: Picks, mine: Picks, theirs: Picks): Picks {
  const replay = (b: string[], m: string[], t: string[]) => {
    const inBase = new Set(b), inMine = new Set(m);
    const out = t.filter((i) => !(inBase.has(i) && !inMine.has(i)));
    for (const i of m) if (!inBase.has(i) && !out.includes(i)) out.push(i);
    return out;
  };
  const ids = replay(base.ids, mine.ids, theirs.ids);
  const notes = { ...theirs.notes };
  for (const k of new Set([...Object.keys(base.notes), ...Object.keys(mine.notes)])) {
    if (mine.notes[k] === base.notes[k]) continue;
    if (mine.notes[k]) notes[k] = mine.notes[k]; else delete notes[k];
  }
  const sel = new Set(ids);
  return {
    ids,
    notes: Object.fromEntries(Object.entries(notes).filter(([k]) => sel.has(k))),
    maybe: replay(base.maybe, mine.maybe, theirs.maybe).filter((i) => !sel.has(i)),
  };
}

/*
 * Back button / Android back gesture closes the overlay on top (viewer, album, guide, dialogs)
 * instead of leaving the gallery. Each open overlay adds one history entry; closing it from the
 * UI removes that entry again (skipping our own popstate).
 */
const layers: { close: () => void }[] = [];
let skipPops = 0;
let popBound = false;
function onPopLayer() {
  if (skipPops > 0) { skipPops--; return; }
  layers.pop()?.close();
}
function useBackClose(open: boolean, close: () => void) {
  const ref = useRef(close);
  useEffect(() => { ref.current = close; });
  useEffect(() => {
    if (!open) return;
    const layer = { close: () => ref.current() };
    layers.push(layer);
    window.history.pushState(null, "");
    if (!popBound) { window.addEventListener("popstate", onPopLayer); popBound = true; }
    return () => {
      const i = layers.indexOf(layer);
      if (i >= 0) { layers.splice(i, 1); skipPops++; window.history.back(); }
    };
  }, [open]);
}

/** While a dialog is up, the page behind it does not scroll. */
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = document.documentElement, prev = h.style.overflow;
    h.style.overflow = "hidden";
    return () => { h.style.overflow = prev; };
  }, [active]);
}

function fmt(iso: string | null, lang: Lang) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long" });
}

/**
 * The client proofing gallery (/g/[slug]). One component, several stages.
 * Picks/notes/marks autosave to the server (debounced) so the client can
 * continue from another device. Photographer preview (admin token) never saves.
 */
export function ClientGallery({ slug }: { slug: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];
  const [meta, setMeta] = useState<GalleryMeta | null>(null);
  const [data, setData] = useState<GalleryData | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [intro, setIntro] = useState<IntroPhase>("gone");
  const [error, setError] = useState<string | null>(null);

  // selection state
  const [ids, setIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [maybe, setMaybe] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null); // lightbox index within `visible`
  const gridApi = useRef<GridApi | null>(null);
  const [guide, setGuide] = useState(false);
  const [overPrompt, setOverPrompt] = useState<string | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [sent, setSent] = useState<{ selected_count: number; extra_count: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Picks sync: `base` is the last state the server confirmed (with its version). The screen may
  // differ from it (changes waiting to be saved); a save names the version it built on, and if
  // another device saved first the server answers 412 and the two are merged.
  const base = useRef<(Picks & { version: number }) | null>(null);

  const loadGallery = useCallback(async () => {
    try {
      const d = await gapi.load(slug);
      setData(d);
      base.current = { version: d.draft_version, ids: d.selected_ids, notes: d.notes, maybe: d.maybe_ids };
      let start: Picks = base.current;
      // unsaved picks from this device come back only if no device has saved since they were made
      const local = d.preview || d.status === "completed" ? null : localDraft.get(slug);
      if (local && local.rev === d.rev && local.base === d.draft_version) {
        const known = new Set(d.photos.map((p) => p.file_id));
        const ids = local.ids.filter((i) => known.has(i));
        start = { ids, notes: Object.fromEntries(Object.entries(local.notes).filter(([i]) => ids.includes(i))), maybe: local.maybe.filter((i) => known.has(i) && !ids.includes(i)) };
      } else if (!d.preview) localDraft.clear(slug);
      setIds(start.ids);
      setNotes(start.notes);
      setMaybe(start.maybe);
      if (d.status === "completed") { setSent({ selected_count: d.selected_ids.length, extra_count: 0 }); setStage("sent"); }
      else if (!sessionStorage.getItem(`lw_guide_${slug}`)) setGuide(true);
    } catch (e) {
      if (e instanceof GalleryError && e.status === 401) { galleryToken.clear(slug); setStage("pin"); }
      else if (e instanceof GalleryError && e.status === 410) setStage("expired");
      else setError(e instanceof Error ? e.message : "Error");
    }
  }, [slug]);

  const goGallery = useCallback(() => { setStage("gallery"); loadGallery(); }, [loadGallery]);

  // 1. meta → intro (once per browser session) / pin / gallery. All state is set in callbacks.
  useEffect(() => {
    gapi.meta(slug).then((m) => {
      if (navigator.language.toLowerCase().startsWith("id")) setLang("id");
      setMeta(m);
      if (m.expired) { setStage("expired"); return; }
      // the title card plays once per browser session (skipped for reduced motion)
      const seen = sessionStorage.getItem(`lw_intro_${slug}`) || matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!seen) setIntro("in");
      if (m.locked && !galleryToken.get(slug)) setStage("pin"); else goGallery();
    }).catch((e) => setError(e.message));
  }, [slug, goGallery]);

  // intro timing: lift away after INTRO_MS (or on tap), then unmount
  useEffect(() => {
    if (intro === "in") { const h = setTimeout(() => setIntro("out"), INTRO_MS); return () => clearTimeout(h); }
    if (intro === "out") { const h = setTimeout(() => { setIntro("gone"); sessionStorage.setItem(`lw_intro_${slug}`, "1"); }, 700); return () => clearTimeout(h); }
  }, [intro, slug]);

  // 2. autosave draft — not in preview, not when completed. Changes are kept on this device at
  // once; the server gets them after a short pause, right away when the page is left, and again
  // when the connection comes back after a failed save.
  const [saveState, setSaveState] = useState<"" | "saving" | "saved" | "offline">("");
  const pending = useRef<Picks | null>(null);
  const inflight = useRef(false);
  const again = useRef(false);
  const flushRef = useRef<() => void>(() => {});
  const known = useMemo(() => new Set((data?.photos ?? []).map((p) => p.file_id)), [data]);
  const hardMax = data?.max_limit ?? Infinity;

  // take the server's picks as they are (another device changed them)
  const applyServer = useCallback((d: DraftOut) => {
    const ids = d.file_ids.filter((i) => known.has(i));
    const picks = { ids, notes: Object.fromEntries(Object.entries(d.notes).filter(([i]) => ids.includes(i))), maybe: d.maybe_ids.filter((i) => known.has(i) && !ids.includes(i)) };
    base.current = { version: d.version, ...picks };
    setIds(picks.ids);
    setNotes(picks.notes);
    setMaybe(picks.maybe);
    return picks;
  }, [known]);

  const flush = useCallback((keepalive = false) => {
    const body = pending.current;
    if (!body || !base.current) return;
    if (inflight.current) { again.current = true; return; }
    inflight.current = true;
    setSaveState("saving");
    gapi.draft(slug, { file_ids: body.ids, notes: body.notes, maybe_ids: body.maybe, base_version: base.current.version }, keepalive).then((d) => {
      base.current = { version: d.version, ...body };
      if (pending.current === body) { pending.current = null; localDraft.clear(slug); }
      setSaveState("saved");
    }).catch((e) => {
      if (e instanceof GalleryError && e.status === 412 && e.detail && base.current) {
        // another device saved first: keep their picks and replay ours on top; the autosave sends the result
        const mine = pending.current ?? body;
        const prev = base.current;
        const theirs = applyServer(e.detail as DraftOut);
        const merged = mergePicks(prev, mine, theirs);
        setIds(merged.ids.slice(0, hardMax));
        setNotes(merged.notes);
        setMaybe(merged.maybe);
        return;
      }
      if (e instanceof GalleryError && e.status === 409) { pending.current = null; localDraft.clear(slug); loadGallery(); return; } // sent from another device
      setSaveState("offline");
    }).finally(() => {
      inflight.current = false;
      if (again.current) { again.current = false; flushRef.current(); } // a change came in while saving
    });
  }, [slug, applyServer, hardMax, loadGallery]);
  useEffect(() => { flushRef.current = flush; }, [flush]);

  useEffect(() => {
    if (!data || data.preview || data.status === "completed" || stage === "sent" || !base.current) return;
    const mine = { ids, notes, maybe };
    if (picksKey(mine) === picksKey(base.current)) { pending.current = null; localDraft.clear(slug); return; }
    localDraft.set(slug, { rev: data.rev, base: base.current.version, ...mine });
    pending.current = mine;
    const h = setTimeout(() => flush(), 800);
    return () => clearTimeout(h);
  }, [ids, notes, maybe, data, slug, stage, flush]);

  // follow the other devices: when the tab comes back, on focus, and every PULL_MS while visible
  const pull = useCallback(async () => {
    if (!data || stage !== "gallery" || pending.current || inflight.current) return;
    try {
      const d = await gapi.getDraft(slug);
      if (d.rev !== data.rev || d.status === "completed") { loadGallery(); return; } // reset, or sent elsewhere
      if (base.current && d.version !== base.current.version && !pending.current && !inflight.current) applyServer(d);
    } catch {} // offline: try again next time
  }, [data, stage, slug, loadGallery, applyServer]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(true); else { flush(); pull(); } };
    const onLeave = () => flush(true);
    const onOnline = () => { flush(); pull(); };
    const onFocus = () => pull();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    const h = setInterval(() => { if (document.visibilityState === "visible") pull(); }, PULL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      clearInterval(h);
    };
  }, [flush, pull]);

  // derived
  const limit = data?.photo_limit ?? 0;
  const hard = data?.max_limit ?? limit;
  const count = ids.length;
  const extras = Math.max(0, count - limit);
  const full = count >= hard;
  const selectedSet = useMemo(() => new Set(ids), [ids]);
  const maybeSet = useMemo(() => new Set(maybe), [maybe]);
  const visible = useMemo(() => {
    const all = data?.photos ?? [];
    if (filter === "selected") return all.filter((p) => selectedSet.has(p.file_id));
    if (filter === "maybe") return all.filter((p) => maybeSet.has(p.file_id));
    return all;
  }, [data, filter, selectedSet, maybeSet]);

  const toggle = (id: string, force?: boolean) => {
    if (selectedSet.has(id)) { setIds((s) => s.filter((x) => x !== id)); return; }
    if (full) return;
    if (count >= limit && !force) { setOverPrompt(id); return; }
    setIds((s) => [...s, id]);
    setMaybe((m) => m.filter((x) => x !== id));
  };
  const toggleMaybe = (id: string) => { setMaybe((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id])); };
  const setNote = (id: string, v: string) => { setNotes((n) => { const c = { ...n }; if (v.trim()) c[id] = v; else delete c[id]; return c; }); };

  const openConfirm = () => { setExtraIds(ids.slice(limit)); setStage("confirm"); };
  const [finalAsk, setFinalAsk] = useState(false);
  const [album, setAlbum] = useState(false);
  const closeGuide = () => { setGuide(false); sessionStorage.setItem(`lw_guide_${slug}`, "1"); };
  const closeLightbox = () => { const i = open; setOpen(null); if (i !== null) gridApi.current?.reveal(i); };
  useBackClose(open !== null, closeLightbox);
  useBackClose(album, () => setAlbum(false));
  useBackClose(guide, closeGuide);
  useBackClose(!!overPrompt, () => setOverPrompt(null));
  useBackClose(stage === "confirm", () => setStage("gallery"));
  useBackClose(finalAsk, () => setFinalAsk(false));
  useScrollLock(guide || !!overPrompt || finalAsk);
  const albumMin = Math.max(2, Math.min(4, data?.photo_limit ?? 4)); // a few picks are enough for a first spread
  const albumPhotos = useMemo(() => (data?.photos ?? []).filter((p) => selectedSet.has(p.file_id)).sort((a, b) => ids.indexOf(a.file_id) - ids.indexOf(b.file_id)), [data, selectedSet, ids]);
  const submit = async () => {
    setFinalAsk(false);
    setBusy(true);
    try {
      const r = await gapi.submit(slug, { file_ids: ids, notes, extra_ids: extraIds });
      try { navigator.vibrate?.([18, 40, 28]); } catch {}
      pending.current = null;
      localDraft.clear(slug);
      setSent(r); setStage("sent");
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  };

  // ------------------------------------------------------------ render
  if (!meta) return <Screen>{error ? <p className="t-mono text-error">{error}</p> : <span className="t-mono text-faint">…</span>}</Screen>;
  const b = meta.branding;
  const studio = b.studio_name || "Lintas Waktu";
  const langSwitch = (
    <span className="t-mono flex gap-2">
      {(["en", "id"] as Lang[]).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={clsx(lang === l ? "text-current" : "opacity-50")}>{l.toUpperCase()}</button>)}
    </span>
  );

  if (stage === "expired") return (
    <Screen>
      <span className="t-mono text-mute">{studio}</span>
      <h1 className="t-display-sm">{t.expired}</h1>
      <p className="t-body max-w-[40ch]">{t.expiredBody}</p>
    </Screen>
  );

  const introCard = intro !== "gone" && (
    <div role="presentation" onClick={() => setIntro("out")} className={clsx("intro fixed inset-0 z-[70] bg-dark text-on-dark flex flex-col items-center justify-center gap-4 px-8 text-center cursor-pointer", intro === "out" && "intro-out")}>
      {b.logo_url ? (
        <img src={gapi.img(b.logo_url)} alt={studio} className="intro-logo h-24 max-w-[260px] object-contain mb-2" />
      ) : (
        <h1 className="t-display" aria-label={studio}>
          {Array.from(studio).map((ch, i) => (
            <span key={i} className="intro-letter" style={{ animationDelay: `${250 + i * 45}ms` }} aria-hidden>{ch === " " ? " " : ch}</span>
          ))}
        </h1>
      )}
      {b.tagline && <span className="intro-sub t-mono text-on-dark-mute" style={{ animationDelay: "900ms" }}>{b.tagline}</span>}
      <span className="intro-line h-px w-16 mt-2" style={{ background: GOLD }} />
      <span className="intro-sub t-small text-on-dark-mute mt-2" style={{ animationDelay: "1300ms" }}>{t.galleryFor}</span>
      <span className="intro-sub font-serif italic text-[34px] leading-none" style={{ animationDelay: "1400ms" }}>{meta.client_name}</span>
      <span className="intro-sub absolute bottom-10 t-mono text-on-dark-mute" style={{ animationDelay: "1700ms" }}>{t.tapToEnter}</span>
    </div>
  );

  return (
    <>
      {introCard}
      {renderStage()}
    </>
  );

  // Plain function (not a component) so child state — PIN digits, lightbox note — survives re-renders.
  function renderStage() {
  if (error) return <Screen><p className="t-mono text-error">{error}</p></Screen>;
  if (stage === "loading") return <Screen><span className="t-mono text-faint">…</span></Screen>;
  if (stage === "pin") return <PinGate slug={slug} studio={studio} client={meta!.client_name} t={t} onUnlocked={goGallery} langSwitch={langSwitch} />;

  if (!data) return <Screen><span className="t-mono text-faint">…</span></Screen>;

  if (stage === "sent" && sent) {
    const first = data.client_name.split(" ")[0];
    return (
      <Screen>
        <span className="h-14 w-14 rounded-full flex items-center justify-center text-ink text-xl" style={{ background: GOLD }}>✓</span>
        <h1 className="t-display-sm">{t.thanks(first)}</h1>
        <p className="t-body max-w-[44ch]">{t.sentBody(sent.selected_count, sent.extra_count)}</p>
        <p className="t-small text-faint">{t.locked}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {albumPhotos.length >= 2 && <button type="button" onClick={() => setAlbum(true)} className="t-mono text-ink px-6 py-3.5 rounded-full" style={{ background: GOLD }}>{t.albumBtn} →</button>}
          <button type="button" onClick={() => { setFilter("selected"); setStage("gallery"); }} className="action">{t.viewSelection}</button>
        </div>
        <span className="absolute bottom-8 t-wordmark">{studio}</span>
        {album && <AlbumPreview photos={albumPhotos} clientName={data.client_name} studio={studio} t={t.album} onClose={() => setAlbum(false)} />}
      </Screen>
    );
  }

  if (stage === "confirm") {
    const nExtra = extras;
    const toggleExtra = (id: string) => setExtraIds((e) => (e.includes(id) ? e.filter((x) => x !== id) : e.length < nExtra ? [...e, id] : e));
    const chosen = (data.photos ?? []).filter((p) => selectedSet.has(p.file_id));
    return (
      <div className="min-h-dvh flex flex-col">
        <header className="px-5 pt-6 pb-4 flex flex-col gap-2 max-w-[960px] w-full mx-auto">
          <button type="button" onClick={() => setStage("gallery")} className="t-mono text-mute self-start">← {t.back}</button>
          <h1 className="t-display-sm">{t.confirmTitle(count)}</h1>
          <p className="t-body">{nExtra > 0 ? t.confirmBody(limit, nExtra, extraIds.length) : t.confirmBodyNoExtra(count)}</p>
        </header>
        <ul className="px-2 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 max-w-[960px] w-full mx-auto pb-32">
          {chosen.map((p) => {
            const isX = extraIds.includes(p.file_id);
            return (
              <li key={p.file_id}>
                <button type="button" disabled={nExtra === 0} onClick={() => toggleExtra(p.file_id)} className="relative block w-full aspect-[4/5] bg-line overflow-hidden" style={{ outline: `3px solid ${GOLD}`, outlineOffset: -3 }}>
                  <Thumb src={gapi.img(p.thumb_url)} alt="" className="w-full h-full object-cover" />
                  {isX && <span className="absolute left-1.5 bottom-1.5 bg-ink t-mono !text-[9px] px-1.5 py-0.5" style={{ color: GOLD }}>{t.extra}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="fixed inset-x-0 bottom-0 bg-white border-t border-line px-5 py-4 flex flex-col gap-2 items-center">
          <button type="button" disabled={busy || extraIds.length !== nExtra} onClick={() => setFinalAsk(true)} className="w-full max-w-[420px] py-4 t-mono text-ink disabled:opacity-40" style={{ background: GOLD }}>
            {busy ? t.sending : t.confirmSend(count)} →
          </button>
        </div>
        {/* Last stop: sending locks the gallery, so ask once more in plain words */}
        {finalAsk && (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-ink/50 backdrop-blur-[2px] admin-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) setFinalAsk(false); }}>
            <div role="alertdialog" aria-modal="true" aria-labelledby="final-title" className="admin-pop w-full max-w-[420px] bg-white p-6 sm:p-7 flex flex-col gap-4">
              <h2 id="final-title" className="font-serif text-[26px] leading-tight">{t.finalTitle}</h2>
              <p className="t-body">{t.finalBody(count, nExtra)}</p>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button type="button" onClick={() => setFinalAsk(false)} className="t-mono px-5 py-3.5 border border-line text-ink">{t.finalNo}</button>
                <button type="button" autoFocus onClick={submit} className="t-mono px-5 py-3.5 text-ink" style={{ background: GOLD }}>{t.finalYes} →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- gallery
  const deadline = fmt(data.expires_at, lang);
  const readOnly = data.status === "completed";
  const status = full ? t.quotaReached : count === 0 ? t.tapToChoose : extras > 0 ? t.overBy(extras) : count < limit ? t.leftIn(limit - count) : t.packageFull;
  const pct = Math.min(1, count / Math.max(1, limit));
  const filters = [["all", t.all, data.photos.length], ["selected", t.selected, count], ["maybe", t.marked, maybe.length]] as const;

  return (
    <div className="min-h-dvh pb-28 bg-white">
      {data.preview && <div className="bg-ink text-white t-small text-center px-4 py-2">{t.preview}</div>}
      <header className="px-4 pt-5 pb-3 flex items-start justify-between gap-4 max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-serif italic text-[28px] leading-none">{data.client_name}</span>
          <span className="t-small text-mute">{data.photos.length} {t.photos} · {t.choose} {limit}{hard > limit ? ` (${t.upTo} ${hard})` : ""}{deadline ? ` · ${t.until} ${deadline}` : ""}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {langSwitch}
          <button type="button" onClick={() => setGuide(true)} aria-label={t.howItWorks} className="h-11 w-11 border border-line rounded-full t-mono active:scale-95 transition-transform">?</button>
        </div>
      </header>

      {/* Filters stay within reach at the top; the bottom of the screen is left to the photos */}
      <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-line/60">
        <div className="max-w-[1400px] mx-auto px-2 sm:px-4 h-[60px] flex items-center gap-2">
          <div role="tablist" className="flex flex-1 sm:flex-none gap-1 bg-[#efece6] rounded-full p-1">
            {filters.map(([k, l, n]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => { setFilter(k); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={clsx("flex-1 sm:flex-none h-10 px-3 sm:px-5 rounded-full text-[13px] whitespace-nowrap transition-all duration-300 active:scale-95", filter === k ? "bg-white text-ink shadow-[0_1px_4px_rgba(0,0,0,.08)]" : "text-mute")}>
                {l} <span className="tabular-nums opacity-55">{n}</span>
              </button>
            ))}
          </div>
          {/* the album appears once there are a few picks — a small reward for choosing */}
          {count >= albumMin && (
            <button type="button" onClick={() => setAlbum(true)} aria-label={t.albumBtn} className="pick-pop h-11 px-4 rounded-full t-small text-ink flex items-center gap-2 shrink-0 active:scale-95 transition-transform" style={{ background: GOLD }}>
              <span aria-hidden>▤</span><span className="hidden sm:inline">{t.albumBtn}</span>
            </button>
          )}
        </div>
      </nav>

      <div className="px-1 sm:px-3 pt-1 max-w-[1400px] mx-auto">
        <JustifiedGrid items={visible} api={gridApi} renderTile={(p, i, box) => {
          const sel = selectedSet.has(p.file_id);
          const isMaybe = maybeSet.has(p.file_id);
          const isExtra = sel && ids.indexOf(p.file_id) >= limit;
          const dim = (readOnly && !sel) || (!readOnly && full && !sel);
          return (
            <div key={p.file_id} className={clsx("group absolute bg-line overflow-hidden transition-opacity duration-300", dim && "opacity-40")} style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
              <button type="button" disabled={readOnly} aria-pressed={sel} aria-label={p.name} className="absolute inset-0 w-full h-full"
                onClick={() => { if (!sel) try { navigator.vibrate?.(8); } catch {} toggle(p.file_id); }}>
                <Thumb src={gapi.img(p.thumb_url)} alt={p.name} eager={i < 12} className={clsx("absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-[var(--ease-out-soft)]", sel && "scale-[0.93]")} />
                <span className="pointer-events-none absolute inset-0 transition-shadow duration-300" style={{ boxShadow: sel ? `inset 0 0 0 3px ${GOLD}` : "none" }} />
                {sel && <span className="pick-pop absolute left-2 top-2 h-7 w-7 rounded-full flex items-center justify-center text-[13px] font-semibold text-ink shadow" style={{ background: GOLD }}>✓</span>}
                {notes[p.file_id] && <span className="absolute left-10 top-2 h-7 w-7 rounded-full bg-white/90 flex items-center justify-center text-[12px]">✎</span>}
                {isExtra && <span className="absolute left-2 bottom-2 bg-ink t-mono !text-[9px] px-1.5 py-0.5" style={{ color: GOLD }}>{t.extra}</span>}
              </button>
              {!readOnly && !sel && (
                <button type="button" onClick={() => toggleMaybe(p.file_id)} aria-pressed={isMaybe} aria-label={isMaybe ? t.unmark : t.mark}
                  className={clsx("absolute right-0 top-0 h-11 w-11 flex items-center justify-center transition-opacity active:scale-90", !isMaybe && "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100")}>
                  <span className={clsx("h-7 w-7 rounded-full flex items-center justify-center text-[12px] backdrop-blur-sm", isMaybe ? "bg-white text-ink" : "bg-black/30 text-white")}>⚑</span>
                </button>
              )}
              <button type="button" onClick={() => setOpen(i)} aria-label={t.view}
                className="absolute right-0 bottom-0 h-11 w-11 flex items-center justify-center transition-opacity active:scale-90 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                <span className="h-7 w-7 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center text-[13px]">⤢</span>
              </button>
            </div>
          );
        }} />
      </div>
      {visible.length === 0 && <p className="t-body text-center py-16">{t.filterNone}</p>}

      {/* Selection bar: one slim line, always there */}
      {!readOnly && (
        <div className={clsx("fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))] flex justify-center pointer-events-none")}>
          <div className="pointer-events-auto w-full max-w-[460px] bg-ink/95 backdrop-blur text-on-dark rounded-full p-1.5 pl-2 flex items-center gap-3 shadow-[0_14px_36px_-14px_rgba(0,0,0,.55)]">
            <ProgressRing value={pct} over={extras > 0}>
              <span key={count} className="count-nod font-serif text-[17px] leading-none tabular-nums">{count}</span>
            </ProgressRing>
            <div className="flex-1 min-w-0 flex flex-col leading-tight">
              <span className="text-[13px] tabular-nums">{count} / {limit}{extras > 0 && <span className="ml-1" style={{ color: GOLD }}>+{extras}</span>}</span>
              <span className="t-small !text-[12px] text-on-dark-mute truncate" aria-live="polite">{saveState === "offline" ? <span className="text-error">{t.offline}</span> : status}</span>
            </div>
            <button type="button" disabled={count === 0} onClick={openConfirm} className="h-11 px-5 rounded-full t-mono text-ink disabled:opacity-40 active:scale-95 transition-transform shrink-0" style={{ background: GOLD }}>{t.send} →</button>
          </div>
        </div>
      )}

      {/* Guide */}
      {guide && (
        <div className="fixed inset-0 z-50 bg-dark/55 flex items-end sm:items-center justify-center p-3 touch-none overscroll-contain" role="dialog" aria-modal="true">
          <div className="admin-pop w-full max-w-[420px] max-h-[90dvh] overflow-y-auto overscroll-contain touch-pan-y bg-white p-6 flex flex-col gap-4">
            <span className="t-mono text-mute">{t.howItWorks}</span>
            <h2 className="t-display-sm !text-[30px]">{t.guideTitle}</h2>
            <p className="t-body">{t.guideIntro(limit, hard, deadline)}</p>
            <ol className="flex flex-col gap-3">
              {t.steps.map(([h, d], i) => (
                <li key={i} className="flex gap-3"><span className="h-9 w-9 shrink-0 rounded-full bg-[#ece9e2] flex items-center justify-center text-[13px]">{["✓", "⤢", "✎", "⚑", "→"][i]}</span><span className="flex flex-col"><span className="text-[14px] font-medium">{h}</span><span className="t-small text-mute">{d}</span></span></li>
              ))}
            </ol>
            <button type="button" onClick={closeGuide} className="ink-btn w-full">{t.gotIt} →</button>
          </div>
        </div>
      )}

      {/* Over-package prompt */}
      {overPrompt && (
        <div className="fixed inset-0 z-[70] bg-dark/55 flex items-center justify-center p-5 touch-none overscroll-contain" onClick={() => setOverPrompt(null)}>
          <div className="admin-pop w-full max-w-[360px] bg-white p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <span className="t-mono text-mute">{t.packageFull}</span>
            <h2 className="t-display-sm !text-[28px]">{t.overTitle}</h2>
            <p className="t-body">{t.overBody(limit, hard)}</p>
            <button type="button" onClick={() => { const id = overPrompt; setOverPrompt(null); toggle(id, true); }} className="w-full py-3.5 t-mono text-ink" style={{ background: GOLD }}>{t.yesExtra}</button>
            <button type="button" onClick={() => setOverPrompt(null)} className="action w-full">{t.notNow}</button>
          </div>
        </div>
      )}

      {album && <AlbumPreview photos={albumPhotos} clientName={data.client_name} studio={studio} t={t.album} onClose={() => setAlbum(false)} />}
      {open !== null && visible[open] && (
        <Lightbox
          photos={visible}
          index={open}
          onIndex={setOpen}
          onClose={closeLightbox}
          selected={selectedSet.has(visible[open].file_id)}
          marked={maybeSet.has(visible[open].file_id)}
          note={notes[visible[open].file_id] ?? ""}
          readOnly={readOnly}
          full={full}
          t={t}
          onToggle={() => { if (!selectedSet.has(visible[open].file_id)) try { navigator.vibrate?.(8); } catch {} toggle(visible[open].file_id); }}
          onMark={() => toggleMaybe(visible[open].file_id)}
          onNote={(v) => setNote(visible[open].file_id, v)}
        />
      )}
    </div>
  );
  }
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="relative min-h-dvh flex flex-col items-center justify-center text-center gap-5 px-8 bg-white">{children}</div>;
}

function PinGate({ slug, studio, client, t, onUnlocked, langSwitch }: { slug: string; studio: string; client: string; t: Dict; onUnlocked: () => void; langSwitch: React.ReactNode }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async (value = pin) => {
    if (value.length < 4) return;
    setBusy(true); setErr(null);
    try { const r = await gapi.unlock(slug, value); galleryToken.set(slug, r.token); onUnlocked(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Wrong PIN"); setPin(""); }
    finally { setBusy(false); }
  };
  const onChange = (raw: string) => { const v = raw.replace(/\D/g, "").slice(0, 4); setPin(v); if (v.length === 4) go(v); };
  return (
    <Screen>
      <div className="absolute top-5 right-5 text-mute">{langSwitch}</div>
      <span className="t-wordmark">{studio}</span>
      <span className="t-mono text-mute">{t.privateGallery} · {client}</span>
      <p className="t-statement max-w-[24ch]">{t.enterPin}</p>
      <div className="relative flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={clsx("h-16 w-14 flex items-center justify-center text-[28px] font-serif bg-[#f0eee8]", pin.length === i && "outline outline-1 outline-ink")}>{pin[i] ? "•" : ""}</span>
        ))}
        <input autoFocus inputMode="numeric" pattern="\d*" maxLength={4} value={pin} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0" aria-label="PIN" />
      </div>
      {err && <p className="t-small text-error">{err}</p>}
      <button type="button" onClick={() => go()} disabled={busy || pin.length < 4} className="ink-btn w-full max-w-[300px]">{t.openGallery}</button>
      <p className="t-small text-mute max-w-[40ch]">{t.pinHelp}</p>
    </Screen>
  );
}

/** Progress toward the package as a thin ring around the pick count; gold, and full once over. */
function ProgressRing({ value, over, children }: { value: number; over: boolean; children: ReactNode }) {
  const r = 19, c = 2 * Math.PI * r;
  return (
    <span className="relative h-11 w-11 shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="2.5" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - (over ? 1 : value))} style={{ transition: "stroke-dashoffset 600ms var(--ease-out-soft)" }} />
      </svg>
      {children}
    </span>
  );
}

type LbPhoto = { file_id: string; full_url: string; thumb_url: string; name: string };
type Zoom = { s: number; x: number; y: number };
const Z0: Zoom = { s: 1, x: 0, y: 0 };
const SLIDE_GAP = 24; // px between neighbouring photos while swiping
const TAP_MS = 280; // a second tap within this is a double tap

/**
 * Full-screen viewer. Touch: swipe left/right (the next photo slides in with the finger), swipe
 * down to close, double-tap or pinch to zoom, drag to look around while zoomed, single tap to
 * hide/show the controls. Mouse/keyboard: arrows, Esc, double-click to zoom.
 */
function Lightbox({ photos, index, onIndex, onClose, selected, marked, note, readOnly, full, t, onToggle, onMark, onNote }: {
  photos: LbPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void;
  selected: boolean; marked: boolean; note: string; readOnly: boolean; full: boolean; t: Dict;
  onToggle: () => void; onMark: () => void; onNote: (v: string) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0); // horizontal offset of the strip
  const [dy, setDy] = useState(0); // pull-down offset of the current photo
  const [anim, setAnim] = useState(false);
  const [zoom, setZoom] = useState<Zoom>(Z0);
  const [chrome, setChrome] = useState(true);
  const [panelH, setPanelH] = useState(0);
  const busy = useRef(false);
  const g = useRef<null | { mode: "" | "swipe" | "dismiss" | "pan" | "pinch" | "none"; x: number; y: number; t: number; z: Zoom; d0?: number; cx?: number; cy?: number }>(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const tapTimer = useRef(0);
  const touchAt = useRef(0);
  const has = useCallback((i: number) => i >= 0 && i < photos.length, [photos.length]);
  const zoomed = zoom.s > 1.02;

  const size = useCallback(() => { const r = stage.current?.getBoundingClientRect(); return { w: r?.width ?? window.innerWidth, h: r?.height ?? window.innerHeight, l: r?.left ?? 0, t: r?.top ?? 0 }; }, []);
  const clampZoom = useCallback((z: Zoom): Zoom => {
    const { w, h } = size();
    const mx = ((z.s - 1) * w) / 2, my = ((z.s - 1) * h) / 2;
    return { s: z.s, x: Math.max(-mx, Math.min(mx, z.x)), y: Math.max(-my, Math.min(my, z.y)) };
  }, [size]);

  const go = useCallback((d: number) => {
    if (busy.current) return;
    setAnim(true);
    if (!has(index + d)) { setDx(0); return; } // bounce back at the ends
    busy.current = true;
    setDx(-d * (size().w + SLIDE_GAP));
    window.setTimeout(() => { setAnim(false); setDx(0); setZoom(Z0); busy.current = false; onIndex(index + d); }, 260);
  }, [has, index, onIndex, size]);

  // controls take room only while shown; the photo grows into it when they hide
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPanelH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("textarea, input")) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.documentElement.style.overflow = ""; window.removeEventListener("keydown", onKey); window.clearTimeout(tapTimer.current); };
  }, [onClose, go]);

  const toggleZoomAt = (clientX: number, clientY: number) => {
    setAnim(true);
    if (zoomed) { setZoom(Z0); return; }
    const { w, h, l, t: top } = size();
    const s = 2.5, px = clientX - l - w / 2, py = clientY - top - h / 2;
    setZoom(clampZoom({ s, x: px * (1 - s), y: py * (1 - s) }));
  };
  const onTap = (x: number, y: number) => {
    const now = Date.now(), lt = lastTap.current;
    if (now - lt.t < TAP_MS && Math.hypot(x - lt.x, y - lt.y) < 40) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = { t: 0, x: 0, y: 0 };
      toggleZoomAt(x, y);
      return;
    }
    lastTap.current = { t: now, x, y };
    tapTimer.current = window.setTimeout(() => setChrome((c) => !c), TAP_MS);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button, textarea, input, a")) { g.current = null; return; }
    setAnim(false);
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const { w, h, l, t: top } = size();
      g.current = { mode: "pinch", x: 0, y: 0, t: Date.now(), z: zoom, d0: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), cx: (a.clientX + b.clientX) / 2 - l - w / 2, cy: (a.clientY + b.clientY) / 2 - top - h / 2 };
      setDx(0); setDy(0);
      return;
    }
    g.current = { mode: "", x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), z: zoom };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = g.current;
    if (!s) return;
    if (s.mode === "pinch") {
      if (e.touches.length < 2) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const k = Math.max(1, Math.min(4, (s.z.s * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)) / (s.d0 || 1)));
      const r = k / s.z.s;
      setZoom(clampZoom({ s: k, x: s.cx! - (s.cx! - s.z.x) * r, y: s.cy! - (s.cy! - s.z.y) * r }));
      return;
    }
    const mx = e.touches[0].clientX - s.x, my = e.touches[0].clientY - s.y;
    if (!s.mode) {
      if (Math.hypot(mx, my) < 8) return;
      s.mode = zoomed ? "pan" : Math.abs(mx) > Math.abs(my) ? "swipe" : my > 0 ? "dismiss" : "none";
    }
    if (s.mode === "pan") setZoom(clampZoom({ s: s.z.s, x: s.z.x + mx, y: s.z.y + my }));
    else if (s.mode === "swipe") setDx(!has(index + (mx < 0 ? 1 : -1)) ? mx * 0.3 : mx); // resist at the ends
    else if (s.mode === "dismiss") setDy(Math.max(0, my));
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = g.current;
    touchAt.current = Date.now();
    if (!s) return;
    if (e.touches.length > 0) { if (s.mode !== "pinch") g.current = null; return; }
    g.current = null;
    const ch = e.changedTouches[0];
    if (s.mode === "pinch") { if (zoom.s < 1.05) { setAnim(true); setZoom(Z0); } return; }
    if (s.mode === "swipe") {
      const fast = Math.abs(dx) / Math.max(1, Date.now() - s.t) > 0.5;
      if (Math.abs(dx) > Math.min(90, size().w * 0.2) || (fast && Math.abs(dx) > 30)) go(dx < 0 ? 1 : -1);
      else { setAnim(true); setDx(0); }
      return;
    }
    if (s.mode === "dismiss") {
      if (dy > 110) onClose();
      else { setAnim(true); setDy(0); }
      return;
    }
    if (!s.mode && ch) onTap(ch.clientX, ch.clientY);
  };
  // mouse: click toggles the controls, double-click zooms (touch already handled above)
  const onClick = (e: React.MouseEvent) => {
    if (Date.now() - touchAt.current < 700 || (e.target as HTMLElement).closest("button")) return;
    onTap(e.clientX, e.clientY);
  };
  const onMouseMove = (e: React.MouseEvent) => { if (zoomed && e.buttons === 1) setZoom((z) => clampZoom({ s: z.s, x: z.x + e.movementX, y: z.y + e.movementY })); };

  const p = photos[index];
  const fade = Math.min(dy / 380, 0.75);
  const showChrome = chrome && !dy && !zoomed;
  const ease = "var(--ease-out-soft)";
  return (
    <div className="fixed inset-0 z-[60] text-on-dark select-none" role="dialog" aria-modal="true" aria-label={p.name}>
      <div className="absolute inset-0 bg-dark" style={{ opacity: 1 - fade, transition: anim ? `opacity 260ms ${ease}` : undefined }} />

      <div ref={stage} className="absolute inset-x-0 overflow-hidden" style={{ top: showChrome ? 64 : 0, bottom: showChrome ? panelH : 0, touchAction: "none", transition: `top 300ms ${ease}, bottom 300ms ${ease}` }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd} onClick={onClick} onMouseMove={onMouseMove}>
        {[-1, 0, 1].map((o) => {
          const i = index + o;
          if (!has(i)) return null;
          const q = photos[i];
          const shrink = o === 0 && dy ? 1 - Math.min(dy / 1600, 0.15) : 1;
          return (
            <div key={q.file_id} className="absolute inset-0" style={{ transform: `translate3d(calc(${o * 100}% + ${o * SLIDE_GAP + dx}px), ${o === 0 ? dy : 0}px, 0) scale(${shrink})`, transition: anim ? `transform 260ms ${ease}` : "none" }}>
              <Slide photo={q} zoom={o === 0 ? zoom : Z0} anim={anim} />
            </div>
          );
        })}
      </div>

      {/* top bar */}
      <div className={clsx("absolute inset-x-0 top-0 h-[64px] px-3 flex items-center justify-between t-mono transition-all duration-300", showChrome ? "opacity-100" : "opacity-0 -translate-y-3 pointer-events-none")}>
        <button type="button" onClick={onClose} aria-label={t.close} className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-[22px] text-on-dark active:scale-90 active:bg-white/20 transition-transform">✕</button>
        <span className="text-on-dark-mute tabular-nums">{String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
        {!readOnly && !selected ? (
          <button type="button" onClick={onMark} aria-pressed={marked} className={clsx("h-12 pl-4 pr-5 rounded-full flex items-center gap-2 text-[13px] active:scale-95 transition-transform", marked ? "bg-white text-ink" : "bg-white/10 text-on-dark")}><span className="text-[18px] leading-none">⚑</span>{marked ? t.unmark : t.mark}</button>
        ) : <span className="w-12" />}
      </div>

      {/* arrows for mouse users; touch uses swipes */}
      {showChrome && has(index - 1) && <button type="button" onClick={() => go(-1)} aria-label="Previous" className="hidden [@media(hover:hover)]:flex absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-[20px]">‹</button>}
      {showChrome && has(index + 1) && <button type="button" onClick={() => go(1)} aria-label="Next" className="hidden [@media(hover:hover)]:flex absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-[20px]">›</button>}

      {/* bottom panel */}
      <div ref={panel} className={clsx("absolute inset-x-0 bottom-0 transition-all duration-300", showChrome ? "opacity-100" : "opacity-0 translate-y-4 pointer-events-none")}>
        <div className="px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 flex flex-col gap-3 max-w-[560px] w-full mx-auto">
          <span className="t-mono text-on-dark-mute text-center">{p.name}</span>
          {selected && !readOnly && (
            <label className="flex flex-col gap-1.5 bg-white/10 rounded-2xl p-3">
              <span className="t-mono text-on-dark-mute">{t.noteFor}</span>
              <textarea value={note} onChange={(e) => onNote(e.target.value)} rows={2} placeholder={t.notePh} className="bg-transparent text-on-dark text-[16px] outline-none resize-none placeholder:text-on-dark-mute/60" />
            </label>
          )}
          {!readOnly && (
            <button type="button" disabled={!selected && full} onClick={onToggle}
              className={clsx("w-full h-[52px] t-mono rounded-full transition-all duration-300 active:scale-[0.98] disabled:opacity-40", selected ? "text-ink" : "border border-on-dark/40 text-on-dark")} style={selected ? { background: GOLD } : undefined}>
              {selected ? <span key="y" className="pick-pop inline-block">✓ {t.chosen}</span> : t.chooseThis}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** One photo in the viewer: the (cached) thumbnail right away, the full size fading in over it. */
function Slide({ photo, zoom, anim }: { photo: LbPhoto; zoom: Zoom; anim: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="absolute inset-0 px-1" style={{ transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.s})`, transition: anim ? "transform 260ms var(--ease-out-soft)" : "none" }}>
      <div className="relative w-full h-full">
        <img src={gapi.img(photo.thumb_url)} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full object-contain" />
        <img src={gapi.img(photo.full_url)} alt={photo.name} draggable={false} onLoad={() => setLoaded(true)}
          className={clsx("absolute inset-0 w-full h-full object-contain transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")} />
      </div>
    </div>
  );
}

type Box = { x: number; y: number; w: number; h: number };
type GridApi = { reveal: (index: number) => void };
const photoRatio = (p: GPhoto) => Math.max(0.5, Math.min(2.4, p.width > 0 && p.height > 0 ? p.width / p.height : 1.5));

/**
 * Justified rows (each row fills the width, photos keep their own shape — portrait narrow,
 * landscape wide), and only the rows near the viewport are mounted: with ~800 photos, keeping
 * every tile and its decoded image alive makes iOS Safari stutter and can reload the tab.
 */
function JustifiedGrid({ items, api, renderTile }: { items: GPhoto[]; api?: React.Ref<GridApi>; renderTile: (item: GPhoto, index: number, box: Box) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 0]); // [first, last) row

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (!width) return null;
    const target = width < 640 ? 150 : width < 1024 ? 210 : 270;
    const gap = width < 640 ? 4 : 6;
    const maxPer = width < 640 ? 3 : 4;
    const rows: { top: number; h: number; boxes: (Box & { i: number })[] }[] = [];
    let top = 0, start = 0, sum = 0;
    const close = (end: number, h: number, stretch: boolean) => {
      let x = 0;
      const boxes = [];
      for (let i = start; i < end; i++) {
        const w = i === end - 1 && stretch ? width - x : Math.round(photoRatio(items[i]) * h);
        boxes.push({ i, x, y: top, w, h: Math.round(h) });
        x += w + gap;
      }
      rows.push({ top, h: Math.round(h), boxes });
      top += Math.round(h) + gap;
    };
    for (let i = 0; i < items.length; i++) {
      const r = photoRatio(items[i]);
      if (i - start === maxPer) { close(i, (width - gap * (maxPer - 1)) / sum, true); start = i; sum = 0; } // never more than maxPer in a row
      const n = i - start + 1;
      const hWith = (width - gap * (n - 1)) / (sum + r);
      if (n > 1 && hWith < target) {
        // row is full: keep this photo if that lands closer to the target height, else start a new row with it
        const hWithout = (width - gap * (n - 2)) / sum;
        if (Math.abs(hWith - target) < Math.abs(hWithout - target)) { sum += r; close(i + 1, hWith, true); start = i + 1; sum = 0; continue; }
        close(i, hWithout, true); start = i; sum = 0;
      }
      sum += r;
    }
    if (start < items.length) {
      const n = items.length - start;
      const h = Math.min(target, (width - gap * (n - 1)) / sum); // last row: not stretched past its natural size
      close(items.length, h, h < target);
    }
    return { rows, height: Math.max(0, top - gap) };
  }, [items, width]);

  // one screen of rows above and two below stay mounted, so a fast flick never shows gaps for long
  useEffect(() => {
    const el = ref.current;
    if (!el || !layout) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const top = el.getBoundingClientRect().top, vh = window.innerHeight;
      const a = -top - vh, b = -top + 2 * vh;
      let first = 0;
      while (first < layout.rows.length && layout.rows[first].top + layout.rows[first].h < a) first++;
      let last = first;
      while (last < layout.rows.length && layout.rows[last].top < b) last++;
      setRange((r) => (r[0] === first && r[1] === last ? r : [first, last]));
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [layout]);

  // after the viewer closes, bring the last photo seen into view if the client browsed away from it
  useImperativeHandle(api, () => ({
      reveal: (index: number) => {
        const el = ref.current;
        const box = layout?.rows.flatMap((r) => r.boxes).find((b) => b.i === index);
        if (!el || !box) return;
        const y = el.getBoundingClientRect().top + window.scrollY + box.y;
        if (y < window.scrollY + 70 || y + box.h > window.scrollY + window.innerHeight - 90) window.scrollTo({ top: Math.max(0, y - window.innerHeight / 3) });
      },
  }), [layout]);

  const shown = layout ? layout.rows.slice(range[0], Math.max(range[1], range[0] === 0 ? 6 : 0)).flatMap((r) => r.boxes) : [];
  return (
    <div ref={ref} className="relative w-full" style={{ height: layout?.height ?? 0 }}>
      {shown.map((b) => renderTile(items[b.i], b.i, b))}
    </div>
  );
}

function Thumb({ src, alt, eager, className }: { src: string; alt: string; eager?: boolean; className?: string }) {
  const [state, setState] = useState<"wait" | "ok" | "retry" | "fail">("wait");
  const url = state === "retry" ? `${src}&r=1` : src;
  return (
    <>
      {state !== "ok" && <span aria-hidden className={clsx("absolute inset-0 bg-line", state !== "fail" && "tile-wait")} />}
      <img
        src={url}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setState("ok")}
        onError={() => setState((s) => (s === "wait" ? "retry" : "fail"))}
        className={clsx(className, "transition-opacity duration-500", state === "ok" ? "opacity-100" : "opacity-0")}
      />
    </>
  );
}
