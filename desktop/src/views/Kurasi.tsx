import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ask } from "../lib/ask";
import { burstLeaders, bursts, hours, windowRows } from "../lib/cull";
import { photoUrl, type Photo } from "../lib/photos";

type Filter = "all" | "picked" | "unseen" | "skipped" | "stars";
type View = "one" | "grid" | "compare";
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

/** Keys go to the field when the user is typing in one; checkboxes, radios and buttons keep the shortcuts working. */
const typing = (e: KeyboardEvent) => {
  const t = e.target;
  if (t instanceof HTMLInputElement) return !["checkbox", "radio", "button", "range", "color"].includes(t.type);
  return t instanceof HTMLElement && /^(SELECT|TEXTAREA)$/.test(t.tagName);
};
const state = (p: Photo) => (p.pick === true ? "is-pick" : p.pick === false ? "is-skip" : "");
const CELL_W = 150, CELL_H = 104, GAP = 6;

/** One photo at full size; Space or a click zooms to 100% at that point, drag to look around. */
function Viewer({ photo, zoom, setZoom }: { photo: Photo; zoom: boolean; setZoom: (z: boolean) => void }) {
  const [url, setUrl] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const at = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);

  useEffect(() => { const { url, release } = photoUrl(photo); setUrl(url); return release; }, [photo.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !zoom) return;
    el.scrollLeft = at.current.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = at.current.y * el.scrollHeight - el.clientHeight / 2;
  }, [zoom, url]);

  return (
    <div ref={box} className={`viewer ${state(photo)} ${zoom ? "zoomed" : ""}`}
      onMouseDown={(e) => { if (zoom) drag.current = { x: e.clientX, y: e.clientY, sl: box.current!.scrollLeft, st: box.current!.scrollTop }; }}
      onMouseMove={(e) => { const d = drag.current; if (d && box.current) { box.current.scrollLeft = d.sl - (e.clientX - d.x); box.current.scrollTop = d.st - (e.clientY - d.y); } }}
      onMouseUp={(e) => {
        const d = drag.current; drag.current = null;
        if (d && (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4)) return; // that was a drag, not a click
        const img = box.current?.querySelector("img")?.getBoundingClientRect();
        if (!zoom && img) at.current = { x: (e.clientX - img.left) / img.width, y: (e.clientY - img.top) / img.height };
        setZoom(!zoom);
      }}>
      {url && <img src={url} alt={photo.name} draggable={false} style={zoom && photo.w ? { width: photo.w, height: photo.h } : undefined} />}
      {photo.pick !== null && <span className="tag">{photo.pick ? "Dipilih" : "Dilewati"}</span>}
      {photo.stars > 0 && <span className="stars" aria-label={`${photo.stars} bintang`}>{"★".repeat(photo.stars)}</span>}
    </div>
  );
}

/** Fast culling for folders of thousands of photos. */
export function Kurasi({ photos, setPhotos, curId, setCurId, target, setTarget, hasAlbum, onBuild, onBuildEmpty, onOpenEditor }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("one");
  const [zoom, setZoom] = useState(false);
  const [oneBurst, setOneBurst] = useState(false);
  const [camera, setCamera] = useState("");
  const [hour, setHour] = useState<number | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const grid = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ top: 0, h: 600, w: 900 });

  const { groupOf, size } = useMemo(() => bursts(photos), [photos]);
  const leaders = useMemo(() => burstLeaders(photos, groupOf), [photos, groupOf]);
  const cameras = useMemo(() => [...new Set(photos.map((p) => p.camera).filter(Boolean) as string[])].sort(), [photos]);
  const hourList = useMemo(() => hours(photos), [photos]);

  const list = useMemo(() => photos.filter((p) =>
    (filter === "all" ? true : filter === "picked" ? p.pick === true : filter === "unseen" ? p.pick === null : filter === "skipped" ? p.pick === false : p.stars >= 4)
    && (!oneBurst || leaders.has(p.id))
    && (!camera || p.camera === camera)
    && (hour === null || new Date(p.time).getHours() === hour)), [photos, filter, oneBurst, leaders, camera, hour]);
  const at = Math.max(0, list.findIndex((p) => p.id === curId));
  const cur: Photo | undefined = list[at];
  const picked = useMemo(() => photos.reduce((n, p) => n + (p.pick === true ? 1 : 0), 0), [photos]);
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  const cols = Math.max(1, Math.floor((scroll.w + GAP) / (CELL_W + GAP)));
  const go = useCallback((d: number) => {
    const next = list[Math.min(list.length - 1, Math.max(0, at + d))];
    if (next) setCurId(next.id);
  }, [list, at, setCurId]);

  const markIds = useCallback((ids: string[], patch: Partial<Pick<Photo, "pick" | "stars">>) => {
    const s = new Set(ids);
    setPhotos((ps) => ps.map((p) => (s.has(p.id) ? { ...p, ...patch } : p)));
  }, [setPhotos]);
  const mark = useCallback((patch: Partial<Pick<Photo, "pick" | "stars">>, advance: boolean) => {
    if (!cur) return;
    const after = list[at + 1]?.id;
    markIds([cur.id], patch);
    if (advance && after) setCurId(after);
  }, [cur, list, at, markIds, setCurId]);
  /** Keep the current photo of a burst and skip the rest of it. */
  const keepOnly = useCallback(() => {
    if (!cur) return;
    const g = groupOf.get(cur.id);
    const rest = photos.filter((p) => groupOf.get(p.id) === g && p.id !== cur.id).map((p) => p.id);
    markIds([cur.id], { pick: true });
    markIds(rest, { pick: false });
  }, [cur, groupOf, photos, markIds]);
  const toggleCompare = useCallback((id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-4))), []);

  const keys = useRef({ go, mark, cur, cols, view, keepOnly, toggleCompare });
  keys.current = { go, mark, cur, cols, view, keepOnly, toggleCompare };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase(), s = keys.current;
      if (k === "arrowright") s.go(1);
      else if (k === "arrowleft") s.go(-1);
      else if (k === "arrowdown" && s.view === "grid") s.go(s.cols);
      else if (k === "arrowup" && s.view === "grid") s.go(-s.cols);
      else if (k === "p") s.mark({ pick: true }, true);
      else if (k === "x") s.mark({ pick: false }, true);
      else if (k === "u") s.mark({ pick: null }, false);
      else if (k >= "0" && k <= "5") s.mark({ stars: +k === 0 || s.cur?.stars === +k ? 0 : +k }, false);
      else if (k === "g") setView((v) => (v === "grid" ? "one" : "grid"));
      else if (k === " " || k === "z") { if (s.view === "one") setZoom((z) => !z); }
      else if (k === "c" && s.cur) s.toggleCompare(s.cur.id);
      else if (k === "b") s.keepOnly();
      else if (k === "escape") { setZoom(false); if (s.view === "compare") setView("one"); }
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  useEffect(() => { setZoom(false); }, [curId]);

  // Grid: keep its size, and the current photo in view.
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el || view !== "grid") return;
    const measure = () => setScroll({ top: el.scrollTop, h: el.clientHeight, w: el.clientWidth - 24 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);
  useEffect(() => {
    const el = grid.current;
    if (!el || view !== "grid") return;
    const row = Math.floor(at / cols), top = 12 + row * (CELL_H + GAP);
    if (top < el.scrollTop) el.scrollTop = top - 12;
    else if (top + CELL_H > el.scrollTop + el.clientHeight) el.scrollTop = top + CELL_H - el.clientHeight + 12;
  }, [at, cols, view]);

  const rows = Math.ceil(list.length / cols);
  const win = windowRows(Math.max(0, scroll.top - 12), scroll.h, CELL_H + GAP, rows);
  const visible = list.slice(win.first * cols, (win.first + win.count) * cols);
  const strip = list.slice(Math.max(0, at - 7), at + 10);
  const over = picked - target;
  const group = cur ? size.get(groupOf.get(cur.id) ?? "") ?? 1 : 1;
  const comparing = compare.map((id) => byId.get(id)).filter(Boolean) as Photo[];

  const thumb = (p: Photo, extra?: React.CSSProperties) => (
    <button key={p.id} type="button" className={`thumb ${state(p)}`} style={extra} aria-current={p.id === cur?.id} aria-label={p.name}
      onClick={(e) => { if (e.shiftKey) toggleCompare(p.id); else setCurId(p.id); }} onDoubleClick={() => setView("one")}>
      {p.thumb && <img src={p.thumb} alt="" loading="lazy" draggable={false} />}
      {p.stars > 0 && <span className="mini-stars">{"★".repeat(p.stars)}</span>}
      {(size.get(groupOf.get(p.id) ?? "") ?? 1) > 1 && leaders.has(p.id) && oneBurst && <span className="burst">{size.get(groupOf.get(p.id)!)}</span>}
      {compare.includes(p.id) && <span className="cmp">B</span>}
    </button>
  );

  return (
    <>
      <div className="work">
        <aside className="panel" aria-label="Saringan">
          <h2>Tampilkan</h2>
          {([["all", "Semua"], ["unseen", "Belum dilihat"], ["picked", "Dipilih"], ["skipped", "Dilewati"], ["stars", "Bintang 4 ke atas"]] as const).map(([v, label]) => (
            <label key={v} className="radio">
              <input type="radio" name="filter" checked={filter === v} onChange={() => setFilter(v)} /> {label}
            </label>
          ))}
          <label className="check" title="Foto beruntun (jeda kurang dari 1,5 detik) ditampilkan satu saja: yang dipilih, berbintang, atau yang pertama">
            <input type="checkbox" checked={oneBurst} onChange={(e) => setOneBurst(e.target.checked)} /> Satu foto per burst
          </label>
          {cameras.length > 1 && (
            <label className="field">Kamera
              <select value={camera} onChange={(e) => setCamera(e.target.value)}>
                <option value="">Semua kamera</option>
                {cameras.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          <h2>Jam pemotretan</h2>
          <div className="hours">
            <button type="button" className="btn" aria-pressed={hour === null} onClick={() => setHour(null)}>Semua</button>
            {hourList.map((h) => (
              <button key={h.hour} type="button" className="btn" aria-pressed={hour === h.hour} onClick={() => setHour(hour === h.hour ? null : h.hour)}>
                {String(h.hour).padStart(2, "0")}.00 <span className="dim">{h.count}</span>
              </button>
            ))}
          </div>
          <h2>Tampilan</h2>
          <div className="seg three">
            <button type="button" className="btn" aria-pressed={view === "one"} onClick={() => setView("one")}>Satu</button>
            <button type="button" className="btn" aria-pressed={view === "grid"} onClick={() => setView("grid")}>Kisi</button>
            <button type="button" className="btn" aria-pressed={view === "compare"} disabled={comparing.length < 2} onClick={() => setView("compare")}>Banding</button>
          </div>
        </aside>

        <main className="stage">
          {!cur ? <div className="empty"><p>Tidak ada foto di saringan ini.</p></div> : view === "grid" ? (
            <div ref={grid} className="vgrid" onScroll={(e) => { const top = e.currentTarget.scrollTop; setScroll((s) => ({ ...s, top })); }}>
              <div style={{ height: 24 + rows * (CELL_H + GAP), position: "relative" }}>
                <div className="vgrid-rows" style={{ top: 12 + win.first * (CELL_H + GAP), gridTemplateColumns: `repeat(${cols}, ${CELL_W}px)` }}>
                  {visible.map((p) => thumb(p, { height: CELL_H }))}
                </div>
              </div>
            </div>
          ) : view === "compare" && comparing.length >= 2 ? (
            <div className={`compare n${comparing.length}`}>
              {comparing.map((p) => (
                <div key={p.id} className="cmp-cell">
                  <Viewer photo={p} zoom={false} setZoom={() => {}} />
                  <div className="cmp-bar">
                    <span className="dim">{p.name}</span>
                    <button type="button" className="btn primary" onClick={() => markIds([p.id], { pick: true })}>Pilih</button>
                    <button type="button" className="btn" onClick={() => markIds([p.id], { pick: false })}>Lewati</button>
                    <button type="button" className="btn" onClick={() => toggleCompare(p.id)}>Keluarkan</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Viewer photo={cur} zoom={zoom} setZoom={setZoom} />
              <div className="strip">{strip.map((p) => thumb(p))}</div>
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
          <div className="five">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className="btn" disabled={!cur} aria-pressed={cur?.stars === n} aria-label={`Bintang ${n}`}
                onClick={() => mark({ stars: cur?.stars === n ? 0 : n }, false)}>{n}</button>
            ))}
          </div>
          {group > 1 && (
            <button type="button" className="btn" onClick={keepOnly} title="Pilih foto ini dan lewati foto lain di burst yang sama">
              Ambil ini saja dari burst ({group} foto) · B
            </button>
          )}
          <button type="button" className="btn" disabled={!cur} onClick={() => cur && toggleCompare(cur.id)}>
            {cur && compare.includes(cur.id) ? "Keluarkan dari banding" : "Tambah ke banding"} · C ({compare.length}/4)
          </button>
          <div className="two">
            <button type="button" className="btn" disabled={!list.length} title="Pilih semua foto di saringan ini"
              onClick={() => markIds(list.map((p) => p.id), { pick: true })}>
              Pilih semua ({list.length})
            </button>
            <button type="button" className="btn" disabled={!picked}
              onClick={async () => { if (await ask(`Batalkan pilihan untuk ${picked} foto?`)) setPhotos((ps) => ps.map((p) => (p.pick === true ? { ...p, pick: null } : p))); }}>
              Batalkan semua
            </button>
          </div>

          {cur && (
            <>
              <h2>Info foto</h2>
              <dl>
                <dt>File</dt><dd>{cur.name}{cur.raw ? " (RAW)" : ""}</dd>
                <dt>Waktu</dt><dd>{new Date(cur.time).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })}</dd>
                <dt>Ukuran</dt><dd>{cur.w ? `${cur.w} × ${cur.h} px` : "membaca…"}</dd>
                {cur.camera && <><dt>Kamera</dt><dd>{cur.camera}</dd></>}
                {group > 1 && <><dt>Burst</dt><dd>{group} foto beruntun</dd></>}
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
        <span>← → pindah</span><span>P pilih</span><span>X lewati</span><span>U batal</span><span>1–5 bintang</span>
        <span>Spasi/Z zoom 100%</span><span>G kisi</span><span>C banding</span><span>B ambil dari burst</span>
        <span className="right">{cur ? `Foto ${at + 1} dari ${list.length}` : ""}{list.length !== photos.length ? ` (tersaring dari ${photos.length})` : ""}</span>
      </footer>
    </>
  );
}
