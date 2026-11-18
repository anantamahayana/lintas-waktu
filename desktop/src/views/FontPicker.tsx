import { useEffect, useMemo, useRef, useState } from "react";
import { FONTS } from "../lib/layout";
import { listSystemFonts } from "../lib/platform";
import { Icon } from "../lib/icons";

const FAV = "lwalbum:fonts:fav", RECENT = "lwalbum:fonts:recent", MAX_RECENT = 8;
const ROW = 24, VIEW = 300, OVERSCAN = 4;

const load = (k: string): string[] => { try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };
const save = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

type Row = { head: string } | { family: string; sec: string };
const isFont = (r: Row): r is { family: string; sec: string } => "family" in r;

/**
 * Font chooser like InDesign's: search, favourites, recent, the album's own fonts and the installed ones.
 * Only the rows in view are drawn, each in its own face. Hovering or arrowing previews the font on the text
 * (`onPreview`); Esc or leaving puts the old one back.
 */
export function FontPicker({ value, onChange, onPreview, width = 190 }: { value: string; onChange: (family: string) => void; onPreview?: (family: string | null) => void; width?: number }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(-1);
  const [top, setTop] = useState(0);
  const [sys, setSys] = useState<string[]>([]);
  const [fav, setFav] = useState<string[]>(() => load(FAV));
  const [recent, setRecent] = useState<string[]>(() => load(RECENT));
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const btn = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase(), hit = (f: string) => !n || f.toLowerCase().includes(n);
    const out: Row[] = [];
    const add = (head: string, fams: string[]) => { const f = fams.filter(hit); if (f.length) { out.push({ head }); f.forEach((family) => out.push({ family, sec: head })); } };
    add("Favorit", fav); add("Terakhir dipakai", recent); add("Bawaan album", FONTS.map((f) => f.family)); add("Font sistem", sys);
    return out;
  }, [q, fav, recent, sys]);

  const close = () => { setOpen(false); onPreview?.(null); btn.current?.focus(); };
  const choose = (family: string) => {
    const r = [family, ...recent.filter((x) => x !== family)].slice(0, MAX_RECENT);
    setRecent(r); save(RECENT, r);
    setOpen(false); onPreview?.(null); onChange(family); btn.current?.focus();
  };
  const star = (family: string) => { const f = fav.includes(family) ? fav.filter((x) => x !== family) : [...fav, family]; setFav(f); save(FAV, f); };
  const point = (i: number) => { setHi(i); const r = rows[i]; if (r && isFont(r)) onPreview?.(r.family); };

  const show = () => {
    const r = btn.current!.getBoundingClientRect(), h = VIEW + 44;
    setPos({ x: Math.min(r.left, window.innerWidth - 270), y: r.bottom + h > window.innerHeight ? Math.max(4, r.top - h - 2) : r.bottom + 2 });
    setQ(""); setHi(-1); setTop(0); setOpen(true);
    void listSystemFonts().then(setSys);
  };

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  });

  const step = (dir: 1 | -1) => {
    let i = hi;
    do i += dir; while (i >= 0 && i < rows.length && !isFont(rows[i]));
    if (i < 0 || i >= rows.length) return;
    point(i);
    const el = list.current;
    if (el) { const y = i * ROW; if (y < el.scrollTop + ROW) el.scrollTop = Math.max(0, y - ROW); else if (y + ROW > el.scrollTop + VIEW) el.scrollTop = y + ROW - VIEW; }
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); step(e.key === "ArrowDown" ? 1 : -1); }
    else if (e.key === "Enter") { e.preventDefault(); const r = rows[hi]; if (r && isFont(r)) choose(r.family); }
  };

  const first = Math.max(0, Math.floor(top / ROW) - OVERSCAN), last = Math.min(rows.length, first + Math.ceil(VIEW / ROW) + 2 * OVERSCAN);

  return (
    <>
      <button ref={btn} type="button" className="fp-btn" style={{ width, fontFamily: `"${value}", serif` }} aria-label="Huruf" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => (open ? close() : show())}>
        <span className="fp-name">{value}</span><Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <div ref={pop} className="fp-pop" style={{ left: pos.x, top: pos.y }} onKeyDown={key} onMouseLeave={() => { setHi(-1); onPreview?.(null); }}>
          <input autoFocus className="fp-q" type="text" placeholder="Cari font…" aria-label="Cari font" value={q} onChange={(e) => { setQ(e.target.value); setHi(-1); setTop(0); if (list.current) list.current.scrollTop = 0; onPreview?.(null); }} />
          <div ref={list} className="fp-list" role="listbox" style={{ height: VIEW }} onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
            <div style={{ height: rows.length * ROW, position: "relative" }}>
              {rows.slice(first, last).map((r, k) => {
                const i = first + k, y = i * ROW;
                if (!isFont(r)) return <div key={`h${r.head}`} className="fp-head" style={{ top: y, height: ROW }}>{r.head}</div>;
                const on = r.family === value, starred = fav.includes(r.family);
                return (
                  <div key={`${r.sec}/${r.family}`} role="option" aria-selected={on} className={`fp-row ${i === hi ? "hi" : ""} ${on ? "cur" : ""}`} style={{ top: y, height: ROW }}
                    onMouseMove={() => { if (hi !== i) point(i); }} onClick={() => choose(r.family)}>
                    <span className="fp-face" style={{ fontFamily: `"${r.family}", serif` }}>{r.family}</span>
                    <button type="button" className={`fp-star ${starred ? "on" : ""}`} tabIndex={-1} aria-label={starred ? "Hapus dari favorit" : "Jadikan favorit"} data-tip="Favorit"
                      onClick={(e) => { e.stopPropagation(); star(r.family); }}>{starred ? "★" : "☆"}</button>
                  </div>
                );
              })}
              {!rows.length && <div className="fp-empty">Tidak ada font yang cocok.</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
