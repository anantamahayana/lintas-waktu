import { useState } from "react";
import { ask, tell } from "../lib/ask";
import { saveFile } from "../lib/export";
import { SIZES, type Preset } from "../lib/print";
import { ColorField } from "./Editor";
import { Btn, NumField, Row, Seg } from "./Shell";

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
    <div className="fs">
      <h2>Preset percetakan</h2>
      <Row label="Pakai preset">
        <select value={pick} onChange={(e) => { setPick(e.target.value); const n = list.find((x) => x.name === e.target.value); if (n) setPreset({ ...preset, ...n.preset, pattern: preset.pattern }); }}>
          <option value="">{list.length ? "Pilih…" : "Belum ada preset tersimpan"}</option>
          {list.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
        </select>
        <Btn label="Hapus" kind="ghost" disabled={!pick} onClick={async () => { if (await ask(`Hapus preset “${pick}”?`, "Hapus", "Batal", { danger: true })) { save(list.filter((x) => x.name !== pick)); setPick(""); } }} />
      </Row>
      <Row label="Simpan sebagai">
        <input type="text" value={newName} placeholder="mis. Jaya Album · 30×30 hardcover" onChange={(e) => setNewName(e.target.value)} style={{ flex: 1 }} />
        <Btn label="Simpan" icon="save" disabled={!newName.trim()} onClick={() => {
          const name = newName.trim();
          save([...list.filter((x) => x.name !== name), { name, preset: strip(preset) as Preset }]); setPick(name); setNewName("");
        }} />
      </Row>
      <Row label="Bagikan">
        <Btn label="Ekspor ke file" icon="upload" kind="ghost" disabled={!list.length} onClick={() => void saveFile(new Blob([JSON.stringify(list, null, 2)], { type: "application/json" }), "preset-lw-album.json").catch(() => {})} />
        <label className="b ghost"><span className="b-label">Impor dari file</span>
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
      </Row>
    </div>
  );
}

/** Every print property of an album (Album › Properti album, and the new-project dialog). */
export function PresetForm({ preset, setPreset }: { preset: Preset; setPreset: (p: Preset) => void }) {
  const landscape = preset.pageWmm >= preset.pageHmm;
  const long = Math.max(preset.pageWmm, preset.pageHmm), short = Math.min(preset.pageWmm, preset.pageHmm);
  const sizeId = SIZES.find((s) => s.w === long && s.h === short)?.id ?? "custom";
  const set = (patch: Partial<Preset>) => setPreset({ ...preset, ...patch });
  return (
    <div className="fs" style={{ gap: 20 }}>
      <PresetLibrary preset={preset} setPreset={setPreset} />
      <div className="fs">
        <h2>Ukuran</h2>
        <div className="form-grid">
          <Row label="Ukuran halaman">
            <select value={sizeId} onChange={(e) => { const s = SIZES.find((x) => x.id === e.target.value); if (s) set({ pageWmm: landscape ? s.w : s.h, pageHmm: landscape ? s.h : s.w }); }}>
              {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              <option value="custom">Ukuran bebas</option>
            </select>
          </Row>
          <Row label="Orientasi"><Seg full value={landscape ? "l" : "p"} onChange={(v) => set({ pageWmm: v === "l" ? long : short, pageHmm: v === "l" ? short : long })} items={[{ v: "l", label: "Mendatar" }, { v: "p", label: "Tegak" }]} /></Row>
          <Row label="Lebar"><NumField value={preset.pageWmm} min={50} max={600} unit="mm" prefix="W" onChange={(v) => set({ pageWmm: v })} /></Row>
          <Row label="Tinggi"><NumField value={preset.pageHmm} min={50} max={600} unit="mm" prefix="H" onChange={(v) => set({ pageHmm: v })} /></Row>
          <Row label="Jumlah halaman"><NumField value={preset.pages} min={2} max={200} step={2} unit="hal." onChange={(v) => set({ pages: Math.max(2, Math.round(v / 2) * 2) })} /></Row>
          <Row label="Jilid"><Seg full value={preset.binding} onChange={(v) => set({ binding: v })} items={[{ v: "layflat", label: "Lay-flat", tip: "Halaman terbuka rata; foto boleh melintasi lipatan" }, { v: "biasa", label: "Biasa", tip: "Lipatan tertelan jilid" }]} /></Row>
        </div>
      </div>
      <div className="fs">
        <h2>Batas cetak</h2>
        <div className="form-grid">
          <Row label="Bleed"><NumField value={preset.bleedMm} min={0} max={10} unit="mm" onChange={(v) => set({ bleedMm: v })} /></Row>
          <Row label="Area aman"><NumField value={preset.safeMm} min={0} max={30} unit="mm" onChange={(v) => set({ safeMm: v })} /></Row>
          <Row label="Resolusi"><NumField value={preset.dpi} min={72} max={600} step={50} unit="dpi" onChange={(v) => set({ dpi: v })} /></Row>
        </div>
      </div>
      <div className="fs">
        <h2>Tampilan halaman</h2>
        <div className="form-grid">
          <Row label="Margin"><NumField value={preset.marginPct} min={0} max={20} step={0.5} unit="%" onChange={(v) => set({ marginPct: v })} /></Row>
          <Row label="Jarak foto"><NumField value={preset.gapPct} min={0} max={10} step={0.5} unit="%" onChange={(v) => set({ gapPct: v })} /></Row>
          <Row label="Latar"><ColorField value={preset.bg} onChange={(v) => set({ bg: v })} /></Row>
        </div>
      </div>
    </div>
  );
}
