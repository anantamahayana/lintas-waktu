"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { gapi, galleryToken, GalleryError, type GalleryData, type GalleryMeta } from "@/lib/gallery-api";
import { T, type Dict, type Lang } from "./i18n";

type Filter = "all" | "selected" | "maybe";
type Stage = "loading" | "pin" | "gallery" | "confirm" | "sent" | "expired";
type IntroPhase = "in" | "out" | "gone";
const INTRO_MS = 2600;

const GOLD = "#c9a84c";

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
  const [guide, setGuide] = useState(false);
  const [overPrompt, setOverPrompt] = useState<string | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [sent, setSent] = useState<{ selected_count: number; extra_count: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadGallery = useCallback(async () => {
    try {
      const d = await gapi.load(slug);
      setData(d);
      setIds(d.selected_ids);
      setNotes(d.notes);
      setMaybe(d.maybe_ids);
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

  // 2. autosave draft (debounced) — not in preview, not when completed
  const dirty = useRef(false);
  const [saveState, setSaveState] = useState<"" | "saving" | "saved" | "offline">("");
  useEffect(() => {
    if (!data || data.preview || data.status === "completed" || stage === "sent") return;
    if (!dirty.current) return;
    const h = setTimeout(() => {
      setSaveState("saving");
      gapi.draft(slug, { file_ids: ids, notes, maybe_ids: maybe }).then(() => setSaveState("saved")).catch(() => setSaveState("offline"));
    }, 800);
    return () => clearTimeout(h);
  }, [ids, notes, maybe, data, slug, stage]);

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
    dirty.current = true;
    if (selectedSet.has(id)) { setIds((s) => s.filter((x) => x !== id)); return; }
    if (full) return;
    if (count >= limit && !force) { setOverPrompt(id); return; }
    setIds((s) => [...s, id]);
    setMaybe((m) => m.filter((x) => x !== id));
  };
  const toggleMaybe = (id: string) => { dirty.current = true; setMaybe((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id])); };
  const setNote = (id: string, v: string) => { dirty.current = true; setNotes((n) => { const c = { ...n }; if (v.trim()) c[id] = v; else delete c[id]; return c; }); };

  const openConfirm = () => { setExtraIds(ids.slice(limit)); setStage("confirm"); };
  const [finalAsk, setFinalAsk] = useState(false);
  const submit = async () => {
    setFinalAsk(false);
    setBusy(true);
    try {
      const r = await gapi.submit(slug, { file_ids: ids, notes, extra_ids: extraIds });
      try { navigator.vibrate?.([18, 40, 28]); } catch {}
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
        <button type="button" onClick={() => { setFilter("selected"); setStage("gallery"); }} className="action">{t.viewSelection}</button>
        <span className="absolute bottom-8 t-wordmark">{studio}</span>
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
  const pct = Math.min(100, (count / Math.max(1, limit)) * 100);

  return (
    <div className="min-h-dvh pb-[150px] bg-white">
      {data.preview && <div className="bg-ink text-white t-small text-center px-4 py-2">{t.preview}</div>}
      <header className="px-4 pt-4 pb-3 flex items-start justify-between gap-4 max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-1">
          <span className="font-serif italic text-[26px] leading-none">{data.client_name}</span>
          <span className="t-small text-mute">{data.photos.length} {t.photos} · {t.choose} {limit}{hard > limit ? ` (${t.upTo} ${hard})` : ""}{deadline ? ` · ${t.until} ${deadline}` : ""}</span>
        </div>
        <div className="flex items-center gap-4">
          {langSwitch}
          <button type="button" onClick={() => setGuide(true)} aria-label={t.howItWorks} className="h-9 w-9 border border-line rounded-full t-mono">?</button>
        </div>
      </header>

      <ul className="px-1.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-w-[1200px] mx-auto">
        {visible.map((p, i) => {
          const sel = selectedSet.has(p.file_id);
          const isMaybe = maybeSet.has(p.file_id);
          const isExtra = sel && ids.indexOf(p.file_id) >= limit;
          const dim = (readOnly && !sel) || (!readOnly && full && !sel);
          return (
            <li key={p.file_id} className={clsx("relative aspect-[4/5] bg-line overflow-hidden transition-opacity duration-300", dim && "opacity-40")}>
              <button type="button" disabled={readOnly} onClick={() => toggle(p.file_id)} aria-pressed={sel} className="absolute inset-0 w-full h-full">
                <Thumb src={gapi.img(p.thumb_url)} alt={p.name} eager={i < 8} className={clsx("w-full h-full object-cover transition-transform duration-500", sel && "scale-[0.94]")} />
                <span className="pointer-events-none absolute inset-0 transition-colors duration-300" style={{ boxShadow: sel ? `inset 0 0 0 3px ${GOLD}` : "none" }} />
                {sel && <span className="absolute left-2 top-2 h-6 w-6 rounded-full flex items-center justify-center text-[12px] font-semibold text-ink" style={{ background: GOLD }}>✓</span>}
                {notes[p.file_id] && <span className="absolute left-10 top-2 h-6 w-6 rounded-full bg-white/90 flex items-center justify-center text-[11px]">✎</span>}
                {isExtra && <span className="absolute left-2 bottom-2 bg-ink t-mono !text-[9px] px-1.5 py-0.5" style={{ color: GOLD }}>{t.extra}</span>}
              </button>
              {!readOnly && !sel && (
                <button type="button" onClick={() => toggleMaybe(p.file_id)} aria-pressed={isMaybe} aria-label={isMaybe ? t.unmark : t.mark} className={clsx("absolute right-2 top-2 h-8 w-8 rounded-full flex items-center justify-center text-[12px] transition-opacity", isMaybe ? "bg-ink text-white" : "bg-white/85 text-ink lg:opacity-0 lg:hover:opacity-100 lg:[li:hover_&]:opacity-100")}>⚑</button>
              )}
              <button type="button" onClick={() => setOpen(i)} aria-label="⤢" className="absolute right-2 bottom-2 h-8 w-8 rounded-full bg-white/85 flex items-center justify-center text-[12px] lg:opacity-0 lg:[li:hover_&]:opacity-100 transition-opacity">⤢</button>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && <p className="t-body text-center py-16">{t.filterNone}</p>}

      {/* Sticky selection bar */}
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[720px] bg-ink text-on-dark rounded-[22px] p-3.5 flex flex-col gap-3 shadow-[0_18px_40px_-16px_rgba(0,0,0,.5)]">
            <div className="h-1 rounded-full bg-white/15 overflow-hidden"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: GOLD }} /></div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-serif text-[26px] leading-none">{String(count).padStart(2, "0")} <span className="text-on-dark-mute">/ {String(limit).padStart(2, "0")}</span>{extras > 0 && <span className="text-[15px] ml-1" style={{ color: GOLD }}>+{extras}</span>}</span>
                {/* fixed height so the bar never jumps when the save state appears */}
                <span className="t-small text-on-dark-mute flex h-5 items-center gap-1.5 truncate" aria-live="polite">
                  <span>{status}</span>
                  {saveState && <span className={clsx("transition-opacity", saveState === "offline" ? "text-error" : "opacity-60")}>· {t[saveState]}</span>}
                </span>
              </div>
              <button type="button" disabled={count === 0} onClick={openConfirm} className="t-mono text-ink px-5 py-3 rounded-full disabled:opacity-40" style={{ background: GOLD }}>{t.send} →</button>
            </div>
            <div className="flex gap-1 bg-white/10 rounded-full p-1">
              {([["all", t.all], ["selected", `${t.selected} ${count}`], ["maybe", `${t.marked} ${maybe.length}`]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={clsx("flex-1 t-small py-1.5 rounded-full transition-colors", filter === k ? "bg-white text-ink" : "text-on-dark-mute")}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      {guide && (
        <div className="fixed inset-0 z-50 bg-dark/55 flex items-end sm:items-center justify-center p-3" onClick={() => { setGuide(false); sessionStorage.setItem(`lw_guide_${slug}`, "1"); }}>
          <div className="w-full max-w-[420px] bg-white p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <span className="t-mono text-mute">{t.howItWorks}</span>
            <h2 className="t-display-sm !text-[30px]">{t.guideTitle}</h2>
            <p className="t-body">{t.guideIntro(limit, hard, deadline)}</p>
            <ol className="flex flex-col gap-3">
              {t.steps.map(([h, d], i) => (
                <li key={i} className="flex gap-3"><span className="h-8 w-8 shrink-0 rounded-full bg-[#ece9e2] flex items-center justify-center text-[12px]">{["✓", "⤢", "✎", "⚑", "→"][i]}</span><span className="flex flex-col"><span className="text-[14px] font-medium">{h}</span><span className="t-small text-mute">{d}</span></span></li>
              ))}
            </ol>
            <button type="button" onClick={() => { setGuide(false); sessionStorage.setItem(`lw_guide_${slug}`, "1"); }} className="ink-btn w-full">{t.gotIt} →</button>
          </div>
        </div>
      )}

      {/* Over-package prompt */}
      {overPrompt && (
        <div className="fixed inset-0 z-50 bg-dark/55 flex items-center justify-center p-5" onClick={() => setOverPrompt(null)}>
          <div className="w-full max-w-[360px] bg-white p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <span className="t-mono text-mute">{t.packageFull}</span>
            <h2 className="t-display-sm !text-[28px]">{t.overTitle}</h2>
            <p className="t-body">{t.overBody(limit, hard)}</p>
            <button type="button" onClick={() => { const id = overPrompt; setOverPrompt(null); toggle(id, true); }} className="w-full py-3.5 t-mono text-ink" style={{ background: GOLD }}>{t.yesExtra}</button>
            <button type="button" onClick={() => setOverPrompt(null)} className="action w-full">{t.notNow}</button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {open !== null && visible[open] && (
        <Lightbox
          photos={visible}
          index={open}
          onIndex={setOpen}
          selected={selectedSet.has(visible[open].file_id)}
          marked={maybeSet.has(visible[open].file_id)}
          note={notes[visible[open].file_id] ?? ""}
          readOnly={readOnly}
          full={full}
          t={t}
          onToggle={() => toggle(visible[open].file_id)}
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

function Lightbox({ photos, index, onIndex, selected, marked, note, readOnly, full, t, onToggle, onMark, onNote }: {
  photos: { file_id: string; full_url: string; name: string }[]; index: number; onIndex: (i: number | null) => void;
  selected: boolean; marked: boolean; note: string; readOnly: boolean; full: boolean; t: Dict;
  onToggle: () => void; onMark: () => void; onNote: (v: string) => void;
}) {
  const start = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const [dragX, setDragX] = useState(0); // finger offset while swiping
  const step = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);
  // Preload neighbours so the next swipe shows a sharp photo immediately
  useEffect(() => {
    [index - 1, index + 1].forEach((i) => { const q = photos[(i + photos.length) % photos.length]; if (q) { const im = new Image(); im.src = gapi.img(q.full_url); } });
  }, [index, photos]);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1 || (e.target as HTMLElement).closest("button, textarea, input, a")) { start.current = null; return; }
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s || e.touches.length > 1) return;
    const dx = e.touches[0].clientX - s.x, dy = e.touches[0].clientY - s.y;
    if (!s.axis) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; }
    if (s.axis !== "x") return;
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === photos.length - 1);
    setDragX(atEdge ? dx * 0.35 : dx); // resist at the ends of the list
  };
  const onTouchEnd = () => {
    const s = start.current; start.current = null;
    const dx = dragX; setDragX(0);
    if (!s || s.axis !== "x") return;
    if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
  };
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onIndex(null); if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); };
    window.addEventListener("keydown", onKey);
    return () => { document.documentElement.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onIndex, step]);
  const p = photos[index];
  return (
    <div className="fixed inset-0 z-[60] bg-dark text-on-dark flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 t-mono text-on-dark-mute">
        <button type="button" onClick={() => onIndex(null)} className="text-on-dark">✕</button>
        <span>{String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
        {!readOnly && !selected ? <button type="button" onClick={onMark} className={clsx(marked && "text-on-dark")}>⚑ {marked ? t.unmark : t.mark}</button> : <span />}
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 select-none" style={{ touchAction: "pinch-zoom" }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        <img key={p.file_id} src={gapi.img(p.full_url)} alt={p.name} className="max-h-full max-w-full object-contain" style={{ transform: dragX ? `translateX(${dragX}px)` : undefined, transition: dragX ? "none" : "transform 250ms var(--ease-out-soft)" }} />
        <button type="button" aria-label="prev" onClick={() => step(-1)} className="absolute inset-y-0 left-0 w-1/4" />
        <button type="button" aria-label="next" onClick={() => step(1)} className="absolute inset-y-0 right-0 w-1/4" />
      </div>
      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 flex flex-col gap-3 max-w-[640px] w-full mx-auto">
        <span className="t-mono text-on-dark-mute">{p.name}</span>
        {selected && !readOnly && (
          <label className="flex flex-col gap-1.5 bg-white/10 p-3">
            <span className="t-mono text-on-dark-mute">{t.noteFor}</span>
            <textarea value={note} onChange={(e) => onNote(e.target.value)} rows={2} placeholder={t.notePh} className="bg-transparent text-on-dark text-[15px] outline-none resize-none placeholder:text-on-dark-mute/60" />
          </label>
        )}
        {!readOnly && (
          <button type="button" disabled={!selected && full} onClick={onToggle} className={clsx("w-full py-3.5 t-mono rounded-full transition-colors disabled:opacity-40", selected ? "text-ink" : "border border-on-dark/40 text-on-dark")} style={selected ? { background: GOLD } : undefined}>
            {selected ? `✓ ${t.chosen}` : t.chooseThis}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Gallery tile image. On a cold server cache every thumbnail is a Google Drive round-trip,
 * so tiles can sit empty for seconds — show a breathing placeholder until the bytes arrive
 * and fade the photo in; retry once if the request drops. Without this, slow tiles read as
 * "missing photos".
 */
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
