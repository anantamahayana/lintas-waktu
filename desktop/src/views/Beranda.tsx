import { useState } from "react";
import { ask } from "../lib/ask";
import { DEFAULT_PRESET, STARTS, type Preset } from "../lib/print";
import { PresetForm } from "./PresetForm";

import { isNative } from "../lib/platform";
import type { ProjectMeta } from "../lib/projects";
export type { ProjectMeta };

type Props = {
  projects: ProjectMeta[];
  onCreate: (name: string, preset: Preset) => void;
  onOpen: (p: ProjectMeta) => void;
  onDelete: (p: ProjectMeta) => void;
  /** Windows app: open a project file from anywhere (a copy from another laptop, a backup). */
  onOpenFile?: () => void;
  projectsDir?: string;
};

/** Start screen: make a project (and set the album's properties) or carry on with a recent one. */
export function Beranda({ projects, onCreate, onOpen, onDelete, onOpenFile, projectsDir }: Props) {
  const [name, setName] = useState("");
  const [start, setStart] = useState(STARTS[0].id);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);

  const pick = (id: string) => {
    const s = STARTS.find((x) => x.id === id)!;
    setStart(id);
    setPreset({ ...DEFAULT_PRESET, pages: preset.pages, ...s.preset });
  };

  return (
    <div className="home">
      <div className="home-in">
        <header>
          <h1>LW Album</h1>
          <p className="dim">Foto tetap di laptop ini; tidak ada yang diunggah.</p>
        </header>

        <section className="home-new" aria-labelledby="new-h">
          <h2 id="new-h">Proyek baru</h2>
          <label className="field">Nama proyek
            <input type="text" value={name} placeholder="mis. Wedding Ayu & Made" onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="field">Mulai dari
            <div className="starts" role="group" aria-label="Mulai dari">
              {STARTS.map((s) => (
                <button key={s.id} type="button" className="btn" aria-pressed={start === s.id} onClick={() => pick(s.id)}>{s.label}</button>
              ))}
            </div>
          </div>
          <details className="more">
            <summary>Properti album (bisa diubah lagi nanti di tab Ekspor)</summary>
            <PresetForm preset={preset} setPreset={(p) => { setPreset(p); setStart(""); }} />
          </details>
          <div className="dim">
            {preset.pageWmm / 10} × {preset.pageHmm / 10} cm · {preset.pages} halaman · {preset.binding === "layflat" ? "layflat" : "jilid biasa"} · bleed {preset.bleedMm} mm · {preset.dpi} dpi
          </div>
          <button type="button" className="btn primary big" onClick={() => onCreate(name.trim(), preset)}>Buat proyek dan pilih folder foto</button>
        </section>

        <section className="home-recent" aria-labelledby="recent-h">
          <h2 id="recent-h">Proyek terakhir</h2>
          {projects.length === 0 && <p className="dim">Belum ada proyek. Proyek yang kamu buat muncul di sini.</p>}
          {projects.map((p) => (
            <div key={p.id} className="proj">
              <button type="button" className="proj-open" onClick={() => onOpen(p)}>
                <strong>{p.name}</strong>
                <span className="dim">{p.size} · {p.picked} dari {p.photos} foto dipilih</span>
                <span className="dim">Folder "{p.folder.split(/[\\/]/).filter(Boolean).pop() ?? p.folder}" · {new Date(p.updated).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
              </button>
              <button type="button" className="btn" aria-label={`Hapus proyek ${p.name}`}
                onClick={async () => { if (await ask(`Hapus proyek "${p.name}"? Foto di laptop tidak ikut terhapus.`, "Hapus")) onDelete(p); }}>Hapus</button>
            </div>
          ))}
          {onOpenFile && <button type="button" className="btn" onClick={onOpenFile}>Buka file proyek lain…</button>}
          {isNative
            ? projectsDir && <p className="dim">Proyek tersimpan sebagai file .lwalbum di {projectsDir}. Salin file itu untuk memindahkan proyek ke laptop lain; versi lama ada di folder .versi.</p>
            : projects.length > 0 && <p className="dim">Saat membuka proyek, pilih lagi folder fotonya: aplikasi tidak menyimpan salinan foto.</p>}
        </section>
      </div>
    </div>
  );
}
