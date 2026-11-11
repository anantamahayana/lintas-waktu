import { SIZES, type Preset } from "../lib/print";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Every print property of an album. Used when a project is made and again on the export screen. */
export function PresetForm({ preset, setPreset }: { preset: Preset; setPreset: (p: Preset) => void }) {
  const landscape = preset.pageWmm >= preset.pageHmm;
  const long = Math.max(preset.pageWmm, preset.pageHmm), short = Math.min(preset.pageWmm, preset.pageHmm);
  const sizeId = SIZES.find((s) => s.w === long && s.h === short)?.id ?? "custom";
  const num = (key: keyof Preset, lo: number, hi: number) => ({
    type: "number" as const, min: lo, max: hi, value: preset[key] as number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPreset({ ...preset, [key]: clamp(+e.target.value || 0, lo, hi) }),
  });
  return (
    <div className="form-stack">
      <fieldset>
        <legend>Ukuran</legend>
        <label className="field">Ukuran halaman
          <select value={sizeId} onChange={(e) => {
            const s = SIZES.find((x) => x.id === e.target.value);
            if (s) setPreset({ ...preset, pageWmm: landscape ? s.w : s.h, pageHmm: landscape ? s.h : s.w });
          }}>
            {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            <option value="custom">Ukuran bebas</option>
          </select>
        </label>
        <label className="field">Orientasi
          <select value={landscape ? "l" : "p"} onChange={(e) => {
            const l = e.target.value === "l";
            setPreset({ ...preset, pageWmm: l ? long : short, pageHmm: l ? short : long });
          }}>
            <option value="l">Mendatar</option>
            <option value="p">Tegak</option>
          </select>
        </label>
        <label className="field">Lebar halaman (mm)<input {...num("pageWmm", 50, 600)} /></label>
        <label className="field">Tinggi halaman (mm)<input {...num("pageHmm", 50, 600)} /></label>
        <label className="field">Jumlah halaman<input {...num("pages", 2, 200)} step={2} /></label>
        <label className="field">Jilid
          <select value={preset.binding} onChange={(e) => setPreset({ ...preset, binding: e.target.value as Preset["binding"] })}>
            <option value="layflat">Menyambung (layflat): foto boleh melintasi lipatan</option>
            <option value="biasa">Jilid biasa: lipatan tertelan jilid</option>
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>Batas cetak</legend>
        <label className="field">Bleed (mm)<input {...num("bleedMm", 0, 10)} /></label>
        <label className="field">Zona aman (mm)<input {...num("safeMm", 0, 30)} /></label>
        <label className="field">Resolusi (dpi)<input {...num("dpi", 72, 600)} /></label>
      </fieldset>
      <fieldset>
        <legend>Tampilan</legend>
        <label className="field">Margin halaman (%)<input {...num("marginPct", 0, 20)} step={0.5} /></label>
        <label className="field">Jarak antar foto (%)<input {...num("gapPct", 0, 10)} step={0.5} /></label>
        <label className="field">Latar halaman<input type="color" value={preset.bg} onChange={(e) => setPreset({ ...preset, bg: e.target.value })} /></label>
      </fieldset>
    </div>
  );
}
