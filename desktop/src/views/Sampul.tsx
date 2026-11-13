import { useEffect, useMemo, useRef, useState } from "react";
import type { Design } from "../App";
import { coverMm, coverParts, DEFAULT_COVER, drawCover, fromThumb, type Cover } from "../lib/cover";
import { Icon } from "../lib/icons";
import { useCommands } from "../lib/keys";
import type { Photo } from "../lib/photos";
import { CENTER, type Placement, type Preset } from "../lib/print";
import { FONTS } from "../lib/layout";
import { ColorField } from "./Editor";
import { Btn, IconBtn, NumField, Row, Section, Seg, StatusBar } from "./Shell";

type Props = {
  photos: Photo[];
  design: Design;
  commit: (d: Design, replace?: boolean) => void;
  preset: Preset;
  setPreset: (p: Preset) => void;
  panels: boolean;
};

const pct = (n: number) => `${n * 100}%`;

/** The cover (Figma page 06): photos for front and back, title, spine and board wrap. */
export function Sampul({ photos, design, commit, preset, setPreset, panels }: Props) {
  const cover = design.cover ?? DEFAULT_COVER;
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const [img, setImg] = useState("");
  const [all, setAll] = useState(false);
  const [side, setSide] = useState<"front" | "back">("front");
  const [guides, setGuides] = useState(true);
  const [over, setOver] = useState<"" | "front" | "back">("");
  const sliding = useRef(false);

  const set = (patch: Partial<Cover>, replace = false) => commit({ ...design, cover: { ...cover, ...patch } }, replace);
  const slide = (patch: Partial<Cover>) => { set(patch, sliding.current); sliding.current = true; };
  const endSlide = () => { sliding.current = false; };

  // A small on-screen render from the thumbnails, redrawn shortly after each change.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const canvas = await drawCover(cover, byId, preset, 40, fromThumb);
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
        if (!alive) return;
        setImg((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
      } catch (e) { console.error("cover preview", e); }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [cover, byId, preset]);

  const list = useMemo(() => { const picked = photos.filter((p) => p.pick === true); return all || !picked.length ? photos : picked; }, [photos, all]);
  const sheet = coverMm(preset), parts = coverParts(preset);
  const box = (r: { x: number; y: number; w: number; h: number }) => ({ left: pct(r.x / sheet.w), top: pct(r.y / sheet.h), width: pct(r.w / sheet.w), height: pct(r.h / sheet.h) });
  const pano = !!cover.panorama;
  const sideNow: "front" | "back" = pano ? "front" : side;
  const placeKey = sideNow === "front" ? "frontPlace" : "backPlace";
  const pl: Placement = cover[placeKey] ?? CENTER;
  const chosen = sideNow === "front" ? cover.front : cover.back;
  const drop = (zone: "front" | "back", id: string) => { if (!byId.has(id)) return; if (pano) zone = "front"; setSide(zone); set(zone === "front" ? { front: id, frontPlace: CENTER } : { back: id, backPlace: CENTER }); };
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const place = (patch: Partial<Placement>, replace = false) => set({ [placeKey]: { ...pl, ...patch } }, replace);
  const togglePano = () => { set(pano ? { panorama: false } : { panorama: true, front: cover.front ?? cover.back, frontPlace: cover.front ? cover.frontPlace : cover.backPlace }); setSide("front"); };
  useCommands({
    "s.side": { run: () => setSide((s) => (s === "front" ? "back" : "front")), enabled: !pano },
    "s.pano": { run: togglePano, checked: pano },
    "s.swap": { run: () => set({ front: cover.back, back: cover.front, frontPlace: cover.backPlace, backPlace: cover.frontPlace }), enabled: !pano && !!(cover.front || cover.back) },
    "s.clear": { run: () => set(sideNow === "front" ? { front: undefined } : { back: undefined }), enabled: !!chosen },
    "s.reset": { run: () => place(CENTER), enabled: !!chosen },
    "s.nudge": { run: (c) => { const st = c?.startsWith("Shift+") ? 0.05 : 0.01, k = (c ?? "").replace("Shift+", ""); const d = ({ Left: [-st, 0], Right: [st, 0], Up: [0, -st], Down: [0, st] } as Record<string, number[]>)[k]; if (d) place({ x: clamp(pl.x + d[0], 0, 1), y: clamp(pl.y + d[1], 0, 1) }); }, enabled: !!chosen },
    "s.zoomIn": { run: () => place({ z: clamp(pl.z + 0.05, 1, 3) }), enabled: !!chosen },
    "s.zoomOut": { run: () => place({ z: clamp(pl.z - 0.05, 1, 3) }), enabled: !!chosen },
  });
  // Drag the photo to move it inside its area; pinch / Ctrl+wheel over it zooms it.
  const drag = useRef<{ x: number; y: number; pl: Placement; w: number; h: number; moved: boolean } | null>(null);
  const plRef = useRef(pl); plRef.current = pl;
  const wheelOn = useRef<(e: WheelEvent) => void>(() => {});
  wheelOn.current = (e) => {
    if (!e.ctrlKey || !chosen) return;
    e.preventDefault();
    const p0 = plRef.current;
    slide({ [placeKey]: { ...p0, z: clamp(p0.z * Math.exp(-e.deltaY * (Math.abs(e.deltaY) < 50 ? 0.01 : 0.001)), 1, 3) } });
    clearTimeout(wheelEnd.current); wheelEnd.current = window.setTimeout(endSlide, 300);
  };
  const wheelEnd = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sheetRef.current; if (!el) return;
    const fn = (e: WheelEvent) => wheelOn.current(e);
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, []);
  const aspect = sheet.w / sheet.h;
  const slider = (value: number, min: number, max: number, on: (v: number) => void, show: string) => (
    <div className="slider"><input type="range" min={min} max={max} step={0.01} value={value} onChange={(e) => on(+e.target.value)} onPointerUp={endSlide} onKeyUp={endSlide} onBlur={endSlide} /><span className="val">{show}</span></div>
  );

  return (
    <>
      <div className={`work ${panels ? "" : "no-panels"}`}>
        <aside className="side" aria-label="Foto">
          <div className="tabs-h" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Seg full items={[{ v: "pick", label: "Dipilih" }, { v: "all", label: "Semua" }]} value={all ? "all" : "pick"} onChange={(v) => setAll(v === "all")} />
            <span className="caption">{pano ? "Klik foto = pasang sebagai panorama." : <>Klik foto = pasang di sisi {side === "front" ? "depan" : "belakang"}. Seret ke depan/belakang.</>}</span>
          </div>
          <div className="scroll">
            <div className="tray">
              {list.slice(0, 600).map((p) => (
                <button key={p.id} type="button" className={`pt bare ${p.id === chosen ? "cur" : ""}`} title={p.name} draggable aria-label={`Pakai ${p.name}`}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "copy"; }}
                  onClick={() => drop(side, p.id)}>
                  {p.thumb && <img src={p.thumb} alt="" loading="lazy" draggable={false} />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="center">
          <div className="optbar">
            {!pano && <Seg items={[{ v: "back", label: "Belakang" }, { v: "front", label: "Depan" }]} value={side} onChange={setSide} label="Sisi" />}
            <Btn label={pano ? "Pisahkan" : "Panorama"} icon={pano ? "unlink-2" : "link-2"} kind="ghost" cmd="s.pano" />
            {!pano && <Btn label="Tukar foto" icon="refresh-cw" kind="ghost" cmd="s.swap" />}
            <span className="vdiv" />
            <IconBtn icon="grid-3x3" tip="Garis bantu" on={guides} onClick={() => setGuides(!guides)} />
            <span className="grow" /><span className="caption">Seret foto = geser · pinch / Ctrl+roda = perbesar · klik dua kali = pusatkan</span>
            <span className="vdiv" /><IconBtn icon="panel-left" cmd="app.panels" />
          </div>
          <div className="canvas" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 40px" }}>
            <div className="sheetbox" style={{ width: `min(100%, calc((100vh - 300px) * ${aspect}))` }}>
              <div className="pagenos">
                <span style={{ width: pct(parts.back.w / sheet.w), textAlign: "center" }}>Belakang</span>
                <span>Punggung {preset.spineMm} mm</span>
                <span style={{ width: pct(parts.front.w / sheet.w), textAlign: "center" }}>Depan</span>
              </div>
              <div ref={sheetRef} className="sheet" style={{ aspectRatio: `${sheet.w} / ${sheet.h}`, background: cover.bg }}>
                {img && <img className="coverimg" src={img} alt="Pratinjau sampul" />}
                {(pano ? (["front"] as const) : (["back", "front"] as const)).map((zn) => (
                  <button key={zn} type="button" className={`zone ${sideNow === zn ? "on" : ""} ${over === zn ? "over" : ""} ${chosen && sideNow === zn ? "movable" : ""}`} aria-pressed={sideNow === zn} aria-label={pano ? "Sampul panorama" : zn === "front" ? "Sampul depan" : "Sampul belakang"}
                    style={pano ? box({ x: 0, y: 0, w: sheet.w, h: sheet.h }) : box(parts[zn])}
                    onClick={() => { if (!drag.current?.moved) setSide(zn); }}
                    onDoubleClick={() => { if (chosen && sideNow === zn) place(CENTER); }}
                    onPointerDown={(e) => { if (e.button !== 0 || sideNow !== zn || !chosen) return; const r = e.currentTarget.getBoundingClientRect(); drag.current = { x: e.clientX, y: e.clientY, pl, w: r.width, h: r.height, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }}
                    onPointerMove={(e) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!d.moved && Math.hypot(dx, dy) < 3) return; d.moved = true; slide({ [placeKey]: { ...d.pl, x: clamp(d.pl.x - dx / d.w / d.pl.z, 0, 1), y: clamp(d.pl.y - dy / d.h / d.pl.z, 0, 1) } }); }}
                    onPointerUp={() => { endSlide(); setTimeout(() => { drag.current = null; }, 0); }}
                    onDragOver={(e) => { e.preventDefault(); setOver(zn); }} onDragLeave={() => setOver("")}
                    onDrop={(e) => { e.preventDefault(); setOver(""); drop(zn, e.dataTransfer.getData("text/plain")); }} />
                ))}
                {guides && <>
                  {preset.wrapMm > 0 && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `inset 0 0 0 ${(preset.wrapMm / sheet.w) * 100}cqw rgba(0,0,0,0.28)` }} />}
                  <div className="trim" style={{ inset: `${pct(sheet.edge / sheet.h)} ${pct(sheet.edge / sheet.w)}` }} />
                  <div className="spine" style={box(parts.spine)} />
                </>}
              </div>
            </div>
            {guides && <div className="canvas-ovl leg"><span><i style={{ background: "var(--bleed)" }} />Tepi papan</span><span><i style={{ background: "var(--safe)" }} />Punggung</span>{preset.wrapMm > 0 && <span><i style={{ background: "#555", height: 8 }} />Lipatan {preset.wrapMm} mm</span>}</div>}
          </div>
        </main>

        <aside className="props" aria-label="Pengaturan sampul">
          <div className="scroll">
            <Section id="s-photo" title={pano ? "Foto panorama" : `Foto ${side === "front" ? "depan" : "belakang"}`}>
              <label className="ck"><input type="checkbox" checked={pano} onChange={togglePano} />Panorama (satu foto belakang–depan)</label>
              {sideNow === "front" && !pano && <Row label="Gaya"><select value={cover.frontStyle} onChange={(e) => set({ frontStyle: e.target.value as Cover["frontStyle"] })}>
                <option value="full">Penuh sampai tepi</option><option value="frame">Berbingkai, judul di bawah</option></select></Row>}
              {chosen ? (
                <>
                  <Row label="Perbesar">{slider(pl.z, 1, 3, (v) => slide({ [placeKey]: { ...pl, z: v } }), `${Math.round(pl.z * 100)}%`)}</Row>
                  <Row label="Geser datar">{slider(pl.x, 0, 1, (v) => slide({ [placeKey]: { ...pl, x: v } }), `${Math.round(pl.x * 100)}%`)}</Row>
                  <Row label="Geser tegak">{slider(pl.y, 0, 1, (v) => slide({ [placeKey]: { ...pl, y: v } }), `${Math.round(pl.y * 100)}%`)}</Row>
                  <div className="hrow"><Btn label="Pusatkan" icon="move" cmd="s.reset" /><Btn label="Lepas foto" icon="x" cmd="s.clear" /></div>
                </>
              ) : <p className="caption">Belum ada foto di sisi ini. Klik foto di panel kiri.</p>}
            </Section>
            <Section id="s-text" title="Tulisan">
              <Row label="Judul"><input type="text" value={cover.title} placeholder="mis. Ayu & Made" onChange={(e) => set({ title: e.target.value }, true)} style={{ width: "100%" }} /></Row>
              <Row label="Keterangan"><input type="text" value={cover.subtitle} placeholder="mis. 12 Juni 2026 · Ubud" onChange={(e) => set({ subtitle: e.target.value }, true)} style={{ width: "100%" }} /></Row>
              <Row label="Huruf judul"><select value={cover.titleFont ?? "Cormorant Garamond"} onChange={(e) => set({ titleFont: e.target.value })} style={{ fontFamily: `"${cover.titleFont ?? "Cormorant Garamond"}"` }}>
                {FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.family}</option>)}</select></Row>
              <Row label="Huruf ket."><select value={cover.subFont ?? "Montserrat"} onChange={(e) => set({ subFont: e.target.value })} style={{ fontFamily: `"${cover.subFont ?? "Montserrat"}"` }}>
                {FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.family}</option>)}</select></Row>
              <Row label="Posisi"><Seg full value={cover.textPos} onChange={(v) => set({ textPos: v })} items={[{ v: "atas", label: "Atas" }, { v: "tengah", label: "Tengah" }, { v: "bawah", label: "Bawah" }]} /></Row>
              <Row label="Warna"><ColorField value={cover.textColor} onChange={(v) => set({ textColor: v }, true)} /></Row>
              <label className="ck"><input type="checkbox" checked={cover.spineText} onChange={(e) => set({ spineText: e.target.checked })} />Judul di punggung</label>
            </Section>
            <Section id="s-size" title="Bahan & ukuran">
              <Row label="Warna sampul"><ColorField value={cover.bg} onChange={(v) => set({ bg: v }, true)} /></Row>
              <Row label="Punggung"><NumField value={preset.spineMm} min={0} max={80} unit="mm" onChange={(v) => setPreset({ ...preset, spineMm: v })} /></Row>
              <Row label="Lipatan papan"><NumField value={preset.wrapMm} min={0} max={30} unit="mm" onChange={(v) => setPreset({ ...preset, wrapMm: v })} /></Row>
              <div className="note"><Icon name="info" size={14} />Punggung dan lipatan berbeda tiap percetakan dan jumlah halaman; tanyakan angkanya. Hardcover umumnya dilipat 15–18 mm.</div>
            </Section>
          </div>
        </aside>
      </div>
      <StatusBar left={`Sampul · ${Math.round(sheet.w)} × ${Math.round(sheet.h)} mm (belakang ${preset.pageWmm} + punggung ${preset.spineMm} + depan ${preset.pageWmm}${preset.wrapMm ? ` + lipatan ${preset.wrapMm}` : ""} + bleed ${preset.bleedMm})`}
        right={<span className="dimtext">{pano ? "Panorama" : `Sisi ${side === "front" ? "depan" : "belakang"}`}</span>} />
    </>
  );
}
