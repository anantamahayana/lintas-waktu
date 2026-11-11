import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ask } from "../lib/ask";
import { burstLeaders, bursts, hours, windowRows } from "../lib/cull";
import { Icon } from "../lib/icons";
import { useCommands } from "../lib/keys";
import { photoUrl, type Photo } from "../lib/photos";
import { Btn, IconBtn, Kbd, NumField, Section, Seg, StatusBar } from "./Shell";

type Filter = "all" | "picked" | "unseen" | "skipped" | "used";
type View = "one" | "grid" | "compare";
type Sort = "time" | "name" | "stars";
type Props = {
  photos: Photo[];
  setPhotos: Dispatch<SetStateAction<Photo[]>>;
  curId: string;
  setCurId: (id: string) => void;
  target: number;
  setTarget: (n: number) => void;
  hasAlbum: boolean;
  used: Set<string>;
  onBuild: () => void;
  onBuildEmpty: () => void;
  onOpenEditor: () => void;
  panels: boolean;
  loading: string;
  folder: string;
};

const GAP = 8;
const ADV_KEY = "lwalbum:advance";
const fmtTime = (t: number) => new Date(t).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const starText = (n: number) => <span className="st">{"★".repeat(n)}<b>{"★".repeat(5 - n)}</b></span>;

/** One photo at full size; Space/Z or a click zooms to 100% at that point, drag to look around. */
function Viewer({ photo, zoom, setZoom, children }: { photo: Photo; zoom: boolean; setZoom: (z: boolean) => void; children?: React.ReactNode }) {
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
    <div ref={box} className={`viewer ${photo.pick === false ? "skip" : ""} ${zoom ? "zoomed" : ""}`}
      onMouseDown={(e) => { if (zoom) drag.current = { x: e.clientX, y: e.clientY, sl: box.current!.scrollLeft, st: box.current!.scrollTop }; }}
      onMouseMove={(e) => { const d = drag.current; if (d && box.current) { box.current.scrollLeft = d.sl - (e.clientX - d.x); box.current.scrollTop = d.st - (e.clientY - d.y); } }}
      onMouseUp={(e) => {
        const d = drag.current; drag.current = null;
        if (d && (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4)) return;
        if ((e.target as Element).closest("button")) return;
        const img = box.current?.querySelector("img")?.getBoundingClientRect();
        if (!zoom && img) at.current = { x: (e.clientX - img.left) / img.width, y: (e.clientY - img.top) / img.height };
        setZoom(!zoom);
      }}>
      {url && <img src={url} alt={photo.name} draggable={false} style={zoom && photo.w ? { width: photo.w, height: photo.h } : undefined} />}
      {children}
    </div>
  );
}

/** Culling (Figma page 04): grid, single photo and compare, for folders of thousands of photos. */
export function Kurasi({ photos, setPhotos, curId, setCurId, target, setTarget, hasAlbum, used, onBuild, onBuildEmpty, onOpenEditor, panels, loading, folder }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("grid");
  const [zoom, setZoom] = useState(false);
  const [oneBurst, setOneBurst] = useState(false);
  const [cams, setCams] = useState<Set<string>>(new Set());
  const [hrs, setHrs] = useState<Set<number>>(new Set());
  const [minStars, setMinStars] = useState(0);
  const [sort, setSort] = useState<Sort>("time");
  const [size, setSize] = useState(160);
  const [compare, setCompare] = useState<string[]>([]);
  const [advance, setAdvance] = useState(() => { try { return localStorage.getItem(ADV_KEY) !== "0"; } catch { return true; } });
  const grid = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ top: 0, h: 600, w: 900 });

  const { groupOf, size: gsize } = useMemo(() => bursts(photos), [photos]);
  const leaders = useMemo(() => burstLeaders(photos, groupOf), [photos, groupOf]);
  const cameras = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of photos) if (p.camera) m.set(p.camera, (m.get(p.camera) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [photos]);
  const hourList = useMemo(() => hours(photos), [photos]);
  const counts = useMemo(() => {
    let picked = 0, skipped = 0, unseen = 0, inAlbum = 0;
    for (const p of photos) { if (p.pick === true) picked++; else if (p.pick === false) skipped++; else unseen++; if (used.has(p.id)) inAlbum++; }
    return { picked, skipped, unseen, inAlbum };
  }, [photos, used]);

  const list = useMemo(() => {
    const out = photos.filter((p) =>
      (filter === "all" ? true : filter === "picked" ? p.pick === true : filter === "unseen" ? p.pick === null : filter === "skipped" ? p.pick === false : used.has(p.id))
      && p.stars >= minStars
      && (!oneBurst || leaders.has(p.id))
      && (!cams.size || cams.has(p.camera ?? ""))
      && (!hrs.size || hrs.has(new Date(p.time).getHours())));
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "stars") out.sort((a, b) => b.stars - a.stars || a.time - b.time);
    return out;
  }, [photos, filter, used, minStars, oneBurst, leaders, cams, hrs, sort]);
  const at = Math.max(0, list.findIndex((p) => p.id === curId));
  const cur: Photo | undefined = list[at];
  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const cols = Math.max(1, Math.floor((scroll.w + GAP) / (size + GAP)));

  const go = useCallback((d: number) => { const next = list[Math.min(list.length - 1, Math.max(0, at + d))]; if (next) setCurId(next.id); }, [list, at, setCurId]);
  const markIds = useCallback((ids: string[], patch: Partial<Pick<Photo, "pick" | "stars">>) => {
    const s = new Set(ids);
    setPhotos((ps) => ps.map((p) => (s.has(p.id) ? { ...p, ...patch } : p)));
  }, [setPhotos]);
  const mark = useCallback((patch: Partial<Pick<Photo, "pick" | "stars">>, adv: boolean) => {
    if (!cur) return;
    const after = list[at + 1]?.id;
    markIds([cur.id], patch);
    if (adv && advance && after) setCurId(after);
  }, [cur, list, at, markIds, setCurId, advance]);
  const keepOnly = useCallback(() => {
    if (!cur) return;
    const g = groupOf.get(cur.id);
    markIds([cur.id], { pick: true });
    markIds(photos.filter((p) => groupOf.get(p.id) === g && p.id !== cur.id).map((p) => p.id), { pick: false });
  }, [cur, groupOf, photos, markIds]);
  const toggleCompare = useCallback((id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-4))), []);
  const openCompare = () => {
    if (view === "compare") { setView("one"); return; }
    if (!cur) return;
    let set = compare.filter((id) => byId.has(id));
    if (set.length < 2) { const next = list[at + 1] ?? list[at - 1]; set = next ? [cur.id, next.id] : [cur.id]; }
    if (set.length < 2) return;
    setCompare(set); setView("compare");
  };

  useCommands({
    "k.prev": { run: () => go(-1), enabled: !!cur },
    "k.next": { run: () => go(1), enabled: !!cur },
    "k.up": { run: () => go(-cols), enabled: view === "grid" },
    "k.down": { run: () => go(cols), enabled: view === "grid" },
    "k.grid": { run: () => { setView("grid"); setZoom(false); }, checked: view === "grid" },
    "k.one": { run: () => setView(view === "one" ? "grid" : "one"), checked: view === "one", enabled: !!cur },
    "k.compare": { run: openCompare, checked: view === "compare", enabled: !!cur },
    "k.zoom": { run: () => { if (view === "one") setZoom((z) => !z); else if (view === "grid") setView("one"); }, enabled: !!cur },
    "k.pick": { run: () => mark({ pick: true }, true), enabled: !!cur },
    "k.reject": { run: () => mark({ pick: false }, true), enabled: !!cur },
    "k.unflag": { run: () => mark({ pick: null }, false), enabled: !!cur },
    "k.stars": { run: (c) => { const n = +c.slice(-1); mark({ stars: n === 0 || cur?.stars === n ? 0 : n }, false); }, enabled: !!cur },
    "k.stack": { run: () => setOneBurst((b) => !b), checked: oneBurst },
    "k.keep": { run: keepOnly, enabled: !!cur && (gsize.get(groupOf.get(cur.id) ?? "") ?? 1) > 1 },
    "k.bigger": { run: () => setSize((s) => Math.min(280, s + 20)), enabled: view === "grid" },
    "k.smaller": { run: () => setSize((s) => Math.max(100, s - 20)), enabled: view === "grid" },
    "k.esc": { run: () => { if (zoom) setZoom(false); else if (view === "compare") setView("one"); else if (view === "one") setView("grid"); } },
  });

  useEffect(() => { setZoom(false); }, [curId]);
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el || view !== "grid") return;
    const measure = () => setScroll({ top: el.scrollTop, h: el.clientHeight, w: el.clientWidth - 32 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view, panels]);
  useEffect(() => {
    const el = grid.current;
    if (!el || view !== "grid") return;
    const row = Math.floor(at / cols), top = 16 + row * (size + GAP);
    if (top < el.scrollTop) el.scrollTop = top - 16;
    else if (top + size > el.scrollTop + el.clientHeight) el.scrollTop = top + size - el.clientHeight + 16;
  }, [at, cols, view, size]);

  const rows = Math.ceil(list.length / cols);
  const win = windowRows(Math.max(0, scroll.top - 16), scroll.h, size + GAP, rows);
  const visible = list.slice(win.first * cols, (win.first + win.count) * cols);
  const strip = list.slice(Math.max(0, at - 8), at + 12);
  const group = cur ? gsize.get(groupOf.get(cur.id) ?? "") ?? 1 : 1;
  const comparing = compare.map((id) => byId.get(id)).filter(Boolean) as Photo[];

  const thumb = (p: Photo, px: number, meta = true) => {
    const burst = gsize.get(groupOf.get(p.id) ?? "") ?? 1;
    return (
      <button key={p.id} type="button" className={`pt ${p.id === cur?.id ? "cur" : ""} ${p.pick === false ? "skip" : ""} ${meta ? "" : "bare"}`} style={{ width: px, height: px }}
        aria-label={p.name} title={p.name} onClick={(e) => { if (e.shiftKey) toggleCompare(p.id); else setCurId(p.id); }} onDoubleClick={() => setView("one")}>
        {p.thumb && <img src={p.thumb} alt="" loading="lazy" draggable={false} />}
        {p.pick === true && <span className="flag p"><Icon name="check" size={12} /></span>}
        {p.pick === false && <span className="flag x"><Icon name="x" size={12} /></span>}
        {meta && oneBurst && burst > 1 && leaders.has(p.id) && <span className="badge burst"><Icon name="layers" size={10} />{burst}</span>}
        {meta && !(oneBurst && burst > 1) && used.has(p.id) && <span className="badge used"><Icon name="book-open" size={10} /></span>}
        {compare.includes(p.id) && <span className="badge cmp">{String.fromCharCode(65 + compare.indexOf(p.id))}</span>}
        {meta && <span className="meta">{starText(p.stars)}<span className="nm">{p.name.replace(/\.[^.]+$/, "")}</span></span>}
      </button>
    );
  };
  const listItem = (v: Filter, label: string, n: number, icon: Parameters<typeof Icon>[0]["name"], cls = "") => (
    <button type="button" className={`list-i ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}><Icon name={icon} size={14} className={cls} />{label}<span className="n">{n.toLocaleString("id-ID")}</span></button>
  );
  const maxH = Math.max(1, ...hourList.map((h) => h.count));
  const hourLabel = hrs.size ? [...hrs].sort((a, b) => a - b).map((h) => `${h}`).join(", ") + " dipilih" : "semua jam";

  return (
    <>
      <div className={`work ${panels ? "" : "no-panels"}`}>
        <aside className="side narrow" aria-label="Saringan">
          <div className="scroll">
            <Section id="k-coll" title="Koleksi">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {listItem("all", "Semua foto", photos.length, "images")}
                {listItem("picked", "Dipilih", counts.picked, "flag", "ok-ic")}
                {listItem("skipped", "Ditolak", counts.skipped, "flag-off", "x-ic")}
                {listItem("unseen", "Belum dinilai", counts.unseen, "circle-help")}
                {listItem("used", "Dipakai di album", counts.inAlbum, "book-open", "a-ic")}
              </div>
            </Section>
            <Section id="k-stars" title="Bintang minimal">
              <div className="starsel">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" className={n <= minStars ? "on" : ""} aria-label={`${n} bintang ke atas`} onClick={() => setMinStars(minStars === n ? 0 : n)}><Icon name="star" size={18} /></button>
                ))}
                <span className="caption" style={{ marginLeft: 6 }}>{minStars ? `${minStars} ke atas` : "semua"}</span>
              </div>
            </Section>
            {hourList.length > 1 && (
              <Section id="k-hours" title="Jam pemotretan">
                <div className="hist">
                  {hourList.map((h) => (
                    <button key={h.hour} type="button" className={hrs.has(h.hour) ? "on" : ""} style={{ height: `${Math.max(6, (h.count / maxH) * 100)}%` }} data-tip={`${String(h.hour).padStart(2, "0")}.00 · ${h.count} foto`}
                      onClick={() => setHrs((s) => { const n = new Set(s); if (n.has(h.hour)) n.delete(h.hour); else n.add(h.hour); return n; })} />
                  ))}
                </div>
                <div className="hist-l"><span>{String(hourList[0].hour).padStart(2, "0")}.00</span><span className={hrs.size ? "on" : ""}>{hourLabel}</span><span>{String(hourList[hourList.length - 1].hour).padStart(2, "0")}.00</span></div>
              </Section>
            )}
            {cameras.length > 1 && (
              <Section id="k-cam" title="Kamera">
                {cameras.map(([c, n]) => (
                  <label key={c} className="ck"><input type="checkbox" checked={!cams.size || cams.has(c)}
                    onChange={() => setCams((s) => { const all = new Set(cameras.map(([x]) => x)); const n2 = new Set(s.size ? s : all); if (n2.has(c)) n2.delete(c); else n2.add(c); return n2.size === all.size ? new Set() : n2; })} />{c} · {n.toLocaleString("id-ID")}</label>
                ))}
              </Section>
            )}
            <Section id="k-burst" title="Foto beruntun">
              <label className="ck"><input type="checkbox" checked={oneBurst} onChange={(e) => setOneBurst(e.target.checked)} />Tumpuk burst (B)</label>
              <p className="caption">Foto dengan selang &lt; 1,5 detik dari kamera yang sama ditumpuk; yang terbaik tampil di depan.</p>
            </Section>
          </div>
        </aside>

        <main className="center">
          <div className="optbar">
            <Seg items={[{ v: "grid", label: <>Kisi <span className="dimtext">G</span></> }, { v: "one", label: <>Satu <span className="dimtext">E</span></> }, { v: "compare", label: <>Bandingkan <span className="dimtext">C</span></> }]}
              value={view} onChange={(v) => { if (v === "compare") openCompare(); else setView(v); }} label="Tampilan" />
            <span className="vdiv" />
            <span className="lbl">Urut</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Urutkan" style={{ width: 160 }}>
              <option value="time">Waktu pemotretan</option><option value="name">Nama file</option><option value="stars">Bintang terbanyak</option>
            </select>
            <span className="grow" />
            {loading && <span className="caption"><Icon name="loader-circle" size={12} className="spin" /> {loading}</span>}
            {view === "grid" && <><Icon name="image" size={12} className="dimtext" /><input type="range" min={100} max={280} step={10} value={size} onChange={(e) => setSize(+e.target.value)} style={{ width: 120 }} aria-label="Ukuran kisi" data-tip="Ukuran kisi" data-key="Ctrl+= / Ctrl+-" /><Icon name="image" size={18} className="dimtext" /></>}
          </div>

          {!cur ? (
            <div className="canvas" style={{ display: "flex" }}>
              <div className="dropzone"><Icon name="filter" size={24} /><strong>Tidak ada foto yang cocok</strong>
                <span>Ubah atau hapus saringan di panel kiri.</span>
                <Btn label="Hapus semua saringan" icon="x" onClick={() => { setFilter("all"); setMinStars(0); setCams(new Set()); setHrs(new Set()); setOneBurst(false); }} /></div>
            </div>
          ) : view === "grid" ? (
            <div ref={grid} className="vgrid" onScroll={(e) => { const top = e.currentTarget.scrollTop; setScroll((s) => ({ ...s, top })); }}>
              <div style={{ height: 32 + rows * (size + GAP), position: "relative" }}>
                <div className="vgrid-rows" style={{ top: 16 + win.first * (size + GAP), gridTemplateColumns: `repeat(${cols}, ${size}px)` }}>
                  {visible.map((p) => thumb(p, size))}
                </div>
              </div>
            </div>
          ) : view === "compare" && comparing.length >= 2 ? (
            <>
              <div className={`compare n${comparing.length}`}>
                {comparing.map((p, i) => (
                  <div key={p.id} className={`cmp-cell ${p.id === cur.id ? "cur" : ""}`} onMouseDown={() => setCurId(p.id)}>
                    <div className="cmp-h"><strong>{String.fromCharCode(65 + i)} · {p.name}</strong><span className="grow" />{p.stars > 0 && <span className="pill stars">{"★".repeat(p.stars)}</span>}
                      {p.pick === true && <span className="pill ok">Dipilih</span>}{p.pick === false && <span className="pill x">Ditolak</span>}</div>
                    <Viewer photo={p} zoom={false} setZoom={() => {}} />
                    <div className="cmp-a">
                      <Btn label="Pilih yang ini" icon="flag" full className={p.pick === true ? "pickbtn on" : "pickbtn"} onClick={() => markIds([p.id], { pick: true })} />
                      <Btn label="Tolak" icon="flag-off" kind="ghost" onClick={() => markIds([p.id], { pick: false })} />
                      <IconBtn icon="x" tip="Keluarkan dari perbandingan" onClick={() => { const next = compare.filter((x) => x !== p.id); setCompare(next); if (next.length < 2) setView("one"); }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="hintbar">
                {([["P", "pilih yang aktif"], ["X", "tolak"], ["Shift+klik", "tambah dari kisi"], ["Esc", "kembali"]] as const).map(([k, l]) => <span key={k}><Kbd k={k} />{l}</span>)}
              </div>
            </>
          ) : (
            <>
              <Viewer photo={cur} zoom={zoom} setZoom={setZoom}>
                <div className="ovl tl">
                  <span className="pill">{cur.name} · {at + 1} dari {list.length.toLocaleString("id-ID")}{group > 1 ? ` · burst ${group}` : ""}</span>
                  {cur.pick === true && <span className="pill ok"><Icon name="flag" size={12} />Dipilih</span>}
                  {cur.pick === false && <span className="pill x"><Icon name="flag-off" size={12} />Ditolak</span>}
                  {cur.stars > 0 && <span className="pill stars">{"★".repeat(cur.stars)}</span>}
                </div>
                <div className="ovl tr"><span className="pill">{zoom ? "100%" : "Pas layar"}</span><span className="pill">Z / Spasi = {zoom ? "pas layar" : "100%"}</span></div>
                {!zoom && <>
                  <span className="navbtn l"><IconBtn icon="chevron-left" cmd="k.prev" /></span>
                  <span className="navbtn r"><IconBtn icon="chevron-right" cmd="k.next" /></span>
                  <div className="ovl bc"><div className="keyhints">{([["←/→", "foto"], ["P", "pilih"], ["X", "tolak"], ["1–5", "bintang"], ["C", "bandingkan"]] as const).map(([k, l]) => <span key={k}><kbd>{k}</kbd>{l}</span>)}</div></div>
                </>}
              </Viewer>
              <div className="film">{strip.map((p) => thumb(p, 76, false))}</div>
            </>
          )}
        </main>

        <aside className="props w300" aria-label="Penilaian dan info foto">
          <div className="scroll">
            <Section id="k-rate" title="Penilaian">
              <div className="starsel">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" className={cur && n <= cur.stars ? "on" : ""} disabled={!cur} aria-label={`${n} bintang`} onClick={() => mark({ stars: cur?.stars === n ? 0 : n }, false)}><Icon name="star" size={22} /></button>
                ))}
                <span className="caption" style={{ marginLeft: 6 }}>tekan 0–5</span>
              </div>
              <div className="hrow">
                <Btn label="Pilih" icon="flag" full className={`pickbtn ${cur?.pick === true ? "on" : ""}`} cmd="k.pick" />
                <Btn label="Tolak" icon="flag-off" full className={`rejbtn ${cur?.pick === false ? "on" : ""}`} cmd="k.reject" />
                <Btn label="Hapus" icon="x" kind="ghost" cmd="k.unflag" />
              </div>
              <div style={{ display: "flex", gap: 12 }} className="caption">
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><kbd>P</kbd>pilih</span>
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><kbd>X</kbd>tolak</span>
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><kbd>U</kbd>hapus tanda</span>
              </div>
              <label className="ck"><input type="checkbox" checked={advance} onChange={(e) => { setAdvance(e.target.checked); try { localStorage.setItem(ADV_KEY, e.target.checked ? "1" : "0"); } catch { /* ignore */ } }} />Maju otomatis setelah menandai</label>
              {group > 1 && <Btn label={`Ambil ini saja dari burst (${group})`} icon="layers" full cmd="k.keep" />}
            </Section>
            <Section id="k-target" title="Target album">
              <div className="target"><span className="num">{counts.picked.toLocaleString("id-ID")}</span><span className="dimtext">dipilih dari</span>
                <NumField value={target} min={1} max={2000} unit="foto" label="Target jumlah foto" onChange={(v) => setTarget(Math.round(v))} /></div>
              <div className="progress"><i style={{ width: `${Math.min(100, (counts.picked / target) * 100)}%`, background: counts.picked > target ? "var(--warn)" : undefined }} /></div>
              {counts.picked > target && <p className="caption" style={{ color: "var(--warn)" }}>Lebih {counts.picked - target} foto dari target</p>}
              <div className="hrow">
                <Btn label="Pilih semua" tip="Tandai semua foto di saringan ini sebagai dipilih" full disabled={!list.length}
                  onClick={async () => { if (await ask(`Tandai ${list.length.toLocaleString("id-ID")} foto di saringan ini sebagai dipilih?`, "Pilih semua")) markIds(list.map((p) => p.id), { pick: true }); }} />
                <Btn label="Batalkan semua" kind="ghost" disabled={!counts.picked}
                  onClick={async () => { if (await ask(`Batalkan pilihan untuk ${counts.picked} foto?`, "Batalkan pilihan", "Kembali", { danger: true })) setPhotos((ps) => ps.map((p) => (p.pick === true ? { ...p, pick: null } : p))); }} />
              </div>
              <Btn label={hasAlbum ? `Susun ulang dari ${counts.picked} foto` : `Susun otomatis dari ${counts.picked} foto`} icon="wand-sparkles" kind="primary" full disabled={!counts.picked} cmd="app.auto" onClick={onBuild} />
              {hasAlbum ? <Btn label="Buka tata letak" icon="layout-template" full cmd="mod.editor" onClick={onOpenEditor} /> : <Btn label="Album kosong, isi sendiri" icon="plus" full onClick={onBuildEmpty} />}
            </Section>
            {cur && (
              <Section id="k-meta" title="Metadata">
                <dl className="meta-dl">
                  <dt>File</dt><dd title={cur.name}>{cur.name}{cur.raw ? " (RAW)" : ""}</dd>
                  <dt>Waktu</dt><dd>{fmtTime(cur.time)}</dd>
                  {cur.camera && <><dt>Kamera</dt><dd title={cur.camera}>{cur.camera}</dd></>}
                  <dt>Ukuran</dt><dd>{cur.w ? `${cur.w} × ${cur.h} · ${((cur.w * cur.h) / 1e6).toFixed(0)} MP` : "membaca…"}</dd>
                  {cur.w > 0 && <><dt>Cetak maks</dt><dd>{Math.round((cur.w / 300) * 25.4 / 10)} × {Math.round((cur.h / 300) * 25.4 / 10)} cm @ 300 dpi</dd></>}
                  {group > 1 && <><dt>Burst</dt><dd>{group} foto beruntun</dd></>}
                </dl>
              </Section>
            )}
          </div>
        </aside>
      </div>
      <StatusBar left={`${folder} · ${photos.length.toLocaleString("id-ID")} foto · ${counts.picked} dipilih · ${counts.skipped} ditolak · ${counts.unseen.toLocaleString("id-ID")} belum dinilai`}
        right={<span className="dimtext">{cur ? `${cur.name} · ${at + 1} dari ${list.length.toLocaleString("id-ID")}${list.length !== photos.length ? " (tersaring)" : ""}` : ""}</span>} />
    </>
  );
}
