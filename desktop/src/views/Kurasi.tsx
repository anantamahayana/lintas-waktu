import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ask } from "../lib/ask";
import type { Photo } from "../lib/photos";

type Filter = "all" | "picked" | "unseen" | "stars";
type Props = {
  photos: Photo[];
  setPhotos: Dispatch<SetStateAction<Photo[]>>;
  curId: string;
  setCurId: (id: string) => void;
  target: number;
  setTarget: (n: number) => void;
  hasAlbum: boolean;
  onBuild: () => void;
  onBuildEmpty: () => void;
  onOpenEditor: () => void;
};

const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);

/** Fast culling: look at one photo at a time and decide with the keyboard. */
export function Kurasi({ photos, setPhotos, curId, setCurId, target, setTarget, hasAlbum, onBuild, onBuildEmpty, onOpenEditor }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [grid, setGrid] = useState(false);
  const [full, setFull] = useState("");

  const list = useMemo(() => photos.filter((p) =>
    filter === "all" ? true : filter === "picked" ? p.pick === true : filter === "unseen" ? p.pick === null : p.stars >= 4), [photos, filter]);
  const at = Math.max(0, list.findIndex((p) => p.id === curId));
  const cur: Photo | undefined = list[at];
  const picked = useMemo(() => photos.reduce((n, p) => n + (p.pick === true ? 1 : 0), 0), [photos]);

  // The big view shows the original file, decoded by the browser (EXIF rotation included).
  useEffect(() => {
    if (!cur) { setFull(""); return; }
    const url = URL.createObjectURL(cur.file);
    setFull(url);
    return () => URL.revokeObjectURL(url);
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback((d: number) => {
    const next = list[Math.min(list.length - 1, Math.max(0, at + d))];
    if (next) setCurId(next.id);
  }, [list, at, setCurId]);

  const mark = useCallback((patch: Partial<Pick<Photo, "pick" | "stars">>, advance: boolean) => {
    if (!cur) return;
    const id = cur.id, after = list[at + 1]?.id;
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (advance && after) setCurId(after);
  }, [cur, list, at, setPhotos, setCurId]);

  const keys = useRef({ go, mark, cur });
  keys.current = { go, mark, cur };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase(), { go, mark, cur } = keys.current;
      if (k === "arrowright") go(1);
      else if (k === "arrowleft") go(-1);
      else if (k === "p") mark({ pick: true }, true);
      else if (k === "x") mark({ pick: false }, true);
      else if (k === "u") mark({ pick: null }, false);
      else if (k >= "1" && k <= "5") mark({ stars: cur?.stars === +k ? 0 : +k }, false);
      else if (k === "g") setGrid((g) => !g);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const strip = list.slice(Math.max(0, at - 6), at + 9);
  const over = picked - target;

  return (
    <>
      <div className="work">
        <aside className="panel" aria-label="Filter">
          <h2>Tampilkan</h2>
          {([["all", "Semua"], ["picked", "Dipilih"], ["unseen", "Belum dilihat"], ["stars", "Bintang 4 ke atas"]] as const).map(([v, label]) => (
            <label key={v} className="radio">
              <input type="radio" name="filter" checked={filter === v} onChange={() => setFilter(v)} /> {label}
            </label>
          ))}
          <h2>Tampilan</h2>
          <div className="seg">
            <button type="button" className="btn" aria-pressed={!grid} onClick={() => setGrid(false)}>Satu foto</button>
            <button type="button" className="btn" aria-pressed={grid} onClick={() => setGrid(true)}>Kisi</button>
          </div>
        </aside>

        <main className="stage">
          {!cur ? <div className="empty"><p>Tidak ada foto di saringan ini.</p></div> : grid ? (
            <div className="grid">
              {list.map((p) => (
                <button key={p.id} type="button" className={`thumb ${p.pick === true ? "is-pick" : p.pick === false ? "is-skip" : ""}`}
                  aria-current={p.id === cur.id} aria-label={p.name} onClick={() => setCurId(p.id)} onDoubleClick={() => setGrid(false)}>
                  {p.thumb && <img src={p.thumb} alt="" loading="lazy" />}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className={`viewer ${cur.pick === true ? "is-pick" : cur.pick === false ? "is-skip" : ""}`}>
                {full && <img src={full} alt={cur.name} />}
                {cur.pick !== null && <span className="tag">{cur.pick ? "Dipilih" : "Dilewati"}</span>}
              </div>
              <div className="strip">
                {strip.map((p) => (
                  <button key={p.id} type="button" className={`thumb ${p.pick === true ? "is-pick" : p.pick === false ? "is-skip" : ""}`}
                    aria-current={p.id === cur.id} aria-label={p.name} onClick={() => setCurId(p.id)}>
                    {p.thumb && <img src={p.thumb} alt="" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </main>

        <aside className="panel" aria-label="Keputusan dan info foto">
          <h2>Target album</h2>
          <div><strong className="num">{picked}</strong> dipilih dari target{" "}
            <input className="mini" type="number" min={1} aria-label="Target jumlah foto" value={target} onChange={(e) => setTarget(Math.max(1, +e.target.value || 1))} />
          </div>
          <progress max={target} value={Math.min(picked, target)} aria-label="Kemajuan pilihan" />
          {over > 0 && <div className="warn">Lebih {over} foto dari target</div>}

          <h2>Keputusan</h2>
          <div className="two">
            <button type="button" className="btn primary" disabled={!cur} onClick={() => mark({ pick: true }, true)}>Pilih (P)</button>
            <button type="button" className="btn" disabled={!cur} onClick={() => mark({ pick: false }, true)}>Lewati (X)</button>
          </div>
          <div className="two">
            <button type="button" className="btn" disabled={!list.length} title="Pilih semua foto di saringan ini"
              onClick={() => { const ids = new Set(list.map((p) => p.id)); setPhotos((ps) => ps.map((p) => (ids.has(p.id) ? { ...p, pick: true } : p))); }}>
              Pilih semua ({list.length})
            </button>
            <button type="button" className="btn" disabled={!picked}
              onClick={async () => { if (await ask(`Batalkan pilihan untuk ${picked} foto?`)) setPhotos((ps) => ps.map((p) => (p.pick === true ? { ...p, pick: null } : p))); }}>
              Batalkan semua
            </button>
          </div>
          <div className="five">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className="btn" disabled={!cur} aria-pressed={cur?.stars === n} aria-label={`Bintang ${n}`}
                onClick={() => mark({ stars: cur?.stars === n ? 0 : n }, false)}>{n}</button>
            ))}
          </div>

          {cur && (
            <>
              <h2>Info foto</h2>
              <dl>
                <dt>File</dt><dd>{cur.name}</dd>
                <dt>Waktu</dt><dd>{new Date(cur.time).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</dd>
                <dt>Ukuran</dt><dd>{cur.w ? `${cur.w} × ${cur.h} px` : "membaca…"}</dd>
              </dl>
            </>
          )}

          <div className="push">
            {hasAlbum && <button type="button" className="btn" onClick={onOpenEditor}>Buka album yang ada</button>}
            {!hasAlbum && <button type="button" className="btn" onClick={onBuildEmpty}>Album kosong, isi sendiri</button>}
            <button type="button" className="btn primary" disabled={!picked}
              onClick={async () => { if (!hasAlbum || (await ask("Album yang ada akan disusun ulang dari foto terpilih. Lanjutkan?"))) onBuild(); }}>
              {hasAlbum ? "Susun ulang" : "Susun otomatis"} dari {picked} foto
            </button>
          </div>
        </aside>
      </div>
      <footer className="status">
        <span>← → pindah</span><span>P pilih</span><span>X lewati</span><span>U batal</span><span>1–5 bintang</span><span>G kisi</span>
        <span className="right">{cur ? `Foto ${at + 1} dari ${list.length}` : ""}</span>
      </footer>
    </>
  );
}
