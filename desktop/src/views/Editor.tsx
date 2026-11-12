import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ask, tell } from "../lib/ask";
import type { Design } from "../App";
import { lowResWarnings, pageNo, toSpreads } from "../lib/export";
import { frameRectMm } from "../lib/frames";
import { Icon } from "../lib/icons";
import { runCommand, useCommands } from "../lib/keys";
import { addPage, applyTpl, clearFrame, countsFor, FONTS, isEmpty, joinPages, layPages, moveSheet, patchPage, removePhoto, replacePhoto, setCount, shuffleTemplates, splitPages, swapPhotos, templatesFor, type Album, type Box, type LaidPage, type PageCfg, type TextBox, type Tpl } from "../lib/layout";
import type { Photo } from "../lib/photos";
import { CENTER, effectiveDpi, spreadMm, type Placement, type Preset } from "../lib/print";
import { MiniSheet, Overview } from "./Overview";
import { Btn, IconBtn, NumField, Row, Section, Seg, StatusBar } from "./Shell";
import { Sheet, type TextSel } from "./Sheet";

type Props = {
  photos: Photo[];
  design: Design;
  commit: (d: Design, replace?: boolean) => void;
  canUndo: boolean;
  preset: Preset;
  setPreset: (p: Preset) => void;
  custom: Tpl[];
  panels: boolean;
  /** Lets the template editor (owned by the app) put a new template on the selected page. */
  registerTemplateUse: (fn: ((t: Tpl) => void) | null) => void;
};

/** Shared by the editor and the export screen: lay the album out for a preset. */
export function useLaidPages(photos: Photo[], design: Design, preset: Preset, custom: Tpl[]) {
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const pages = useMemo(() => {
    const m = (preset.marginPct / 100) * preset.pageWmm, g = (preset.gapPct / 100) * preset.pageWmm;
    const cw = preset.pageWmm - 2 * m, sw = 2 * preset.pageWmm - 2 * m, ch = preset.pageHmm - 2 * m;
    const aspect = (id: string) => { const p = byId.get(id); return p && p.w ? p.w / p.h : 1.5; };
    return layPages(design.album, aspect, { page: cw / ch, sheet: sw / ch, gapPage: g / cw, gapSheet: g / sw });
    // `custom` is read through the template registry: lay out again when the user's templates change.
  }, [design.album, byId, preset.marginPct, preset.gapPct, preset.pageWmm, preset.pageHmm, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  return { byId, pages };
}

const PX_PER_MM = 96 / 25.4;
const STEPS = [0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4];
type Tool = "select" | "hand";

/** Layout editor (Figma page 05): tool rail, photo tray, canvas with options bar and filmstrip, properties. */
export function Editor({ photos, design, commit, preset, setPreset, custom, panels, registerTemplateUse }: Props) {
  const { album, place } = design;
  const { byId, pages } = useLaidPages(photos, design, preset, custom);
  const spreads = useMemo(() => toSpreads(pages), [pages]);
  const [overview, setOverview] = useState(false);
  const [si, setSi] = useState(0);
  const [sel, setSel] = useState("");
  const [selText, setSelText] = useState<TextSel>(null);
  const [guides, setGuides] = useState(true);
  const [seed, setSeed] = useState(1);
  const [clip, setClip] = useState<Pick<PageCfg, "tpl" | "free" | "texts" | "bg" | "stroke"> & { n: number; spread: boolean } | null>(null);
  const [tab, setTab] = useState<"props" | "album">("props");
  const [tool, setTool] = useState<Tool>("select");
  const [spaceHand, setSpaceHand] = useState(false);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [view, setView] = useState({ w: 800, h: 600 });
  const [stripDrag, setStripDrag] = useState<{ from: number; over: number } | null>(null);
  const sliding = useRef(false);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const pan = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  /** Frame whose photo is being moved inside it (double-click a photo, Enter to finish). */
  const [cropId, setCropId] = useState("");
  useEffect(() => { if (cropId && cropId !== sel) setCropId(""); }, [sel, cropId]);

  const s = Math.min(si, Math.max(0, spreads.length - 1));
  const spread = spreads[s];
  const inAlbum = useMemo(() => new Set(album.order), [album.order]);
  const anyPicked = useMemo(() => photos.some((p) => p.pick === true), [photos]);
  const [trayAll, setTrayAll] = useState(!anyPicked);
  const [q, setQ] = useState("");
  const tray = useMemo(() => photos.filter((p) => (trayAll || p.pick === true) && !inAlbum.has(p.id) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))), [photos, inAlbum, trayAll, q]);
  const blanks = useMemo(() => album.order.filter(isEmpty).length, [album.order]);
  const warnings = useMemo(() => lowResWarnings(pages, byId, place, preset), [pages, byId, place, preset]);
  const lowres = useMemo(() => new Map(warnings.map((w) => [w.id, w.dpi])), [warnings]);
  const warnPages = useMemo(() => new Set(warnings.map((w) => w.page)), [warnings]);
  const openNotes = album.pages.filter((p) => p.note && !p.noteDone).length;

  const textPage = selText ? pages[selText.page] : null;
  const selPage: LaidPage | null = textPage || (sel && pages.find((p) => p.ids.includes(sel))) || spread?.left || (spread?.right?.side === 1 ? spread.right : null);
  const joined = selPage?.side === "both";
  const selPhoto = sel ? byId.get(sel) : undefined;
  const selOnSpread = !!sel && !!selPage && (selPage === spread?.left || selPage === spread?.right);
  const crop = cropId && cropId === sel && selOnSpread ? cropId : "";
  const tb: TextBox | undefined = selText ? pages[selText.page]?.cfg.texts?.find((x) => x.id === selText.id) : undefined;

  const setAlbum = (a: Album, replace = false) => { if (a !== album) commit({ ...design, album: a }, replace); };
  const setPage = (i: number, patch: Partial<PageCfg>, replace = false) => setAlbum(patchPage(album, i, patch), replace);
  const setPlace = (id: string, patch: Partial<Placement>) => {
    commit({ ...design, place: { ...place, [id]: { ...(place[id] ?? CENTER), ...patch } } }, sliding.current);
    sliding.current = true;
  };
  const endSlide = () => { sliding.current = false; };
  const setText = (page: number, id: string, patch: Partial<TextBox>, replace = false) =>
    setPage(page, { texts: (album.pages[page].texts ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }, replace);
  const textSlide = (patch: Partial<TextBox>) => { if (selText) { setText(selText.page, selText.id, patch, sliding.current); sliding.current = true; } };
  const deselect = () => { setSel(""); setSelText(null); };

  // ---- zoom & pan ----
  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const measure = () => setView({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [overview, panels]);
  const sheetMm = spreadMm(preset);
  const fitW = Math.max(200, Math.min(view.w - 96, (view.h - 112) * (sheetMm.w / sheetMm.h)));
  const fitZ = fitW / (sheetMm.w * PX_PER_MM);
  const z = zoom === "fit" ? fitZ : zoom;
  const sheetW = sheetMm.w * PX_PER_MM * z;
  const zoomTo = (next: number | "fit") => setZoom(next === "fit" ? "fit" : Math.min(4, Math.max(0.1, next)));
  const stepZoom = (d: 1 | -1) => { const i = d > 0 ? STEPS.findIndex((x) => x > z + 0.001) : STEPS.length - 1 - [...STEPS].reverse().findIndex((x) => x < z - 0.001); zoomTo(STEPS[Math.max(0, Math.min(STEPS.length - 1, i))] ?? z); };
  const hand = tool === "hand" || spaceHand;

  /** Nudge the selected frame or text by `dx`, `dy` millimetres. */
  const nudge = (dx: number, dy: number) => {
    if (selText && tb && textPage) {
      const k = (textPage.side === "both" ? 2 : 1) * preset.pageWmm;
      setText(selText.page, selText.id, { x: tb.x + dx / k, y: tb.y + dy / preset.pageHmm }, sliding.current);
      return;
    }
    if (crop && selRect) {
      // Crop mode: arrows slide the photo inside its frame by the same distance on paper.
      const ph = byId.get(crop), pl = place[crop] ?? CENTER;
      if (!ph?.w) return;
      const a = ph.w / ph.h, fa = selRect.w / selRect.h, z = Math.max(1, pl.z);
      const w = (a > fa ? a / fa : 1) * z, h = (a > fa ? 1 : fa / a) * z;
      setPlace(crop, { x: w > 1 ? Math.min(1, Math.max(0, pl.x - dx / selRect.w / (w - 1))) : pl.x, y: h > 1 ? Math.min(1, Math.max(0, pl.y - dy / selRect.h / (h - 1))) : pl.y });
      return;
    }
    if (sel && selPage && selOnSpread) {
      const k = (selPage.side === "both" ? 2 : 1) * preset.pageWmm, i = selPage.ids.indexOf(sel);
      const boxes: Box[] = selPage.ids.map((_, j) => {
        const r = frameRectMm(preset, selPage, j), base = preset.bleedMm + (selPage.side === 1 ? preset.pageWmm : 0);
        return { x: (r.x - base) / k, y: (r.y - preset.bleedMm) / preset.pageHmm, w: r.w / k, h: r.h / preset.pageHmm };
      });
      boxes[i] = { ...boxes[i], x: boxes[i].x + dx / k, y: boxes[i].y + dy / preset.pageHmm };
      setPage(selPage.index, { free: boxes }, sliding.current);
    }
  };
  // Arrow presses close together are one undo step.
  const nudgeTimer = useRef(0);
  const nudgeKey = (combo: string) => {
    const step = combo.startsWith("Shift+") ? 5 : 0.5, k = combo.replace("Shift+", "");
    const d: Record<string, [number, number]> = { Left: [-step, 0], Right: [step, 0], Up: [0, -step], Down: [0, step] };
    if (!d[k]) return;
    nudge(...d[k]);
    sliding.current = true;
    clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => { sliding.current = false; }, 500);
  };

  /** Shuffle templates; say why when nothing can change. */
  const shuffle = (only?: number) => {
    const next = shuffleTemplates(album, pages, seed, only);
    setSeed(seed + 1);
    if (next.pages.every((p, i) => p.tpl === album.pages[i].tpl)) {
      void tell(only === undefined
        ? "Tidak ada yang bisa diacak: semua halaman terkunci, diatur manual, atau belum berisi bingkai."
        : "Halaman ini tidak bisa diacak: terkunci, diatur manual, atau tidak ada tata letak lain untuk jumlah foto ini.", "Tidak bisa diacak");
      return;
    }
    setAlbum(next);
  };
  const drop = (onto: string, dragged: string) => {
    if (!dragged || dragged === onto || dragged.startsWith("spread:")) return;
    setAlbum(inAlbum.has(dragged) ? swapPhotos(album, onto, dragged) : replacePhoto(album, onto, dragged));
    setSel(dragged); setSelText(null);
  };
  const addText = () => {
    const pg = selPage ?? pages[0];
    if (!pg) return;
    const t: TextBox = { id: Date.now().toString(36), text: "Teks baru", font: "Cormorant Garamond", sizeMm: 8, color: "#1f1e1c", align: "center", x: 0.15, y: 0.42, w: 0.7, h: 0.12 };
    setPage(pg.index, { texts: [...(pg.cfg.texts ?? []), t] });
    setSel(""); setSelText({ page: pg.index, id: t.id }); setTab("props");
    setTimeout(() => textArea.current?.select(), 50);
  };
  const dupText = () => {
    if (!tb || !selText) return;
    const t = { ...tb, id: Date.now().toString(36), x: tb.x + 0.02, y: tb.y + 0.02 };
    setPage(selText.page, { texts: [...(album.pages[selText.page].texts ?? []), t] });
    setSelText({ page: selText.page, id: t.id });
  };
  const copyLayout = () => selPage && setClip({ tpl: selPage.tpl?.id, free: selPage.cfg.free, texts: selPage.cfg.texts, bg: selPage.cfg.bg, stroke: selPage.cfg.stroke, n: selPage.ids.length, spread: joined });
  const pasteLayout = () => {
    if (!clip || !selPage) return;
    if (clip.spread !== joined) { void tell(clip.spread ? "Tata letak yang disalin untuk panorama dua halaman; tempel ke spread yang juga panorama." : "Tata letak yang disalin untuk satu halaman; tempel ke halaman biasa, bukan panorama."); return; }
    let a = clip.n === selPage.ids.length ? album : setCount(album, selPage.index, clip.n);
    if (a.pages[selPage.index]?.n !== clip.n) { void tell("Tata letak tidak bisa ditempel: jumlah foto halaman ini tidak bisa diubah (halaman lain terkunci)."); return; }
    a = patchPage(a, selPage.index, { tpl: clip.tpl, free: clip.free, texts: clip.texts?.map((x) => ({ ...x, id: x.id + Date.now().toString(36) })), bg: clip.bg, stroke: clip.stroke });
    setAlbum(a);
  };
  const deleteSel = () => {
    if (selText && tb) { setPage(selText.page, { texts: (album.pages[selText.page].texts ?? []).filter((x) => x.id !== tb.id) }); setSelText(null); return; }
    if (sel && selOnSpread) { setAlbum(removePhoto(album, sel)); setSel(""); }
  };
  const deleteSpread = async () => {
    if (!spread) return;
    const ids = [spread.left, spread.right].flatMap((p) => (p && p.side !== "tail" ? p.ids : []));
    if (!ids.length || !(await ask(`Spread halaman ${s * 2 + 1}–${s * 2 + 2} dihapus. Fotonya kembali ke panel Foto. Bisa diurungkan (Ctrl+Z).`, "Hapus spread", "Batal", { title: "Hapus spread?", danger: true }))) return;
    setAlbum(ids.reduce((a, id) => removePhoto(a, id), album)); deselect();
  };
  const toggleJoin = () => { if (!selPage) return; setAlbum(joined ? splitPages(album, selPage.index) : joinPages(album, selPage.side === 1 ? selPage.index - 1 : selPage.index)); setSel(""); };
  const addFrame = () => { if (!selPage || joined) return; const n = selPage.ids.length + 1; const a = setCount(album, selPage.index, n); if (a === album) void tell("Bingkai tidak bisa ditambah di halaman ini (maksimal 12, atau halaman lain terkunci)."); else setAlbum(a); };

  const keyState = { selText, sel, tb };
  void keyState;
  useCommands({
    "e.select": { run: () => setTool("select"), checked: tool === "select" && !spaceHand },
    "e.hand": { run: (c) => { if (c === "Space") setSpaceHand(true); else setTool(tool === "hand" ? "select" : "hand"); }, up: () => setSpaceHand(false), checked: hand, enabled: !overview },
    "e.text": { run: addText, enabled: !overview && !!pages.length },
    "e.frame": { run: addFrame, enabled: !overview && !!selPage && !joined },
    "e.nudge": { run: nudgeKey, enabled: !overview && (!!selText || selOnSpread) },
    "e.prev": { run: () => { setSi(Math.max(0, s - 1)); deselect(); }, enabled: s > 0 },
    "e.next": { run: () => { setSi(Math.min(spreads.length - 1, s + 1)); deselect(); }, enabled: s < spreads.length - 1 },
    "e.overview": { run: () => setOverview((o) => !o), checked: overview },
    "e.shuffle": { run: () => selPage && shuffle(selPage.index), enabled: !!selPage && !selPage.cfg.locked },
    "e.shuffleAll": { run: () => shuffle() },
    "e.lock": { run: () => selPage && setPage(selPage.index, { locked: !selPage.cfg.locked }), enabled: !!selPage, checked: !!selPage?.cfg.locked },
    "e.join": { run: toggleJoin, enabled: !!selPage, checked: joined },
    "e.delete": { run: deleteSel, enabled: !!tb || selOnSpread },
    "e.edit": { run: () => { if (tb) { setTab("props"); setTimeout(() => textArea.current?.focus(), 30); } else setCropId(crop ? "" : sel); }, enabled: !!tb || (selOnSpread && !!selPhoto?.thumb) },
    "e.dup": { run: dupText, enabled: !!tb },
    "e.copyLayout": { run: copyLayout, enabled: !!selPage },
    "e.pasteLayout": { run: pasteLayout, enabled: !!clip && !!selPage },
    "e.newSpread": { run: () => { setAlbum(addPage(addPage(album))); setSi(spreads.length); deselect(); } },
    "e.deleteSpread": { run: () => void deleteSpread(), enabled: !!spread && spreads.length > 1 },
    "e.guides": { run: () => setGuides((g) => !g), checked: guides },
    "e.zoomIn": { run: () => stepZoom(1), enabled: !overview },
    "e.zoomOut": { run: () => stepZoom(-1), enabled: !overview },
    "e.fit": { run: () => zoomTo("fit"), enabled: !overview },
    "e.actual": { run: () => zoomTo(1), enabled: !overview },
    "e.esc": { run: () => { if (crop) setCropId(""); else if (overview) setOverview(false); else deselect(); } },
  });
  const useRef2 = useRef<(t: Tpl) => void>(() => {});
  useRef2.current = (t: Tpl) => { if (selPage && !!t.spread === joined) setAlbum(applyTpl(album, selPage.index, t)); };
  useEffect(() => { registerTemplateUse((t) => useRef2.current(t)); return () => registerTemplateUse(null); }, [registerTemplateUse]);

  const selRect = selOnSpread && selPage?.tpl && selPhoto ? frameRectMm(preset, selPage, selPage.ids.indexOf(sel)) : null;
  const selDpi = selRect && selPhoto?.w ? Math.round(effectiveDpi(selPhoto.w, selPhoto.h, selRect, place[sel] ?? CENTER)) : 0;
  const selPl = place[sel] ?? CENTER;
  const pageLabel = selPage ? (joined ? `halaman ${pageNo(selPage)}–${pageNo(selPage) + 1}` : `halaman ${pageNo(selPage)}`) : "";
  const slider = (value: number, min: number, max: number, step: number, on: (v: number) => void, show: string) => (
    <div className="slider"><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => on(+e.target.value)} onPointerUp={endSlide} onKeyUp={endSlide} onBlur={endSlide} /><span className="val">{show}</span></div>
  );

  // ---------- options bar (context) ----------
  const optbar = (
    <div className="optbar">
      {tb && selText ? (
        <>
          <span className="ctx"><Icon name="type" size={14} />Teks</span><span className="vdiv" />
          <select value={tb.font} onChange={(e) => setText(selText.page, tb.id, { font: e.target.value })} style={{ width: 190, fontFamily: `"${tb.font}"` }} aria-label="Huruf">
            {FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.family}</option>)}
          </select>
          <NumField value={tb.sizeMm} min={1} max={80} step={0.5} unit="mm" width={78} label="Ukuran huruf" onChange={(v) => setText(selText.page, tb.id, { sizeMm: v })} />
          <span className="vdiv" />
          <IconBtn icon="bold" tip="Tebal" on={!!tb.bold} onClick={() => setText(selText.page, tb.id, { bold: !tb.bold })} />
          <IconBtn icon="italic" tip="Miring" on={!!tb.italic} onClick={() => setText(selText.page, tb.id, { italic: !tb.italic })} />
          <span className="vdiv" />
          {(["left", "center", "right"] as const).map((a) => <IconBtn key={a} icon={`align-${a}`} tip={a === "left" ? "Rata kiri" : a === "center" ? "Tengah" : "Rata kanan"} on={tb.align === a} onClick={() => setText(selText.page, tb.id, { align: a })} />)}
          <span className="vdiv" />
          <input type="color" value={tb.color} aria-label="Warna teks" data-tip="Warna teks" onChange={(e) => textSlide({ color: e.target.value })} onBlur={endSlide} />
          <span className="grow" /><span className="caption">Enter = edit · Esc = selesai</span>
        </>
      ) : selOnSpread && selPhoto ? (
        <>
          <span className="ctx"><Icon name="image" size={14} />{crop ? "Atur foto di bingkai" : "Bingkai foto"}</span><span className="vdiv" />
          <Btn label={crop ? "Selesai" : "Atur foto"} icon={crop ? "check" : "crop"} kind={crop ? "primary" : "secondary"} cmd="e.edit" tip={crop ? "Selesai mengatur (Enter / Esc)" : "Geser foto di dalam bingkai dengan mouse (klik dua kali foto / Enter)"} />
          <span className="vdiv" />
          <span className="lbl">Perbesar</span>{slider(selPl.z, 1, 3, 0.01, (v) => setPlace(sel, { z: v }), `${Math.round(selPl.z * 100)}%`)}
          <span className="vdiv" />
          <IconBtn icon="rotate-ccw" tip="Atur ulang posisi foto" onClick={() => commit({ ...design, place: { ...place, [sel]: CENTER } })} />
          <IconBtn icon="x" tip="Kosongkan bingkai (foto kembali ke panel)" onClick={() => { setAlbum(clearFrame(album, sel)); setSel(""); }} />
          <IconBtn icon="trash-2" cmd="e.delete" />
          <span className="grow" /><span className="caption">{crop ? "Seret foto · roda mouse/sudut = perbesar · panah = geser" : <>{pageLabel}{selPage?.tpl ? ` · ${selPage.cfg.free ? "manual" : selPage.tpl.label}` : ""}</>}</span>
        </>
      ) : selOnSpread && isEmpty(sel) ? (
        <>
          <span className="ctx"><Icon name="square-dashed" size={14} />Bingkai kosong</span><span className="caption">Seret foto dari panel kiri ke bingkai ini.</span>
          <span className="grow" /><IconBtn icon="trash-2" cmd="e.delete" />
        </>
      ) : (
        <>
          <span className="ctx"><Icon name="book-open" size={14} />Spread {s + 1}</span><span className="vdiv" />
          <Btn label="Teks" icon="type" kind="ghost" cmd="e.text" />
          <Btn label="Acak halaman" icon="shuffle" kind="ghost" cmd="e.shuffle" />
          <Btn label={joined ? "Pisahkan" : "Panorama"} icon={joined ? "unlink-2" : "link-2"} kind="ghost" cmd="e.join" />
          <span className="grow" /><span className="caption">Klik foto atau teks untuk mengeditnya</span>
        </>
      )}
      <span className="vdiv" /><IconBtn icon="panel-left" cmd="app.panels" />
    </div>
  );

  // ---------- canvas ----------
  const canvasEl = spread ? (
    <div className="canvas-wrap">
      <div ref={canvas} className={`canvas ${hand ? "panning" : ""} ${grabbing ? "grabbing" : ""}`}
        onWheel={(e) => { if (e.ctrlKey) { e.preventDefault(); stepZoom(e.deltaY < 0 ? 1 : -1); } }}
        onPointerDown={(e) => { if (!hand || !canvas.current) return; pan.current = { x: e.clientX, y: e.clientY, sl: canvas.current.scrollLeft, st: canvas.current.scrollTop }; setGrabbing(true); (e.currentTarget as Element).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { const p = pan.current; if (p && canvas.current) { canvas.current.scrollLeft = p.sl - (e.clientX - p.x); canvas.current.scrollTop = p.st - (e.clientY - p.y); } }}
        onPointerUp={() => { pan.current = null; setGrabbing(false); }}
        onClick={(e) => { if (e.target === e.currentTarget || (e.target as Element).classList.contains("canvas-in")) deselect(); }}>
        <div className="canvas-in" style={{ minWidth: "100%", minHeight: "100%", width: sheetW + 96, height: sheetW * (sheetMm.h / sheetMm.w) + 112 }}>
          <div className="sheetbox" style={{ width: sheetW }}>
            <div className="pagenos"><span>Halaman {s * 2 + 1}</span>{spread.left?.side === "both" && <span>panorama dua halaman</span>}<span>Spread {s + 1} dari {spreads.length} · halaman {s * 2 + 2}</span></div>
            <Sheet spread={spread} preset={preset} byId={byId} place={place} sel={sel} selText={selText} guides={guides} lowres={lowres} passive={hand}
              crop={crop} onCrop={setCropId}
              onPlace={(id, pl, replace) => commit({ ...design, place: { ...place, [id]: pl } }, replace)}
              onSelectPhoto={(id) => { setSel(id); setSelText(null); if (id) setTab("props"); }}
              onSelectText={(t) => { setSelText(t); setSel(""); if (t) setTab("props"); }}
              onEditText={(t) => { setSelText(t); setSel(""); setTab("props"); setTimeout(() => textArea.current?.focus(), 30); }}
              onDrop={drop}
              onFrames={(page, boxes, replace) => setPage(page, { free: boxes }, replace)}
              onText={(page, id, patch, replace) => setText(page, id, patch, replace)} />
          </div>
        </div>
      </div>
      {guides && <div className="canvas-ovl leg"><span><i style={{ background: "var(--bleed)" }} />Potong</span><span><i style={{ background: "var(--safe)" }} />Area aman</span><span><i style={{ background: "var(--guide)" }} />Snap</span></div>}
      <div className="canvas-ovl nav"><IconBtn icon="chevron-left" small cmd="e.prev" /><span className="nt">PgUp / PgDn</span><IconBtn icon="chevron-right" small cmd="e.next" /></div>
      <div className="canvas-ovl zoom">
        <IconBtn icon="zoom-out" small cmd="e.zoomOut" />
        <button type="button" className="ib s zv" style={{ width: 48 }} data-cmd="e.fit" onClick={() => runCommand("e.fit")}>{Math.round(z * 100)}%</button>
        <IconBtn icon="zoom-in" small cmd="e.zoomIn" /><IconBtn icon="maximize-2" small cmd="e.fit" on={zoom === "fit"} />
      </div>
    </div>
  ) : (
    <div className="canvas" style={{ display: "flex" }}>
      <div className="dropzone"><Icon name="layout-template" size={24} /><strong>Album belum punya halaman</strong>
        <div className="two"><Btn label="Susun otomatis" icon="wand-sparkles" kind="primary" cmd="app.auto" /><Btn label="Spread kosong" icon="plus" cmd="e.newSpread" /></div></div>
    </div>
  );

  const filmstrip = (
    <div className="strip">
      <div className="strip-h">
        <span className="overline">Spread</span><span className="caption">{spreads.length} spread · {spreads.length * 2} halaman · seret untuk mengurutkan</span><span className="grow" />
        <IconBtn icon="plus" small cmd="e.newSpread" /><IconBtn icon="wand-sparkles" small cmd="app.auto" /><IconBtn icon="layout-grid" small cmd="e.overview" />
      </div>
      <div className="strip-row">
        {spreads.map((sp, i) => {
          const note = [sp.left, sp.right].some((x) => x?.cfg.note && !x.cfg.noteDone);
          const warn = warnPages.has(i * 2 + 1) || warnPages.has(i * 2 + 2);
          return (
            <button key={i} type="button" className={`st-item ${i === s ? "cur" : ""} ${warn ? "warn" : ""} ${stripDrag && stripDrag.over === i && stripDrag.from !== i ? "drop" : ""}`} draggable
              ref={(el) => { if (el && i === s) el.scrollIntoView?.({ block: "nearest", inline: "nearest" }); }}
              onClick={() => { setSi(i); deselect(); }}
              onDragStart={(e) => { setStripDrag({ from: i, over: i }); e.dataTransfer.setData("text/plain", `spread:${i}`); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { if (stripDrag) { e.preventDefault(); if (stripDrag.over !== i) setStripDrag({ ...stripDrag, over: i }); } }}
              onDrop={(e) => { e.preventDefault(); if (stripDrag && stripDrag.from !== i) { setAlbum(moveSheet(album, pages, stripDrag.from, i)); setSi(i); } setStripDrag(null); }}
              onDragEnd={() => setStripDrag(null)}>
              <MiniSheet sp={sp} preset={preset} byId={byId} place={place} />
              <span className="lb">{warn && <Icon name="triangle-alert" size={11} className="warn-text" />}{i * 2 + 1}–{i * 2 + 2}{sp.left?.side === "both" ? " · panorama" : ""}{note && <i className="dot" />}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ---------- right panel ----------
  const props = (
    <aside className="props" aria-label="Properti">
      <div className="tabs-h"><Seg full items={[{ v: "props", label: "Properti" }, { v: "album", label: "Album" }]} value={tab} onChange={setTab} /></div>
      <div className="scroll">
        {tab === "album" ? (
          <>
            <Section id="e-all" title="Semua halaman">
              <Row label="Margin"><NumField value={preset.marginPct} min={0} max={20} step={0.5} unit="%" onChange={(v) => setPreset({ ...preset, marginPct: v })} /></Row>
              <Row label="Jarak foto"><NumField value={preset.gapPct} min={0} max={10} step={0.5} unit="%" onChange={(v) => setPreset({ ...preset, gapPct: v })} /></Row>
              <Row label="Latar album"><ColorField value={preset.bg} onChange={(v) => setPreset({ ...preset, bg: v })} /></Row>
            </Section>
            <Section id="e-size" title="Ukuran & cetak">
              <p className="caption">{preset.pageWmm / 10} × {preset.pageHmm / 10} cm per halaman · {preset.pages} halaman · {preset.binding === "layflat" ? "lay-flat" : "jilid biasa"} · bleed {preset.bleedMm} mm · {preset.dpi} dpi</p>
              <Btn label="Properti album…" icon="sliders-horizontal" full cmd="app.props" />
              <Btn label="Acak semua tata letak" icon="shuffle" full cmd="e.shuffleAll" />
              <Btn label="Template tata letak…" icon="layout-template" full cmd="app.templates" />
            </Section>
            <Section id="e-sum" title="Ringkasan">
              <dl className="meta-dl">
                <dt>Spread</dt><dd>{spreads.length} ({spreads.length * 2} halaman)</dd>
                <dt>Foto</dt><dd>{album.order.length - blanks} di album</dd>
                {blanks > 0 && <><dt>Kosong</dt><dd>{blanks} bingkai</dd></>}
                <dt>dpi rendah</dt><dd className={warnings.length ? "warn-text" : ""}>{warnings.length ? `${warnings.length} foto` : "tidak ada"}</dd>
                <dt>Catatan</dt><dd>{openNotes ? `${openNotes} belum selesai` : "tidak ada"}</dd>
              </dl>
            </Section>
          </>
        ) : (
          <>
            {tb && selText && (
              <>
                <Section id="e-text" title={`Teks · halaman ${textPage ? pageNo(textPage) : ""}`}>
                  <textarea ref={textArea} rows={4} value={tb.text} aria-label="Isi teks" onChange={(e) => textSlide({ text: e.target.value })} onBlur={endSlide} />
                  <Row label="Huruf"><select value={tb.font} onChange={(e) => setText(selText.page, tb.id, { font: e.target.value })} style={{ fontFamily: `"${tb.font}"` }}>
                    {FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.family}</option>)}</select></Row>
                  <Row label="Ukuran"><NumField value={tb.sizeMm} min={1} max={80} step={0.5} unit="mm" onChange={(v) => setText(selText.page, tb.id, { sizeMm: v })} />
                    <IconBtn icon="bold" small tip="Tebal" on={!!tb.bold} onClick={() => setText(selText.page, tb.id, { bold: !tb.bold })} />
                    <IconBtn icon="italic" small tip="Miring" on={!!tb.italic} onClick={() => setText(selText.page, tb.id, { italic: !tb.italic })} /></Row>
                  <Row label="Perataan"><Seg full value={tb.align} onChange={(a) => setText(selText.page, tb.id, { align: a })}
                    items={[{ v: "left", label: "", icon: "align-left", tip: "Rata kiri" }, { v: "center", label: "", icon: "align-center", tip: "Tengah" }, { v: "right", label: "", icon: "align-right", tip: "Rata kanan" }]} /></Row>
                  <Row label="Warna"><ColorField value={tb.color} onChange={(v) => textSlide({ color: v })} onEnd={endSlide} /></Row>
                  <Row label="Jarak huruf">{slider(tb.tracking ?? 0, 0, 0.5, 0.01, (v) => textSlide({ tracking: v }), `${Math.round((tb.tracking ?? 0) * 100)}`)}</Row>
                  <div className="pair"><Btn label="Duplikat" icon="copy" full cmd="e.dup" /><Btn label="Hapus" icon="trash-2" full cmd="e.delete" /></div>
                </Section>
              </>
            )}
            {!tb && selOnSpread && selPhoto && (
              <Section id="e-frame" title="Bingkai foto">
                <Row label="Perbesar">{slider(selPl.z, 1, 3, 0.01, (v) => setPlace(sel, { z: v }), `${Math.round(selPl.z * 100)}%`)}</Row>
                <Row label="Geser datar">{slider(selPl.x, 0, 1, 0.01, (v) => setPlace(sel, { x: v }), `${Math.round(selPl.x * 100)}%`)}</Row>
                <Row label="Geser tegak">{slider(selPl.y, 0, 1, 0.01, (v) => setPlace(sel, { y: v }), `${Math.round(selPl.y * 100)}%`)}</Row>
                {selDpi > 0 && <div className={`note ${selDpi < (preset.dpi * 2) / 3 ? "warn" : "ok"}`}><Icon name={selDpi < (preset.dpi * 2) / 3 ? "triangle-alert" : "circle-check"} size={14} />
                  {selDpi < (preset.dpi * 2) / 3 ? `Resolusi cetak ${selDpi} dpi (target ${preset.dpi}). Perkecil bingkai atau ganti foto.` : `Resolusi cetak ${selDpi} dpi · aman`}</div>}
                <div className="pair"><Btn label="Kosongkan" icon="x" full onClick={() => { setAlbum(clearFrame(album, sel)); setSel(""); }} /><Btn label="Hapus bingkai" icon="trash-2" full cmd="e.delete" /></div>
                <p className="caption" title={selPhoto.name}>{selPhoto.name}</p>
              </Section>
            )}
            {!tb && selOnSpread && isEmpty(sel) && (
              <Section id="e-empty" title="Bingkai kosong">
                <p className="caption">Seret foto dari panel kiri ke bingkai ini.</p>
                <Btn label="Hapus bingkai" icon="trash-2" full cmd="e.delete" />
              </Section>
            )}
            {selPage && (
              <>
                <Section id="e-layout" title={`Tata letak ${pageLabel}`}>
                  <div className="counts" role="group" aria-label="Jumlah foto">
                    {countsFor(joined).map((n) => <button key={n} type="button" className={selPage.cfg.n === n ? "on" : ""} aria-pressed={selPage.cfg.n === n} data-tip={`${n} foto`} onClick={() => setAlbum(setCount(album, selPage.index, n))}>{n}</button>)}
                  </div>
                  <div className={joined ? "tpls wide" : "tpls"}>
                    {templatesFor(selPage.ids.length, joined).map((t) => (
                      <button key={t.id} type="button" className={`tpl ${!selPage.cfg.free && selPage.tpl?.id === t.id ? "on" : ""}`} aria-label={t.label} data-tip={t.label}
                        onClick={() => setAlbum(applyTpl(album, selPage.index, t))}
                        style={{ gridTemplateColumns: `repeat(${t.cols}, 1fr)`, gridTemplateRows: `repeat(${t.rows}, 1fr)` }}>
                        {t.cells.map(([c, r, cs, rs], k) => <span key={k} style={{ gridColumn: `${c + 1} / span ${cs}`, gridRow: `${r + 1} / span ${rs}` }} />)}
                      </button>
                    ))}
                  </div>
                  {selPage.cfg.free && <p className="caption">Bingkai diatur manual. Klik template untuk kembali ke tata letak template.</p>}
                  <div className="pair"><Btn label="Acak" icon="shuffle" full cmd="e.shuffle" /><Btn label="Template baru…" icon="layout-template" full cmd="app.templates" /></div>
                  <div className="pair"><Btn label="Salin" icon="copy" full cmd="e.copyLayout" /><Btn label="Tempel" icon="clipboard-paste" full cmd="e.pasteLayout" /></div>
                  <Btn label={joined ? "Pisahkan jadi dua halaman" : "Jadikan panorama dua halaman"} icon={joined ? "unlink-2" : "link-2"} full cmd="e.join" />
                  {joined && preset.binding === "biasa" && <div className="note warn"><Icon name="triangle-alert" size={14} />Jilid biasa: bagian foto di lipatan bisa tertelan jilid.</div>}
                  <label className="ck"><input type="checkbox" checked={!!selPage.cfg.locked} onChange={() => setPage(selPage.index, { locked: !selPage.cfg.locked })} />Kunci tata letak halaman ini (L)</label>
                </Section>
                <Section id="e-note" title="Catatan revisi">
                  <textarea placeholder="mis. ganti foto kanan dengan yang tertawa" aria-label="Catatan revisi halaman ini" value={selPage.cfg.note ?? ""}
                    onChange={(e) => setPage(selPage.index, { note: e.target.value || undefined, noteDone: false }, sliding.current)} onFocus={() => { sliding.current = false; }} onBlur={endSlide}
                    onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) (e.target as HTMLElement).blur(); }} />
                  {selPage.cfg.note && <label className="ck"><input type="checkbox" checked={!!selPage.cfg.noteDone} onChange={(e) => setPage(selPage.index, { noteDone: e.target.checked })} />Sudah dikerjakan</label>}
                </Section>
                <Section id="e-style" title="Gaya halaman" defaultOpen={false}>
                  <Row label="Latar"><ColorField value={selPage.cfg.bg ?? preset.bg} onChange={(v) => setPage(selPage.index, { bg: v }, sliding.current)} onEnd={endSlide} />
                    {selPage.cfg.bg && <IconBtn icon="rotate-ccw" small tip="Ikut latar album" onClick={() => setPage(selPage.index, { bg: undefined })} />}</Row>
                  <Row label="Garis foto"><NumField value={selPage.cfg.stroke?.mm ?? 0} min={0} max={10} step={0.25} unit="mm" onChange={(v) => setPage(selPage.index, { stroke: { color: selPage.cfg.stroke?.color ?? "#ffffff", mm: v } })} /></Row>
                  {(selPage.cfg.stroke?.mm ?? 0) > 0 && <Row label="Warna garis"><ColorField value={selPage.cfg.stroke?.color ?? "#ffffff"} onChange={(v) => setPage(selPage.index, { stroke: { mm: selPage.cfg.stroke?.mm ?? 1, color: v } })} /></Row>}
                </Section>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );

  const tool2 = (icon: Parameters<typeof IconBtn>[0]["icon"], cmd: Parameters<typeof IconBtn>[0]["cmd"]) => <IconBtn icon={icon} cmd={cmd} />;
  return (
    <>
      <div className={`work ${panels ? "" : "no-panels"}`}>
        <div className="rail" role="toolbar" aria-label="Alat">
          {tool2("mouse-pointer-2", "e.select")}{tool2("hand", "e.hand")}{tool2("type", "e.text")}{tool2("square-dashed", "e.frame")}{tool2("zoom-in", "e.zoomIn")}
          <span className="hdiv" />
          {tool2("grid-3x3", "e.guides")}{tool2("layout-grid", "e.overview")}{tool2("sliders-horizontal", "app.props")}
        </div>
        <aside className="side" aria-label="Foto">
          <div className="tabs-h" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Seg full items={[{ v: "pick", label: `Dipilih` }, { v: "all", label: "Semua foto" }]} value={trayAll ? "all" : "pick"} onChange={(v) => setTrayAll(v === "all")} />
            <input className="search" type="text" placeholder="Cari nama file…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%" }} aria-label="Cari foto" />
            <span className="caption">{tray.length.toLocaleString("id-ID")} belum dipakai · {(album.order.length - blanks).toLocaleString("id-ID")} di album</span>
          </div>
          <div className="scroll">
            {tray.length === 0 ? <p className="caption" style={{ padding: "0 12px" }}>{trayAll ? "Semua foto sudah ada di album." : "Semua foto terpilih sudah ada di album. Pilih “Semua foto” untuk memakai foto lain."}</p> : (
              <div className="tray">
                {tray.slice(0, 600).map((p) => (
                  <div key={p.id} className="pt bare" draggable title={p.name}
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; }}>
                    {p.thumb && <img src={p.thumb} alt={p.name} draggable={false} loading="lazy" />}
                    {p.stars > 0 && <span className="badge burst" style={{ color: "var(--warn)" }}>{"★".repeat(p.stars)}</span>}
                  </div>
                ))}
              </div>
            )}
            {tray.length > 600 && <p className="caption" style={{ padding: "0 12px 12px" }}>Menampilkan 600 dari {tray.length.toLocaleString("id-ID")}. Saring di Kurasi untuk mempersempit.</p>}
          </div>
          <div className="pad" style={{ borderTop: "1px solid var(--line-subtle)", flexDirection: "row", alignItems: "center" }}><Icon name="info" size={14} className="dimtext" /><span className="caption">Seret ke bingkai · seret antar bingkai = tukar</span></div>
        </aside>
        <main className="center">
          {overview ? (
            <>
              <div className="optbar"><Seg items={[{ v: "one", label: "Spread" }, { v: "all", label: <>Semua spread <span className="dimtext">G</span></> }]} value="all" onChange={() => setOverview(false)} />
                <span className="grow" /><span className="caption">Seret untuk mengurutkan · klik = buka</span></div>
              <Overview spreads={spreads} preset={preset} byId={byId} place={place} current={s} warnPages={warnPages}
                onOpen={(i) => { setSi(i); setOverview(false); }}
                onMove={(from, to) => { setAlbum(moveSheet(album, pages, from, to)); setSi(to); }} />
            </>
          ) : (
            <>{optbar}{canvasEl}{filmstrip}</>
          )}
        </main>
        {props}
      </div>
      <StatusBar left={`Album ${preset.pageWmm / 10} × ${preset.pageHmm / 10} cm · spread ${(2 * preset.pageWmm) / 10} × ${preset.pageHmm / 10} cm · bleed ${preset.bleedMm} mm · ${preset.dpi} dpi`}
        warn={warnings.length || openNotes ? [warnings.length ? `${warnings.length} foto di bawah ${Math.round((preset.dpi * 2) / 3)} dpi` : "", openNotes ? `${openNotes} catatan revisi terbuka` : ""].filter(Boolean).join(" · ") : undefined}
        right={<span className="dimtext">{tb ? `Teks · ${pageLabel}` : selOnSpread ? `Bingkai · ${pageLabel}` : `Spread ${s + 1} dari ${spreads.length}`} · Zoom {Math.round(z * 100)}%</span>} />
    </>
  );
}

/** Colour swatch + hex field. */
export function ColorField({ value, onChange, onEnd }: { value: string; onChange: (v: string) => void; onEnd?: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="colorf">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onEnd} aria-label="Pilih warna" />
      <input type="text" value={draft ?? value.toUpperCase()} aria-label="Kode warna" onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== null) { const v = draft.trim().replace(/^#?/, "#"); if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase()); setDraft(null); } onEnd?.(); }} />
    </span>
  );
}
