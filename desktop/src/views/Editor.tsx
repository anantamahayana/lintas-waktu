import { useEffect, useMemo, useRef, useState } from "react";
import { ask, tell } from "../lib/ask";
import type { Design } from "../App";
import { lowResWarnings, pageNo, toSpreads } from "../lib/export";
import { addPage, applyTpl, clearFrame, countsFor, FONTS, isEmpty, joinPages, layPages, moveSheet, patchPage, removePhoto, replacePhoto, setCount, shuffleTemplates, splitPages, swapPhotos, templatesFor, type Box, type LaidPage, type PageCfg, type TextBox, type Tpl } from "../lib/layout";
import { frameRectMm } from "../lib/frames";
import type { Photo } from "../lib/photos";
import { CENTER, effectiveDpi, type Placement, type Preset } from "../lib/print";
import { Overview } from "./Overview";
import { Sheet, type TextSel } from "./Sheet";
import { PresetForm } from "./PresetForm";
import { TemplateEditor } from "./TemplateEditor";

type Props = {
  photos: Photo[];
  design: Design;
  commit: (d: Design, replace?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  preset: Preset;
  setPreset: (p: Preset) => void;
  onRebuild: () => void;
  canRebuild: boolean;
  onExport: () => void;
  custom: Tpl[];
  setCustom: (list: Tpl[]) => void;
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

export function Editor({ photos, design, commit, undo, redo, canUndo, canRedo, preset, setPreset, onRebuild, canRebuild, onExport, custom, setCustom }: Props) {
  const { album, place } = design;
  const { byId, pages } = useLaidPages(photos, design, preset, custom);
  const [making, setMaking] = useState(false);
  const [props, setProps] = useState(false);
  const [overview, setOverview] = useState(false);
  const propsRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (props) propsRef.current?.showModal(); }, [props]);
  const spreads = useMemo(() => toSpreads(pages), [pages]);
  const [si, setSi] = useState(0);
  const [sel, setSel] = useState("");
  const [selText, setSelText] = useState<TextSel>(null);
  const [guides, setGuides] = useState(true);
  const [seed, setSeed] = useState(1);
  const [clip, setClip] = useState<Pick<PageCfg, "tpl" | "free" | "texts" | "bg" | "stroke"> & { n: number; spread: boolean } | null>(null);
  const sliding = useRef(false);
  const textArea = useRef<HTMLTextAreaElement>(null);

  const s = Math.min(si, Math.max(0, spreads.length - 1));
  const spread = spreads[s];
  const inAlbum = useMemo(() => new Set(album.order), [album.order]);
  const anyPicked = useMemo(() => photos.some((p) => p.pick === true), [photos]);
  const [trayAll, setTrayAll] = useState(!anyPicked);
  const tray = useMemo(() => photos.filter((p) => (trayAll || p.pick === true) && !inAlbum.has(p.id)), [photos, inAlbum, trayAll]);
  const blanks = useMemo(() => album.order.filter(isEmpty).length, [album.order]);
  const warnings = useMemo(() => lowResWarnings(pages, byId, place, preset), [pages, byId, place, preset]);
  const openNotes = album.pages.filter((p) => p.note && !p.noteDone).length;

  const textPage = selText ? pages[selText.page] : null;
  const selPage: LaidPage | null = textPage || (sel && pages.find((p) => p.ids.includes(sel))) || spread?.left || (spread?.right?.side === 1 ? spread.right : null);
  const joined = selPage?.side === "both";
  const selPhoto = sel ? byId.get(sel) : undefined;
  const selOnSpread = !!sel && !!selPage && (selPage === spread?.left || selPage === spread?.right);
  const tb: TextBox | undefined = selText ? pages[selText.page]?.cfg.texts?.find((x) => x.id === selText.id) : undefined;

  const setAlbum = (a: typeof album, replace = false) => { if (a !== album) commit({ ...design, album: a }, replace); };
  const setPage = (i: number, patch: Partial<PageCfg>, replace = false) => setAlbum(patchPage(album, i, patch), replace);
  const setPlace = (id: string, patch: Partial<Placement>) => {
    commit({ ...design, place: { ...place, [id]: { ...(place[id] ?? CENTER), ...patch } } }, sliding.current);
    sliding.current = true;
  };
  const endSlide = () => { sliding.current = false; };
  const setText = (page: number, id: string, patch: Partial<TextBox>, replace = false) =>
    setPage(page, { texts: (album.pages[page].texts ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }, replace);
  const textSlide = (patch: Partial<TextBox>) => { if (selText) { setText(selText.page, selText.id, patch, sliding.current); sliding.current = true; } };

  /** Nudge the selected frame or text by `dx`, `dy` millimetres. */
  const nudge = (dx: number, dy: number) => {
    if (selText && tb && textPage) {
      const k = (textPage.side === "both" ? 2 : 1) * preset.pageWmm;
      setText(selText.page, selText.id, { x: tb.x + dx / k, y: tb.y + dy / preset.pageHmm });
      return true;
    }
    if (sel && selPage && selOnSpread) {
      const k = (selPage.side === "both" ? 2 : 1) * preset.pageWmm, i = selPage.ids.indexOf(sel);
      const boxes: Box[] = selPage.ids.map((_, j) => {
        const r = frameRectMm(preset, selPage, j), base = preset.bleedMm + (selPage.side === 1 ? preset.pageWmm : 0);
        return { x: (r.x - base) / k, y: (r.y - preset.bleedMm) / preset.pageHmm, w: r.w / k, h: r.h / preset.pageHmm };
      });
      boxes[i] = { ...boxes[i], x: boxes[i].x + dx / k, y: boxes[i].y + dy / preset.pageHmm };
      setPage(selPage.index, { free: boxes });
      return true;
    }
    return false;
  };

  const keys = useRef({ nudge, undo, redo, n: spreads.length, sel, selText });
  keys.current = { nudge, undo, redo, n: spreads.length, sel, selText };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && !(e.target instanceof HTMLInputElement && ["checkbox", "radio", "range", "color"].includes(e.target.type))) return;
      const k = e.key.toLowerCase(), c = keys.current, step = e.shiftKey ? 5 : 0.5;
      if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); if (e.shiftKey) c.redo(); else c.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); c.redo(); return; }
      const arrows: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
      if (arrows[k] && (c.sel || c.selText)) { e.preventDefault(); c.nudge(...arrows[k]); return; }
      if (k === "arrowright" || k === "pagedown") { e.preventDefault(); setSi((i) => Math.min(c.n - 1, i + 1)); }
      else if (k === "arrowleft" || k === "pageup") { e.preventDefault(); setSi((i) => Math.max(0, i - 1)); }
      else if (k === "escape") { setSel(""); setSelText(null); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  /** Shuffle templates; say why when nothing can change. */
  const shuffle = (only?: number) => {
    const next = shuffleTemplates(album, pages, seed, only);
    setSeed(seed + 1);
    if (next.pages.every((p, i) => p.tpl === album.pages[i].tpl)) {
      void tell(only === undefined
        ? "Tidak ada yang bisa diacak: semua halaman terkunci, diatur manual, atau belum berisi bingkai."
        : "Halaman ini tidak bisa diacak: terkunci, diatur manual, atau tidak ada tata letak lain untuk jumlah foto ini.");
      return;
    }
    setAlbum(next);
  };
  const drop = (onto: string, dragged: string) => {
    if (!dragged || dragged === onto) return;
    setAlbum(inAlbum.has(dragged) ? swapPhotos(album, onto, dragged) : replacePhoto(album, onto, dragged));
    setSel(dragged); setSelText(null);
  };
  const addText = () => {
    const pg = selPage ?? pages[0];
    if (!pg) return;
    const t: TextBox = { id: Date.now().toString(36), text: "Teks baru", font: "Cormorant Garamond", sizeMm: 8, color: "#1f1e1c", align: "center", x: 0.15, y: 0.42, w: 0.7, h: 0.12 };
    setPage(pg.index, { texts: [...(pg.cfg.texts ?? []), t] });
    setSel(""); setSelText({ page: pg.index, id: t.id });
    setTimeout(() => textArea.current?.select(), 50);
  };
  const copyLayout = () => selPage && setClip({ tpl: selPage.tpl?.id, free: selPage.cfg.free, texts: selPage.cfg.texts, bg: selPage.cfg.bg, stroke: selPage.cfg.stroke, n: selPage.ids.length, spread: joined });
  const pasteLayout = () => {
    if (!clip || !selPage) return;
    if (clip.spread !== joined) { void tell(clip.spread ? "Tata letak yang disalin untuk dua halaman menyambung; tempel ke spread yang juga menyambung." : "Tata letak yang disalin untuk satu halaman; tempel ke halaman biasa, bukan spread menyambung."); return; }
    let a = clip.n === selPage.ids.length ? album : setCount(album, selPage.index, clip.n);
    if (a.pages[selPage.index]?.n !== clip.n) { void tell("Tata letak tidak bisa ditempel: jumlah foto halaman ini tidak bisa diubah (halaman lain terkunci)."); return; }
    a = patchPage(a, selPage.index, { tpl: clip.tpl, free: clip.free, texts: clip.texts?.map((x) => ({ ...x, id: x.id + Date.now().toString(36) })), bg: clip.bg, stroke: clip.stroke });
    setAlbum(a);
  };

  const selRect = selOnSpread && selPage?.tpl && selPhoto ? frameRectMm(preset, selPage, selPage.ids.indexOf(sel)) : null;
  const selDpi = selRect && selPhoto?.w ? Math.round(effectiveDpi(selPhoto.w, selPhoto.h, selRect, place[sel] ?? CENTER)) : 0;
  const selPl = place[sel] ?? CENTER;

  return (
    <>
      <div className="tools">
        <button type="button" className="btn" disabled={!canUndo} onClick={undo} title="Ctrl+Z">Urungkan</button>
        <button type="button" className="btn" disabled={!canRedo} onClick={redo} title="Ctrl+Y">Ulangi</button>
        <span className="sep" aria-hidden="true" />
        <button type="button" className="btn" aria-pressed={overview} onClick={() => setOverview(!overview)}>{overview ? "Kembali ke spread" : "Semua spread"}</button>
        <button type="button" className="btn" onClick={addText} disabled={overview}>Tambah teks</button>
        <button type="button" className="btn" onClick={() => setProps(true)}>Properti album</button>
        <span className="dim">{preset.pageWmm / 10} × {preset.pageHmm / 10} cm · {preset.binding === "layflat" ? "layflat" : "jilid biasa"}</span>
        <label className="check"><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Garis bantu</label>
        <span className="right" />
        <button type="button" className="btn" onClick={() => shuffle()}>Acak ulang album</button>
        <button type="button" className="btn" onClick={() => { setAlbum(addPage(addPage(album))); setSi(spreads.length); setSel(""); }}>Tambah spread kosong</button>
        <button type="button" className="btn" disabled={!canRebuild} title={canRebuild ? undefined : "Pilih foto dulu di Kurasi"}
          onClick={async () => { if (await ask("Susun otomatis dari foto terpilih? Tata letak sekarang masih bisa dikembalikan dengan Urungkan.")) onRebuild(); }}>Susun otomatis</button>
        <button type="button" className="btn primary" onClick={onExport}>Ekspor</button>
      </div>

      {overview ? (
        <Overview spreads={spreads} pages={pages} preset={preset} byId={byId} place={place} current={s}
          onOpen={(i) => { setSi(i); setOverview(false); }}
          onMove={(from, to) => { setAlbum(moveSheet(album, pages, from, to)); setSi(to); }} />
      ) : (
      <div className="work">
        <aside className="panel" aria-label="Foto yang belum dipakai">
          <h2>Belum dipakai · {tray.length}</h2>
          <div className="seg" role="group" aria-label="Foto yang ditampilkan">
            <button type="button" className="btn" aria-pressed={!trayAll} onClick={() => setTrayAll(false)}>Dipilih</button>
            <button type="button" className="btn" aria-pressed={trayAll} onClick={() => setTrayAll(true)}>Semua foto</button>
          </div>
          {tray.length === 0 ? <p className="dim">{trayAll ? "Semua foto sudah ada di album." : "Semua foto terpilih sudah ada di album."}</p> : (
            <div className="tray">
              {tray.slice(0, 400).map((p) => (
                <div key={p.id} className="thumb" draggable title={p.name}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; }}>
                  {p.thumb && <img src={p.thumb} alt={p.name} draggable={false} loading="lazy" />}
                </div>
              ))}
            </div>
          )}
          {tray.length > 400 && <p className="dim">Menampilkan 400 dari {tray.length}. Saring di Kurasi untuk mempersempit.</p>}
          <p className="dim">Seret foto ke bingkai untuk mengisi atau mengganti. Seret antar bingkai untuk menukar. Pilih bingkai lalu seret lingkaran biru untuk menggeser, kotak putih untuk mengubah ukuran (Shift: jaga bentuk, Alt: tanpa magnet).</p>
        </aside>

        <main className="stage dark">
          {spread && (
            <div className="sheetwrap">
              <div className="pagenos"><span>Halaman {s * 2 + 1}</span>{spread.left?.side === "both" && <span>dua halaman menyambung</span>}<span>Halaman {s * 2 + 2}</span></div>
              <Sheet spread={spread} preset={preset} byId={byId} place={place} sel={sel} selText={selText} guides={guides}
                onSelectPhoto={(id) => { setSel(id); setSelText(null); }}
                onSelectText={(t) => { setSelText(t); setSel(""); }}
                onEditText={(t) => { setSelText(t); setSel(""); setTimeout(() => textArea.current?.focus(), 30); }}
                onDrop={drop}
                onFrames={(page, boxes, replace) => setPage(page, { free: boxes }, replace)}
                onText={(page, id, patch, replace) => setText(page, id, patch, replace)} />
            </div>
          )}
          <div className="spreads" role="tablist" aria-label="Spread">
            {spreads.map((sp, i) => (
              <button key={i} type="button" role="tab" aria-selected={i === s} className="spreadtab" onClick={() => { setSi(i); setSel(""); setSelText(null); }}>
                {i * 2 + 1}–{i * 2 + 2}
                {sp.left?.side === "both" ? " · sambung" : ""}{(sp.left?.cfg.locked || sp.right?.cfg.locked) ? " · kunci" : ""}
                {[sp.left, sp.right].some((x) => x?.cfg.note && !x.cfg.noteDone) && <span className="notedot" title="Ada catatan revisi" />}
              </button>
            ))}
          </div>
        </main>

        <aside className="panel" aria-label="Properti">
          {tb && selText && (
            <>
              <h2>Teks · halaman {textPage ? pageNo(textPage) : ""}</h2>
              <textarea ref={textArea} className="textedit" rows={3} value={tb.text} aria-label="Isi teks"
                onChange={(e) => textSlide({ text: e.target.value })} onBlur={endSlide} />
              <label className="field">Huruf
                <select value={tb.font} onChange={(e) => setText(selText.page, tb.id, { font: e.target.value })}>
                  {FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>)}
                </select>
              </label>
              <div className="two">
                <label className="field">Ukuran (mm)<input type="number" min={1} max={80} step={0.5} value={tb.sizeMm} onChange={(e) => textSlide({ sizeMm: Math.max(1, +e.target.value || 1) })} onBlur={endSlide} /></label>
                <label className="field">Warna<input type="color" value={tb.color} onChange={(e) => textSlide({ color: e.target.value })} onBlur={endSlide} /></label>
              </div>
              <div className="five" role="group" aria-label="Gaya teks">
                <button type="button" className="btn" aria-pressed={tb.align === "left"} onClick={() => setText(selText.page, tb.id, { align: "left" })} title="Rata kiri">Kiri</button>
                <button type="button" className="btn" aria-pressed={tb.align === "center"} onClick={() => setText(selText.page, tb.id, { align: "center" })} title="Tengah">Tgh</button>
                <button type="button" className="btn" aria-pressed={tb.align === "right"} onClick={() => setText(selText.page, tb.id, { align: "right" })} title="Rata kanan">Kan</button>
                <button type="button" className="btn" aria-pressed={!!tb.bold} onClick={() => setText(selText.page, tb.id, { bold: !tb.bold })} title="Tebal"><b>B</b></button>
                <button type="button" className="btn" aria-pressed={!!tb.italic} onClick={() => setText(selText.page, tb.id, { italic: !tb.italic })} title="Miring"><i>I</i></button>
              </div>
              <label className="field">Jarak huruf
                <input type="range" min={0} max={0.5} step={0.01} value={tb.tracking ?? 0} onChange={(e) => textSlide({ tracking: +e.target.value })} onPointerUp={endSlide} onKeyUp={endSlide} />
              </label>
              <button type="button" className="btn" onClick={() => { setPage(selText.page, { texts: (album.pages[selText.page].texts ?? []).filter((x) => x.id !== tb.id) }); setSelText(null); }}>Hapus teks</button>
            </>
          )}

          {!tb && selPage && (
            <>
              <h2>Tata letak · {joined ? `halaman ${pageNo(selPage)}–${pageNo(selPage) + 1}` : `halaman ${pageNo(selPage)}`}</h2>
              <button type="button" className="btn" aria-pressed={joined}
                onClick={() => { setAlbum(joined ? splitPages(album, selPage.index) : joinPages(album, selPage.side === 1 ? selPage.index - 1 : selPage.index)); setSel(""); }}>
                {joined ? "Pisahkan jadi dua halaman" : "Sambung dua halaman"}
              </button>
              {joined && preset.binding === "biasa" && <div className="warn">Jilid biasa: bagian foto di lipatan bisa tertelan jilid.</div>}
              <div className="five" role="group" aria-label="Jumlah foto">
                {countsFor(joined).map((n) => (
                  <button key={n} type="button" className="btn" aria-pressed={selPage.cfg.n === n} aria-label={`${n} foto`}
                    onClick={() => setAlbum(setCount(album, selPage.index, n))}>{n}</button>
                ))}
              </div>
              <div className={joined ? "tpls wide" : "tpls"}>
                {templatesFor(selPage.ids.length, joined).map((t) => (
                  <button key={t.id} type="button" className="tpl" aria-pressed={!selPage.cfg.free && selPage.tpl?.id === t.id} aria-label={t.label} title={t.label}
                    onClick={() => setAlbum(applyTpl(album, selPage.index, t))}
                    style={{ gridTemplateColumns: `repeat(${t.cols}, 1fr)`, gridTemplateRows: `repeat(${t.rows}, 1fr)` }}>
                    {t.cells.map(([c, r, cs, rs], k) => <span key={k} style={{ gridColumn: `${c + 1} / span ${cs}`, gridRow: `${r + 1} / span ${rs}` }} />)}
                  </button>
                ))}
              </div>
              {selPage.cfg.free && <div className="dim">Bingkai diatur manual. Klik template untuk kembali ke tata letak template.</div>}
              <div className="two">
                <button type="button" className="btn" onClick={() => setMaking(true)}>Template sendiri…</button>
                <button type="button" className="btn" disabled={!!selPage.cfg.locked} onClick={() => shuffle(selPage.index)}>Acak halaman</button>
                <button type="button" className="btn" onClick={copyLayout} title="Salin tata letak, teks, dan gaya halaman ini">Salin tata letak</button>
                <button type="button" className="btn" disabled={!clip} onClick={pasteLayout}>Tempel tata letak</button>
              </div>
              <button type="button" className="btn" aria-pressed={!!selPage.cfg.locked} onClick={() => setPage(selPage.index, { locked: !selPage.cfg.locked })}>
                {selPage.cfg.locked ? "Terkunci (klik untuk membuka)" : "Kunci halaman"}
              </button>

              <h2>Catatan revisi</h2>
              <textarea className="textedit" rows={2} placeholder="mis. ganti foto kanan dengan yang tertawa" aria-label="Catatan revisi halaman ini"
                value={selPage.cfg.note ?? ""} onChange={(e) => setPage(selPage.index, { note: e.target.value || undefined, noteDone: false }, sliding.current)} onFocus={() => { sliding.current = false; }} onBlur={endSlide} />
              {selPage.cfg.note && (
                <label className="check"><input type="checkbox" checked={!!selPage.cfg.noteDone} onChange={(e) => setPage(selPage.index, { noteDone: e.target.checked })} /> Sudah dikerjakan</label>
              )}

              <h2>Gaya halaman</h2>
              <div className="two">
                <label className="field">Latar halaman
                  <input type="color" value={selPage.cfg.bg ?? preset.bg} onChange={(e) => setPage(selPage.index, { bg: e.target.value }, sliding.current)} onBlur={endSlide} />
                </label>
                <label className="field">Garis foto (mm)
                  <input type="number" min={0} max={10} step={0.25} value={selPage.cfg.stroke?.mm ?? 0} onChange={(e) => setPage(selPage.index, { stroke: { color: selPage.cfg.stroke?.color ?? "#ffffff", mm: Math.max(0, +e.target.value || 0) } })} />
                </label>
              </div>
              {(selPage.cfg.stroke?.mm ?? 0) > 0 && (
                <label className="field">Warna garis
                  <input type="color" value={selPage.cfg.stroke?.color ?? "#ffffff"} onChange={(e) => setPage(selPage.index, { stroke: { mm: selPage.cfg.stroke?.mm ?? 1, color: e.target.value } })} />
                </label>
              )}
              {selPage.cfg.bg && <button type="button" className="btn" onClick={() => setPage(selPage.index, { bg: undefined })}>Latar ikut album</button>}
              <h2>Semua halaman</h2>
              <div className="two">
                <label className="field">Margin (%)
                  <input type="number" min={0} max={20} step={0.5} value={preset.marginPct} onChange={(e) => setPreset({ ...preset, marginPct: Math.min(20, Math.max(0, +e.target.value || 0)) })} />
                </label>
                <label className="field">Jarak foto (%)
                  <input type="number" min={0} max={10} step={0.5} value={preset.gapPct} onChange={(e) => setPreset({ ...preset, gapPct: Math.min(10, Math.max(0, +e.target.value || 0)) })} />
                </label>
              </div>
              <label className="field">Latar album
                <input type="color" value={preset.bg} onChange={(e) => setPreset({ ...preset, bg: e.target.value })} />
              </label>
            </>
          )}

          {!tb && selOnSpread && selPhoto && (
            <>
              <h2>Foto terpilih</h2>
              <div className="dim">{selPhoto.name}</div>
              <label className="field">Perbesar
                <input type="range" min={1} max={3} step={0.01} value={selPl.z} onChange={(e) => setPlace(sel, { z: +e.target.value })} onPointerUp={endSlide} onKeyUp={endSlide} onBlur={endSlide} />
              </label>
              <label className="field">Geser mendatar
                <input type="range" min={0} max={1} step={0.01} value={selPl.x} onChange={(e) => setPlace(sel, { x: +e.target.value })} onPointerUp={endSlide} onKeyUp={endSlide} onBlur={endSlide} />
              </label>
              <label className="field">Geser tegak
                <input type="range" min={0} max={1} step={0.01} value={selPl.y} onChange={(e) => setPlace(sel, { y: +e.target.value })} onPointerUp={endSlide} onKeyUp={endSlide} onBlur={endSlide} />
              </label>
              {selDpi > 0 && <div className={selDpi < (preset.dpi * 2) / 3 ? "warn" : "dim"}>{selDpi} dpi pada ukuran ini (target {preset.dpi})</div>}
              <div className="two">
                <button type="button" className="btn" onClick={() => { setAlbum(clearFrame(album, sel)); setSel(""); }}>Kosongkan</button>
                <button type="button" className="btn" onClick={() => { setAlbum(removePhoto(album, sel)); setSel(""); }}>Hapus bingkai</button>
              </div>
            </>
          )}
          {!tb && selOnSpread && isEmpty(sel) && (
            <>
              <h2>Bingkai kosong</h2>
              <p className="dim">Seret foto dari kiri ke bingkai ini.</p>
              <button type="button" className="btn" onClick={() => { setAlbum(removePhoto(album, sel)); setSel(""); }}>Hapus bingkai</button>
            </>
          )}
        </aside>
      </div>
      )}
      {props && (
        <dialog ref={propsRef} className="dialog" onClose={() => setProps(false)} aria-labelledby="props-title">
          <h1 id="props-title">Properti album</h1>
          <p className="dim">Perubahan langsung terlihat di editor dan bisa dikembalikan dengan mengubah nilainya lagi.</p>
          <div className="dlg-body"><PresetForm preset={preset} setPreset={setPreset} /></div>
          <div className="dlg-actions"><button type="button" className="btn primary" onClick={() => propsRef.current?.close()}>Selesai</button></div>
        </dialog>
      )}
      {making && (
        <TemplateEditor preset={preset} custom={custom} setCustom={setCustom} startSpread={joined} onClose={() => setMaking(false)}
          onUse={(t) => { if (selPage && !!t.spread === joined) setAlbum(applyTpl(album, selPage.index, t)); }} />
      )}
      <footer className="status">
        <span>Spread {s + 1} dari {spreads.length}</span><span>{spreads.length * 2} halaman</span>
        <span>{album.order.length - blanks} foto di album</span>
        {blanks > 0 && <span>{blanks} bingkai kosong</span>}
        {warnings.length > 0 && <span className="warn">{warnings.length} foto beresolusi rendah</span>}
        {openNotes > 0 && <span className="warn">{openNotes} catatan revisi belum selesai</span>}
        <span className="right">PageUp/PageDown pindah spread · panah geser 0,5 mm (Shift 5 mm) · Ctrl+Z urungkan</span>
      </footer>
    </>
  );
}
