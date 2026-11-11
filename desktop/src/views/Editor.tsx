import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Design } from "../App";
import { lowResWarnings, pageNo, toSpreads } from "../lib/export";
import { addPage, applyTpl, clearFrame, countsFor, isEmpty, joinPages, layPages, removePhoto, replacePhoto, setCount, shuffleTemplates, splitPages, swapPhotos, templatesFor, type LaidPage, type Tpl } from "../lib/layout";
import type { Photo } from "../lib/photos";
import { CENTER, cellRectMm, effectiveDpi, spreadMm, type Placement, type Preset } from "../lib/print";
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

const pct = (n: number) => `${n * 100}%`;

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
  const spreads = useMemo(() => toSpreads(pages), [pages]);
  const [si, setSi] = useState(0);
  const [sel, setSel] = useState("");
  const [guides, setGuides] = useState(true);
  const [seed, setSeed] = useState(1);
  const sliding = useRef(false);

  const s = Math.min(si, Math.max(0, spreads.length - 1));
  const spread = spreads[s];
  const sheet = spreadMm(preset);
  const inAlbum = useMemo(() => new Set(album.order), [album.order]);
  const anyPicked = useMemo(() => photos.some((p) => p.pick === true), [photos]);
  const [trayAll, setTrayAll] = useState(!anyPicked);
  const tray = useMemo(() => photos.filter((p) => (trayAll || p.pick === true) && !inAlbum.has(p.id)), [photos, inAlbum, trayAll]);
  const blanks = useMemo(() => album.order.filter(isEmpty).length, [album.order]);
  const warnings = useMemo(() => lowResWarnings(pages, byId, place, preset), [pages, byId, place, preset]);

  const selPage: LaidPage | null = (sel && pages.find((p) => p.ids.includes(sel))) || spread?.left || (spread?.right?.side === 1 ? spread.right : null);
  const joined = selPage?.side === "both";
  const selPhoto = sel ? byId.get(sel) : undefined;
  const selOnSpread = !!sel && !!selPage && (selPage === spread?.left || selPage === spread?.right);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); redo(); }
      else if (k === "arrowright") setSi((i) => Math.min(spreads.length - 1, i + 1));
      else if (k === "arrowleft") setSi((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [undo, redo, spreads.length]);

  const setAlbum = (a: typeof album) => { if (a !== album) commit({ album: a, place }); };
  const setPage = (i: number, patch: Partial<{ locked: boolean }>) =>
    setAlbum({ ...album, pages: album.pages.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setPlace = (id: string, patch: Partial<Placement>) => {
    commit({ album, place: { ...place, [id]: { ...(place[id] ?? CENTER), ...patch } } }, sliding.current);
    sliding.current = true;
  };
  const endSlide = () => { sliding.current = false; };
  const drop = (onto: string, dragged: string) => {
    if (!dragged || dragged === onto) return;
    setAlbum(inAlbum.has(dragged) ? swapPhotos(album, onto, dragged) : replacePhoto(album, onto, dragged));
    setSel(inAlbum.has(dragged) ? dragged : dragged);
  };

  const cell = (pg: LaidPage, k: number) => {
    const id = pg.ids[k], ph = byId.get(id), pl = place[id] ?? CENTER;
    const r = cellRectMm(preset, pg.side as 0 | 1 | "both", pg.tpl!.cols, pg.tpl!.rows, pg.tpl!.cells[k]);
    const box: CSSProperties = { left: pct(r.x / sheet.w), top: pct(r.y / sheet.h), width: pct(r.w / sheet.w), height: pct(r.h / sheet.h) };
    const pos = `${pl.x * 100}% ${pl.y * 100}%`;
    return (
      <button key={id} type="button" className={ph ? "cell" : "cell blank"} style={box} aria-pressed={sel === id}
        aria-label={ph ? `Foto ${ph.name}, halaman ${pageNo(pg)}` : `Bingkai kosong ${k + 1}, halaman ${pageNo(pg)}`}
        draggable={!!ph} onClick={() => setSel(id)}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); drop(id, e.dataTransfer.getData("text/plain")); }}>
        {ph?.thumb && <img src={ph.thumb} alt="" draggable={false} style={{ objectPosition: pos, transformOrigin: pos, transform: `scale(${pl.z})` }} />}
        {!ph && <span>Seret foto ke sini</span>}
      </button>
    );
  };

  const selRect = selOnSpread && selPage?.tpl && selPhoto
    ? cellRectMm(preset, selPage.side as 0 | 1 | "both", selPage.tpl.cols, selPage.tpl.rows, selPage.tpl.cells[selPage.ids.indexOf(sel)])
    : null;
  const selDpi = selRect && selPhoto?.w ? Math.round(effectiveDpi(selPhoto.w, selPhoto.h, selRect, place[sel] ?? CENTER)) : 0;
  const selPl = place[sel] ?? CENTER;

  return (
    <>
      <div className="tools">
        <button type="button" className="btn" disabled={!canUndo} onClick={undo}>Urungkan</button>
        <button type="button" className="btn" disabled={!canRedo} onClick={redo}>Ulangi</button>
        <span className="sep" aria-hidden="true" />
        <label className="check"><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Garis potong &amp; zona aman</label>
        <span className="right" />
        <button type="button" className="btn" onClick={() => { setAlbum(shuffleTemplates(album, pages, seed)); setSeed(seed + 1); }}>Acak ulang album</button>
        <button type="button" className="btn" onClick={() => { setAlbum(addPage(addPage(album))); setSi(spreads.length); setSel(""); }}>Tambah spread kosong</button>
        <button type="button" className="btn" disabled={!canRebuild} title={canRebuild ? undefined : "Pilih foto dulu di Kurasi"}
          onClick={() => { if (confirm("Susun otomatis dari foto terpilih? Tata letak sekarang masih bisa dikembalikan dengan Urungkan.")) onRebuild(); }}>Susun otomatis</button>
        <button type="button" className="btn primary" onClick={onExport}>Ekspor</button>
      </div>

      <div className="work">
        <aside className="panel" aria-label="Foto yang belum dipakai">
          <h2>Belum dipakai · {tray.length}</h2>
          <div className="seg" role="group" aria-label="Foto yang ditampilkan">
            <button type="button" className="btn" aria-pressed={!trayAll} onClick={() => setTrayAll(false)}>Dipilih</button>
            <button type="button" className="btn" aria-pressed={trayAll} onClick={() => setTrayAll(true)}>Semua foto</button>
          </div>
          {tray.length === 0 ? <p className="dim">{trayAll ? "Semua foto sudah ada di album." : "Semua foto terpilih sudah ada di album."}</p> : (
            <div className="tray">
              {tray.map((p) => (
                <div key={p.id} className="thumb" draggable title={p.name}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; }}>
                  {p.thumb && <img src={p.thumb} alt={p.name} draggable={false} loading="lazy" />}
                </div>
              ))}
            </div>
          )}
          <p className="dim">Seret foto ke bingkai untuk mengisi atau menggantinya. Seret antar bingkai untuk menukar.</p>
        </aside>

        <main className="stage dark">
          {spread && (
            <div className="sheetwrap">
              <div className="pagenos"><span>Halaman {s * 2 + 1}</span>{spread.left?.side === "both" && <span>dua halaman menyambung</span>}<span>Halaman {s * 2 + 2}</span></div>
              <div className="sheet" style={{ aspectRatio: `${sheet.w} / ${sheet.h}`, background: preset.bg }} onClick={(e) => { if (e.target === e.currentTarget) setSel(""); }}>
                {spread.left?.tpl && spread.left.ids.map((_, k) => cell(spread.left!, k))}
                {spread.right?.tpl && spread.right.side === 1 && spread.right.ids.map((_, k) => cell(spread.right!, k))}
                {guides && (
                  <>
                    <div className="trim" style={{ inset: `${pct(preset.bleedMm / sheet.h)} ${pct(preset.bleedMm / sheet.w)}` }} />
                    <div className="fold" />
                    {[0, 1].map((side) => (
                      <div key={side} className="safe" style={{
                        left: pct((preset.bleedMm + side * preset.pageWmm + preset.safeMm) / sheet.w), top: pct((preset.bleedMm + preset.safeMm) / sheet.h),
                        width: pct((preset.pageWmm - 2 * preset.safeMm) / sheet.w), height: pct((preset.pageHmm - 2 * preset.safeMm) / sheet.h),
                      }} />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
          <div className="spreads" role="tablist" aria-label="Spread">
            {spreads.map((sp, i) => (
              <button key={i} type="button" role="tab" aria-selected={i === s} className="spreadtab" onClick={() => { setSi(i); setSel(""); }}>
                {i * 2 + 1}–{i * 2 + 2}
                {sp.left?.side === "both" ? " · sambung" : ""}{(sp.left?.cfg.locked || sp.right?.cfg.locked) ? " · kunci" : ""}
              </button>
            ))}
          </div>
        </main>

        <aside className="panel" aria-label="Properti">
          {selPage && (
            <>
              <h2>Tata letak · {joined ? `halaman ${pageNo(selPage)}–${pageNo(selPage) + 1}` : `halaman ${pageNo(selPage)}`}</h2>
              <button type="button" className="btn" aria-pressed={joined}
                onClick={() => { setAlbum(joined ? splitPages(album, selPage.index) : joinPages(album, selPage.side === 1 ? selPage.index - 1 : selPage.index)); setSel(""); }}>
                {joined ? "Pisahkan jadi dua halaman" : "Sambung dua halaman"}
              </button>
              {joined && preset.binding === "biasa" && <div className="warn">Jilid biasa: bagian foto di lipatan bisa tertelan jilid. Ubah jenis jilid di Ekspor kalau albumnya layflat.</div>}
              <div className="five" role="group" aria-label="Jumlah foto">
                {countsFor(joined).map((n) => (
                  <button key={n} type="button" className="btn" aria-pressed={selPage.cfg.n === n} aria-label={`${n} foto`}
                    onClick={() => setAlbum(setCount(album, selPage.index, n))}>{n}</button>
                ))}
              </div>
              <div className={joined ? "tpls wide" : "tpls"}>
                {templatesFor(selPage.ids.length, joined).map((t) => (
                  <button key={t.id} type="button" className="tpl" aria-pressed={selPage.tpl?.id === t.id} aria-label={t.label} title={t.label}
                    onClick={() => setAlbum(applyTpl(album, selPage.index, t))}
                    style={{ gridTemplateColumns: `repeat(${t.cols}, 1fr)`, gridTemplateRows: `repeat(${t.rows}, 1fr)` }}>
                    {t.cells.map(([c, r, cs, rs], k) => <span key={k} style={{ gridColumn: `${c + 1} / span ${cs}`, gridRow: `${r + 1} / span ${rs}` }} />)}
                  </button>
                ))}
              </div>
              <button type="button" className="btn" onClick={() => setMaking(true)}>Buat template sendiri…</button>
              <div className="two">
                <button type="button" className="btn" disabled={!!selPage.cfg.locked} onClick={() => { setAlbum(shuffleTemplates(album, pages, seed, selPage.index)); setSeed(seed + 1); }}>Acak halaman</button>
                <button type="button" className="btn" aria-pressed={!!selPage.cfg.locked} onClick={() => setPage(selPage.index, { locked: !selPage.cfg.locked })}>
                  {selPage.cfg.locked ? "Terkunci" : "Kunci"}
                </button>
              </div>
            </>
          )}

          <h2>Halaman</h2>
          <div className="two">
            <label className="field">Margin (%)
              <input type="number" min={0} max={20} step={0.5} value={preset.marginPct} onChange={(e) => setPreset({ ...preset, marginPct: Math.min(20, Math.max(0, +e.target.value || 0)) })} />
            </label>
            <label className="field">Jarak foto (%)
              <input type="number" min={0} max={10} step={0.5} value={preset.gapPct} onChange={(e) => setPreset({ ...preset, gapPct: Math.min(10, Math.max(0, +e.target.value || 0)) })} />
            </label>
          </div>
          <label className="field">Latar
            <input type="color" value={preset.bg} onChange={(e) => setPreset({ ...preset, bg: e.target.value })} />
          </label>

          {selOnSpread && selPhoto && (
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
              <button type="button" className="btn" onClick={() => { setAlbum(clearFrame(album, sel)); setSel(""); }}>Kosongkan bingkai</button>
              <button type="button" className="btn" onClick={() => { setAlbum(removePhoto(album, sel)); setSel(""); }}>Hapus bingkai</button>
            </>
          )}
          {selOnSpread && isEmpty(sel) && (
            <>
              <h2>Bingkai kosong</h2>
              <p className="dim">Seret foto dari kiri ke bingkai ini.</p>
              <button type="button" className="btn" onClick={() => { setAlbum(removePhoto(album, sel)); setSel(""); }}>Hapus bingkai</button>
            </>
          )}
        </aside>
      </div>
      {making && (
        <TemplateEditor preset={preset} custom={custom} setCustom={setCustom} startSpread={joined} onClose={() => setMaking(false)}
          onUse={(t) => { if (selPage && !!t.spread === joined) setAlbum(applyTpl(album, selPage.index, t)); }} />
      )}
      <footer className="status">
        <span>Spread {s + 1} dari {spreads.length}</span><span>{spreads.length * 2} halaman</span>
        <span>{album.order.length - blanks} foto di album</span>
        {blanks > 0 && <span>{blanks} bingkai kosong</span>}
        {warnings.length > 0 && <span className="warn">{warnings.length} foto beresolusi rendah</span>}
        <span className="right">← → pindah spread · Ctrl+Z urungkan</span>
      </footer>
    </>
  );
}
