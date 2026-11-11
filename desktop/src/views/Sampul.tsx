import { useEffect, useMemo, useRef, useState } from "react";
import type { Design } from "../App";
import { coverMm, coverParts, DEFAULT_COVER, drawCover, fromThumb, type Cover } from "../lib/cover";
import type { Photo } from "../lib/photos";
import { CENTER, type Placement, type Preset } from "../lib/print";
import { FONTS } from "../lib/layout";

type Props = {
  photos: Photo[];
  design: Design;
  commit: (d: Design, replace?: boolean) => void;
  preset: Preset;
  setPreset: (p: Preset) => void;
};

const pct = (n: number) => `${n * 100}%`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The cover: pick photos for front and back, set the title, spine and board wrap. */
export function Sampul({ photos, design, commit, preset, setPreset }: Props) {
  const cover = design.cover ?? DEFAULT_COVER;
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const [img, setImg] = useState("");
  const [all, setAll] = useState(false);
  const [side, setSide] = useState<"front" | "back">("front");
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
        // Swap in the new render, then free the old one (never blank the picture while redrawing).
        setImg((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
      } catch (e) { console.error("cover preview", e); }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [cover, byId, preset]);

  const list = useMemo(() => {
    const picked = photos.filter((p) => p.pick === true);
    return all || !picked.length ? photos : picked;
  }, [photos, all]);
  const sheet = coverMm(preset), parts = coverParts(preset);
  const box = (r: { x: number; y: number; w: number; h: number }) => ({ left: pct(r.x / sheet.w), top: pct(r.y / sheet.h), width: pct(r.w / sheet.w), height: pct(r.h / sheet.h) });
  const placeKey = side === "front" ? "frontPlace" : "backPlace";
  const pl: Placement = cover[placeKey] ?? CENTER;
  const chosen = side === "front" ? cover.front : cover.back;

  const drop = (zone: "front" | "back", id: string) => {
    if (!byId.has(id)) return;
    setSide(zone);
    set(zone === "front" ? { front: id, frontPlace: CENTER } : { back: id, backPlace: CENTER });
  };

  return (
    <div className="work">
      <aside className="panel" aria-label="Foto">
        <h2>Foto</h2>
        <div className="seg" role="group" aria-label="Foto yang ditampilkan">
          <button type="button" className="btn" aria-pressed={!all} onClick={() => setAll(false)}>Dipilih</button>
          <button type="button" className="btn" aria-pressed={all} onClick={() => setAll(true)}>Semua</button>
        </div>
        <div className="tray">
          {list.map((p) => (
            <button key={p.id} type="button" className="thumb" title={p.name} aria-label={`Pakai ${p.name} untuk sampul ${side === "front" ? "depan" : "belakang"}`}
              aria-current={p.id === chosen} draggable
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "copy"; }}
              onClick={() => drop(side, p.id)}>
              {p.thumb && <img src={p.thumb} alt="" loading="lazy" draggable={false} />}
            </button>
          ))}
        </div>
        <p className="dim">Klik foto untuk sisi yang aktif, atau seret ke sampul depan/belakang.</p>
      </aside>

      <main className="stage dark">
        <div className="sheetwrap">
          <div className="pagenos"><span>Belakang</span><span>Punggung {preset.spineMm} mm</span><span>Depan</span></div>
          <div className="sheet" style={{ aspectRatio: `${sheet.w} / ${sheet.h}`, background: cover.bg }}>
            {img && <img className="coverimg" src={img} alt="Pratinjau sampul" />}
            {(["back", "front"] as const).map((z) => (
              <button key={z} type="button" className="zone" aria-pressed={side === z} aria-label={z === "front" ? "Sampul depan" : "Sampul belakang"}
                style={box(parts[z])} onClick={() => setSide(z)}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); drop(z, e.dataTransfer.getData("text/plain")); }} />
            ))}
            <div className="trim" style={{ inset: `${pct(sheet.edge / sheet.h)} ${pct(sheet.edge / sheet.w)}` }} />
            <div className="spine" style={box(parts.spine)} />
          </div>
          <p className="dim">Garis merah: tepi potong. {preset.wrapMm > 0 ? `Di luar garis ada ${preset.wrapMm} mm lipatan ke balik papan sampul.` : ""}</p>
        </div>
      </main>

      <aside className="panel" aria-label="Pengaturan sampul">
        <h2>Sisi {side === "front" ? "depan" : "belakang"}</h2>
        <div className="seg" role="group" aria-label="Sisi">
          <button type="button" className="btn" aria-pressed={side === "front"} onClick={() => setSide("front")}>Depan</button>
          <button type="button" className="btn" aria-pressed={side === "back"} onClick={() => setSide("back")}>Belakang</button>
        </div>
        {side === "front" && (
          <label className="field">Gaya foto depan
            <select value={cover.frontStyle} onChange={(e) => set({ frontStyle: e.target.value as Cover["frontStyle"] })}>
              <option value="full">Penuh sampai tepi</option>
              <option value="frame">Berbingkai, judul di bawah</option>
            </select>
          </label>
        )}
        {chosen ? (
          <>
            <label className="field">Perbesar<input type="range" min={1} max={3} step={0.01} value={pl.z} onChange={(e) => slide({ [placeKey]: { ...pl, z: +e.target.value } })} onPointerUp={endSlide} onKeyUp={endSlide} onBlur={endSlide} /></label>
            <label className="field">Geser mendatar<input type="range" min={0} max={1} step={0.01} value={pl.x} onChange={(e) => slide({ [placeKey]: { ...pl, x: +e.target.value } })} onPointerUp={endSlide} onKeyUp={endSlide} onBlur={endSlide} /></label>
            <label className="field">Geser tegak<input type="range" min={0} max={1} step={0.01} value={pl.y} onChange={(e) => slide({ [placeKey]: { ...pl, y: +e.target.value } })} onPointerUp={endSlide} onKeyUp={endSlide} onBlur={endSlide} /></label>
            <button type="button" className="btn" onClick={() => set(side === "front" ? { front: undefined } : { back: undefined })}>Lepas foto</button>
          </>
        ) : <p className="dim">Belum ada foto di sisi ini.</p>}

        <h2>Tulisan</h2>
        <label className="field">Judul<input type="text" value={cover.title} placeholder="mis. Ayu & Made" onChange={(e) => set({ title: e.target.value }, true)} /></label>
        <label className="field">Keterangan<input type="text" value={cover.subtitle} placeholder="mis. 12 Juni 2026 · Ubud" onChange={(e) => set({ subtitle: e.target.value }, true)} /></label>
        <div className="two">
          <label className="field">Huruf judul
            <select value={cover.titleFont ?? "Cormorant Garamond"} onChange={(e) => set({ titleFont: e.target.value })}>
              {FONTS.map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}
            </select>
          </label>
          <label className="field">Huruf keterangan
            <select value={cover.subFont ?? "Montserrat"} onChange={(e) => set({ subFont: e.target.value })}>
              {FONTS.map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}
            </select>
          </label>
        </div>
        <div className="two">
          <label className="field">Posisi
            <select value={cover.textPos} disabled={cover.frontStyle === "frame"} onChange={(e) => set({ textPos: e.target.value as Cover["textPos"] })}>
              <option value="atas">Atas</option><option value="tengah">Tengah</option><option value="bawah">Bawah</option>
            </select>
          </label>
          <label className="field">Warna tulisan<input type="color" value={cover.textColor} onChange={(e) => set({ textColor: e.target.value }, true)} /></label>
        </div>
        <label className="check"><input type="checkbox" checked={cover.spineText} onChange={(e) => set({ spineText: e.target.checked })} /> Judul di punggung</label>
        <label className="field">Warna sampul<input type="color" value={cover.bg} onChange={(e) => set({ bg: e.target.value }, true)} /></label>

        <h2>Ukuran sampul</h2>
        <div className="two">
          <label className="field">Punggung (mm)<input type="number" min={0} max={80} value={preset.spineMm} onChange={(e) => setPreset({ ...preset, spineMm: clamp(+e.target.value || 0, 0, 80) })} /></label>
          <label className="field">Lipatan papan (mm)<input type="number" min={0} max={30} value={preset.wrapMm} onChange={(e) => setPreset({ ...preset, wrapMm: clamp(+e.target.value || 0, 0, 30) })} /></label>
        </div>
        <p className="dim">Punggung dan lipatan papan berbeda tiap percetakan dan jumlah halaman; tanyakan angkanya. Hardcover biasanya dilipat 15–18 mm.</p>
      </aside>
    </div>
  );
}
