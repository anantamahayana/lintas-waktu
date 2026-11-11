import { useState } from "react";
import { ask, tell } from "../lib/ask";
import { saveFile } from "../lib/export";
import { SIZES, type Preset } from "../lib/print";

/** Named print settings (e.g. one per printer), shared by every project on this computer. */
const KEY = "lwalbum:presets";
type Named = { name: string; preset: Preset };
const loadNamed = (): Named[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const storeNamed = (list: Named[]) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full */ } };
/** The fields a preset carries: everything about the print, not the file name of one album. */
const strip = ({ pattern: _p, ...rest }: Preset) => { void _p; return rest; };

function PresetLibrary({ preset, setPreset }: { preset: Preset; setPreset: (p: Preset) => void }) {
  const [list, setList] = useState<Named[]>(loadNamed);
  const [pick, setPick] = useState("");
  const [newName, setNewName] = useState("");
  const save = (next: Named[]) => { setList(next); storeNamed(next); };
  return (
    <fieldset>
      <legend>Preset tersimpan</legend>
      <label className="field">Pakai preset
        <select value={pick} onChange={(e) => { setPick(e.target.value); const n = list.find((x) => x.name === e.target.value); if (n) setPreset({ ...preset, ...n.preset, pattern: preset.pattern }); }}>
          <option value="">Pilih…</option>
          {list.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
        </select>
      </label>
      <label className="field">Nama preset baru<input type="text" value={newName} placeholder="mis. Percetakan X · A4 layflat" onChange={(e) => setNewName(e.target.value)} /></label>
      <div className="field">Kelola
        <div className="two">
          <button type="button" className="btn" disabled={!newName.trim()} onClick={() => {
            const name = newName.trim();
            save([...list.filter((x) => x.name !== name), { name, preset: strip(preset) as Preset }]); setPick(name); setNewName("");
          }}>Simpan sebagai preset</button>
          <button type="button" className="btn" disabled={!pick} onClick={async () => { if (await ask(`Hapus preset "${pick}"?`, "Hapus")) { save(list.filter((x) => x.name !== pick)); setPick(""); } }}>Hapus</button>
          <button type="button" className="btn" disabled={!list.length} onClick={() => void saveFile(new Blob([JSON.stringify(list, null, 2)], { type: "application/json" }), "preset-lw-album.json").catch(() => {})}>Ekspor ke file</button>
          <label className="btn">Impor dari file
            <input type="file" accept=".json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              try {
                const got = JSON.parse(await f.text()) as Named[];
                if (!Array.isArray(got) || !got.every((x) => x.name && x.preset)) throw new Error("bukan file preset");
                save([...list.filter((x) => !got.some((g) => g.name === x.name)), ...got]);
                void tell(`${got.length} preset diimpor.`);
              } catch (err) { void tell(`File itu tidak bisa dibaca: ${err instanceof Error ? err.message : err}`); }
            }} />
          </label>
        </div>
      </div>
    </fieldset>
  );
}

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
      <PresetLibrary preset={preset} setPreset={setPreset} />
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
