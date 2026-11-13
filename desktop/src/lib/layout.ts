import type { GridCell } from "./print";

/**
 * A layout template: `n` frames on a small grid. `spread` templates cover both pages as one
 * sheet (a photo may cross the fold: for layflat binding). `custom` ones are made by the user.
 */
export type Tpl = { id: string; n: number; label: string; cols: number; rows: number; cells: GridCell[]; spread?: boolean; custom?: boolean; airy?: boolean };

export const TEMPLATES: Tpl[] = [
  { id: "1-full", n: 1, label: "Satu foto", cols: 1, rows: 1, cells: [[0, 0, 1, 1]] },
  // One photo with deliberate white space around it (the empty grid squares stay blank).
  { id: "1-pad-c", n: 1, label: "Satu foto di tengah, ruang putih", cols: 6, rows: 6, cells: [[1, 1, 4, 4]], airy: true },
  { id: "1-pad-l", n: 1, label: "Satu foto di kiri", cols: 3, rows: 1, cells: [[0, 0, 2, 1]], airy: true },
  { id: "1-pad-r", n: 1, label: "Satu foto di kanan", cols: 3, rows: 1, cells: [[1, 0, 2, 1]], airy: true },
  { id: "1-pad-t", n: 1, label: "Satu foto di atas", cols: 1, rows: 3, cells: [[0, 0, 1, 2]], airy: true },
  { id: "2-cols", n: 2, label: "Dua berdampingan", cols: 2, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 1, 1]] },
  { id: "2-rows", n: 2, label: "Dua bertumpuk", cols: 1, rows: 2, cells: [[0, 0, 1, 1], [0, 1, 1, 1]] },
  { id: "3-left", n: 3, label: "Besar kiri, dua kanan", cols: 2, rows: 2, cells: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
  { id: "3-top", n: 3, label: "Besar atas, dua bawah", cols: 2, rows: 3, cells: [[0, 0, 2, 2], [0, 2, 1, 1], [1, 2, 1, 1]] },
  { id: "3-cols", n: 3, label: "Tiga kolom", cols: 3, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1]] },
  { id: "4-grid", n: 4, label: "Kisi 2 × 2", cols: 2, rows: 2, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  { id: "4-left", n: 4, label: "Besar kiri, tiga kanan", cols: 3, rows: 3, cells: [[0, 0, 2, 3], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]] },
  { id: "4-top", n: 4, label: "Besar atas, tiga bawah", cols: 3, rows: 3, cells: [[0, 0, 3, 2], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1]] },
  // Two pages as one sheet.
  { id: "s1-full", n: 1, spread: true, label: "Satu foto dua halaman", cols: 1, rows: 1, cells: [[0, 0, 1, 1]] },
  { id: "s1-pad", n: 1, spread: true, label: "Satu foto lebar di tengah, ruang putih", cols: 8, rows: 6, cells: [[1, 1, 6, 4]], airy: true },
  { id: "s2-wide", n: 2, spread: true, label: "Lebar melintasi lipatan, satu di kanan", cols: 3, rows: 1, cells: [[0, 0, 2, 1], [2, 0, 1, 1]] },
  { id: "s2-wide-r", n: 2, spread: true, label: "Satu di kiri, lebar melintasi lipatan", cols: 3, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 2, 1]] },
  { id: "s3-wide", n: 3, spread: true, label: "Lebar melintasi lipatan, dua di kanan", cols: 3, rows: 2, cells: [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1]] },
  { id: "s3-pano", n: 3, spread: true, label: "Panorama atas, dua bawah", cols: 2, rows: 3, cells: [[0, 0, 2, 2], [0, 2, 1, 1], [1, 2, 1, 1]] },
  { id: "s4-wide", n: 4, spread: true, label: "Lebar di tengah, kolom di kiri dan kanan", cols: 4, rows: 2, cells: [[0, 0, 1, 2], [1, 0, 2, 2], [3, 0, 1, 1], [3, 1, 1, 1]] },
  { id: "s4-pano", n: 4, spread: true, label: "Panorama atas, tiga bawah", cols: 3, rows: 3, cells: [[0, 0, 3, 2], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1]] },
];

/** Automatic layout never puts more than this on a page; a custom template may hold up to MAX_CELLS. */
export const MAX_PER_PAGE = 4;
export const MAX_CELLS = 12;

let custom: Tpl[] = [];
/** The user's own templates; set once from storage and whenever they change. */
export function setCustomTemplates(list: Tpl[]) { custom = list; }
const all = () => [...TEMPLATES, ...custom];

export const templatesFor = (n: number, spread = false) => all().filter((t) => t.n === n && !!t.spread === spread);
export const tplById = (id: string | undefined) => (id ? all().find((t) => t.id === id) : undefined);
/** Photo counts that have at least one template of this kind, ascending. */
export const countsFor = (spread = false) => [...new Set(all().filter((t) => !!t.spread === spread).map((t) => t.n))].sort((a, b) => a - b);

/** A plain grid for a count no template covers (a deleted custom template, for instance). */
export function gridTpl(n: number, spread = false): Tpl {
  const cols = Math.ceil(Math.sqrt(n * (spread ? 2 : 1))), rows = Math.ceil(n / cols);
  const cells = Array.from({ length: n }, (_, k) => [k % cols, Math.floor(k / cols), 1, 1] as GridCell);
  return { id: `grid-${n}${spread ? "s" : ""}`, n, label: "Kisi", cols, rows, cells, spread };
}

/** Is this a usable template? Frames must sit on the grid and must not overlap. */
export function validTpl(cols: number, rows: number, cells: GridCell[]): boolean {
  if (cells.length < 1 || cells.length > MAX_CELLS) return false;
  const taken = new Set<number>();
  for (const [c, r, cs, rs] of cells) {
    if (c < 0 || r < 0 || cs < 1 || rs < 1 || c + cs > cols || r + rs > rows) return false;
    for (let x = c; x < c + cs; x++) for (let y = r; y < r + rs; y++) {
      if (taken.has(y * cols + x)) return false;
      taken.add(y * cols + x);
    }
  }
  return true;
}

/**
 * One page: how many photos it takes, an optional fixed template, and whether shuffles may touch it.
 * `joined` makes this page and the next one sheet; that next page is its `tail` and holds nothing.
 */
export type PageCfg = {
  n: number; tpl?: string; locked?: boolean; joined?: boolean; tail?: boolean;
  /** Frames placed by hand, as fractions of the page's trim box (may reach into the bleed). Overrides the template. */
  free?: Box[];
  /** Text on the page. */
  texts?: TextBox[];
  /** This page's own background colour, and a line round every photo. */
  bg?: string;
  stroke?: { mm: number; color: string };
  /** Revision note from the client for this page (not printed). */
  note?: string;
  noteDone?: boolean;
};

/** A rectangle as fractions of the page (or, for a joined sheet, of both pages). */
export type Box = { x: number; y: number; w: number; h: number };
export type TextBox = Box & {
  id: string;
  text: string;
  font: string;
  /** Size in millimetres of paper, so it prints the same at any dpi. */
  sizeMm: number;
  color: string;
  align: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  /** Letter spacing in em. */
  tracking?: number;
};

export const FONTS: { family: string; label: string }[] = [
  { family: "Cormorant Garamond", label: "Cormorant Garamond (serif)" },
  { family: "Playfair Display", label: "Playfair Display (serif tebal)" },
  { family: "Lora", label: "Lora (serif)" },
  { family: "Marcellus", label: "Marcellus (judul klasik)" },
  { family: "Montserrat", label: "Montserrat (sans)" },
  { family: "Great Vibes", label: "Great Vibes (tulisan tangan)" },
];

/** The album: photo ids in reading order, cut into pages by each page's `n`. */
export type Album = { order: string[]; pages: PageCfg[] };

/** An id that starts with this is a frame with no photo in it yet (albums filled by hand). */
const EMPTY = "~";
export const isEmpty = (id: string) => id.startsWith(EMPTY);
function freshEmpties(order: string[], count: number): string[] {
  let next = order.reduce((m, id) => (isEmpty(id) ? Math.max(m, +id.slice(1) + 1 || 0) : m), 0);
  return Array.from({ length: count }, () => EMPTY + next++);
}

/** An album of empty frames, to be filled by dragging photos in. */
export function emptyAlbum(pages: number, perPage = 1): Album {
  return { order: freshEmpties([], pages * perPage), pages: Array.from({ length: pages }, () => ({ n: perPage })) };
}

/** Add a page of empty frames at the end. */
export function addPage(album: Album, n = 1): Album {
  return { order: [...album.order, ...freshEmpties(album.order, n)], pages: [...album.pages, { n }] };
}

/** Where page `i`'s photos start in the order. */
const startOf = (album: Album, i: number) => album.pages.slice(0, i).reduce((s, p) => s + p.n, 0);

/** Put a new page of `n` empty frames at page position `at` (the end when `at` is past the last page). */
export function insertPage(album: Album, at: number, n: number): Album {
  const i = Math.max(0, Math.min(at, album.pages.length));
  if (album.pages[i]?.tail) return album; // never between a joined page and its tail
  const start = startOf(album, i);
  const order = [...album.order.slice(0, start), ...freshEmpties(album.order, n), ...album.order.slice(start)];
  return { order, pages: [...album.pages.slice(0, i), { n }, ...album.pages.slice(i)] };
}

/** Add `k` empty frames to page `i`, keeping every other page as it is. */
export function addEmptyFrames(album: Album, i: number, k = 1): Album {
  const page = album.pages[i];
  if (!page || page.tail || page.n + k > MAX_CELLS) return album;
  const end = startOf(album, i) + page.n;
  const order = [...album.order.slice(0, end), ...freshEmpties(album.order, k), ...album.order.slice(end)];
  // Hand-placed frames keep their places; the new ones start in the middle of the page.
  const free = page.free && page.free.length === page.n ? [...page.free, ...Array.from({ length: k }, (_, j) => ({ x: 0.35 + j * 0.03, y: 0.35 + j * 0.03, w: 0.3, h: 0.3 }))] : undefined;
  return { order, pages: album.pages.map((p, j) => (j === i ? { ...p, n: p.n + k, tpl: undefined, free } : p)) };
}

/** Delete page `i` (a joined sheet goes with its tail). Its photos go back to the tray; empty frames vanish. */
export function deletePage(album: Album, i: number): Album {
  if (album.pages[i]?.tail) i -= 1;
  const page = album.pages[i];
  if (!page) return album;
  const start = startOf(album, i), drop = page.joined && album.pages[i + 1]?.tail ? 2 : 1;
  return { order: [...album.order.slice(0, start), ...album.order.slice(start + page.n)], pages: [...album.pages.slice(0, i), ...album.pages.slice(i + drop)] };
}

/** Take every photo off page `i` but keep its frames as placeholders. */
export function clearPage(album: Album, i: number): Album {
  const page = album.pages[i];
  if (!page) return album;
  const start = startOf(album, i), ids = album.order.slice(start, start + page.n).filter((id) => !isEmpty(id));
  const blanks = freshEmpties(album.order, ids.length);
  const map = new Map(ids.map((id, k) => [id, blanks[k]]));
  return { ...album, order: album.order.map((id) => map.get(id) ?? id) };
}

/** Take the photo out but keep its frame (the photo goes back to the tray). */
export function clearFrame(album: Album, id: string): Album {
  if (!album.order.includes(id) || isEmpty(id)) return album;
  const [blank] = freshEmpties(album.order, 1);
  return { ...album, order: album.order.map((x) => (x === id ? blank : x)) };
}

/** Spread `nPhotos` evenly over `pages` pages (1 to 4 each); adds pages when they do not fit. */
export function autoCounts(nPhotos: number, pages: number): number[] {
  if (nPhotos <= 0) return [];
  let count = Math.max(1, Math.min(pages, nPhotos));
  if (nPhotos > count * MAX_PER_PAGE) count = Math.ceil(nPhotos / MAX_PER_PAGE);
  const base = Math.floor(nPhotos / count);
  const extra = nPhotos - base * count;
  // Put the fuller pages in the middle of the book, lighter ones at both ends.
  const out = Array.from({ length: count }, () => base);
  const start = Math.floor((count - extra) / 2);
  for (let i = 0; i < extra; i++) out[start + i] += 1;
  return out;
}

export function newAlbum(ids: string[], pages: number): Album {
  return { order: [...ids], pages: autoCounts(ids.length, pages).map((n) => ({ n })) };
}

/**
 * Change how many frames page `i` has. Only this page changes: a page that grows gets empty frames
 * (drop photos in later); a page that shrinks loses its empty frames first, then photos from the end
 * (they go back to the photo panel). Photos named in `keep` (e.g. the one clicked) stay on the page.
 * Other pages never move, locked or not.
 */
export function setCount(album: Album, i: number, n: number, keep: string[] = []): Album {
  const page = album.pages[i];
  if (!page || page.tail || n < 1 || n > MAX_CELLS) return album;
  const start = startOf(album, i), ids = album.order.slice(start, start + page.n);
  let next = ids;
  if (n > ids.length) next = [...ids, ...freshEmpties(album.order, n - ids.length)];
  else if (n < ids.length) {
    let drop = ids.length - n;
    const out = new Set<string>();
    for (const id of [...ids].reverse()) if (drop > 0 && isEmpty(id)) { out.add(id); drop--; }
    for (const id of [...ids].reverse()) if (drop > 0 && !out.has(id) && !keep.includes(id)) { out.add(id); drop--; }
    next = ids.filter((id) => !out.has(id));
    // `keep` first, so the photo the user meant goes into the biggest frame of the new layout.
    next = [...next.filter((id) => keep.includes(id)), ...next.filter((id) => !keep.includes(id))];
  }
  const order = [...album.order.slice(0, start), ...next, ...album.order.slice(start + page.n)];
  return { order, pages: album.pages.map((p, j) => (j === i ? { ...p, n: next.length, tpl: undefined, free: undefined } : p)) };
}

/** Use a template on page `i`, changing the page's photo count to fit it. */
export function applyTpl(album: Album, i: number, tpl: Tpl, keep: string[] = []): Album {
  const page = album.pages[i];
  if (!page || page.tail || !!page.joined !== !!tpl.spread) return album;
  const a = page.n === tpl.n ? album : setCount(album, i, tpl.n, keep);
  if (a.pages[i]?.n !== tpl.n) return album;
  return { ...a, pages: a.pages.map((p, j) => (j === i ? { ...p, tpl: tpl.id, free: undefined } : p)) };
}

/**
 * Make page `i` and the page after it one sheet. The second page's photos join the panorama while a
 * panorama template can hold them; any others go back to the photo panel. No other page changes.
 */
export function joinPages(album: Album, i: number): Album {
  const a = album.pages[i];
  if (!a || a.joined || a.tail) return album;
  const b = album.pages[i + 1];
  const startA = startOf(album, i), idsA = album.order.slice(startA, startA + a.n);
  const hasB = !!b && !b.joined && !b.tail;
  const idsB = hasB ? album.order.slice(startA + a.n, startA + a.n + b.n) : [];
  const room = Math.max(a.n, ...countsFor(true));
  const both = [...idsA, ...idsB.filter((id) => !isEmpty(id)), ...idsB.filter(isEmpty)].slice(0, Math.max(room, idsA.length));
  const order = [...album.order.slice(0, startA), ...both, ...album.order.slice(startA + a.n + idsB.length)];
  const pages = album.pages.map((p) => ({ ...p }));
  pages[i] = { ...a, n: both.length, joined: true, tpl: undefined, free: undefined };
  if (hasB) pages[i + 1] = { n: 0, tail: true }; else pages.splice(i + 1, 0, { n: 0, tail: true });
  return { order, pages };
}

/** Split a joined sheet back into two pages, sharing its photos between them (at most 4 each; the rest go to the panel). */
export function splitPages(album: Album, i: number): Album {
  const a = album.pages[i];
  if (!a?.joined || !album.pages[i + 1]?.tail) return album;
  const start = startOf(album, i), ids = album.order.slice(start, start + a.n);
  const left = Math.min(MAX_PER_PAGE, Math.ceil(ids.length / 2)), right = Math.min(MAX_PER_PAGE, ids.length - left);
  const keep = ids.slice(0, left + right);
  const order = [...album.order.slice(0, start), ...keep, ...album.order.slice(start + a.n)];
  const pages = album.pages.map((p) => ({ ...p }));
  pages[i] = { n: left, locked: a.locked };
  pages[i + 1] = { n: right };
  return { order, pages: pages.filter((p, j) => p.n > 0 || j < i || j > i + 1 || p.tail) };
}

/** Take one photo out of the album (it goes back to the tray). */
export function removePhoto(album: Album, id: string): Album {
  const at = album.order.indexOf(id);
  if (at < 0) return album;
  // The page stays even when this was its last frame (it becomes an empty page), so the pages after it never shift.
  let seen = 0;
  const pages = album.pages.map((p) => {
    const hit = at >= seen && at < seen + p.n, k = at - seen;
    seen += p.n;
    return hit ? { ...p, n: p.n - 1, tpl: undefined, free: p.free?.filter((_, j) => j !== k) } : p;
  });
  return { order: album.order.filter((x) => x !== id), pages };
}

export function swapPhotos(album: Album, a: string, b: string): Album {
  const i = album.order.indexOf(a), j = album.order.indexOf(b);
  if (i < 0 || j < 0 || i === j) return album;
  const order = [...album.order];
  [order[i], order[j]] = [order[j], order[i]];
  return { ...album, order };
}

/** Put a tray photo into the place of one that is in the album. */
export function replacePhoto(album: Album, inAlbum: string, fromTray: string): Album {
  if (album.order.includes(fromTray)) return swapPhotos(album, inAlbum, fromTray);
  return { ...album, order: album.order.map((x) => (x === inAlbum ? fromTray : x)) };
}

/** Best built-in template for these photos: the one whose frames are closest in shape to the photos, in order. */
export function pickTpl(aspects: number[], contentAspect: number, gapFrac = 0, spread = false): Tpl {
  const options = TEMPLATES.filter((t) => t.n === aspects.length && !!t.spread === spread && !t.airy);
  if (!options.length) return templatesFor(aspects.length, spread)[0] ?? gridTpl(aspects.length, spread);
  let best = options[0], bestCost = Infinity;
  for (const t of options) {
    const cw = (1 - gapFrac * (t.cols - 1)) / t.cols, ch = (1 - gapFrac * (t.rows - 1)) / t.rows;
    let cost = 0;
    t.cells.forEach(([, , cs, rs], k) => {
      const cellAspect = ((cs * cw) / (rs * ch)) * contentAspect;
      cost += Math.abs(Math.log(cellAspect / aspects[k]));
    });
    if (cost < bestCost - 1e-9) { best = t; bestCost = cost; }
  }
  return best;
}

/** Where a page sits on its sheet: left, right, across both, or the empty second half of a joined sheet. */
export type Side = 0 | 1 | "both" | "tail";
export type LaidPage = { index: number; cfg: PageCfg; ids: string[]; tpl: Tpl | null; side: Side; spread: number };
/** Shape of the area photos are laid into (width / height) and the gap as a fraction of its width. */
export type Shape = { page: number; sheet: number; gapPage: number; gapSheet: number };

/**
 * Cut the order into pages, settle each page's template, and place pages on sheets.
 * A joined sheet always starts on a left page; a single page before it gets a blank facing page.
 */
export function layPages(album: Album, aspectOf: (id: string) => number, shape: Shape): LaidPage[] {
  let at = 0, spread = 0, side: 0 | 1 = 0;
  return album.pages.map((cfg, index) => {
    const ids = album.order.slice(at, at + cfg.n);
    at += cfg.n;
    let where: Side, sheet: number;
    if (cfg.tail) { where = "tail"; sheet = Math.max(0, spread - 1); }
    else if (cfg.joined) { if (side === 1) { spread++; side = 0; } where = "both"; sheet = spread++; }
    else { where = side; sheet = spread; if (side === 1) spread++; side = side === 0 ? 1 : 0; }
    const sp = where === "both";
    const fixed = tplById(cfg.tpl);
    const tpl = ids.length === 0 ? null
      : fixed && fixed.n === ids.length && !!fixed.spread === sp ? fixed
      : pickTpl(ids.map(aspectOf), sp ? shape.sheet : shape.page, sp ? shape.gapSheet : shape.gapPage, sp);
    return { index, cfg, ids, tpl, side: where, spread: sheet };
  });
}

/** Seeded random, so "shuffle" is repeatable in tests. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Give every unlocked page (or just page `only`) a different template with the same photo count. */
export function shuffleTemplates(album: Album, current: LaidPage[], seed: number, only?: number): Album {
  const r = rng(seed);
  const pages = album.pages.map((p, i) => {
    if (p.locked || p.tail || p.free || (only !== undefined && only !== i) || p.n === 0) return p;
    const options = templatesFor(p.n, !!p.joined).filter((t) => t.id !== current[i]?.tpl?.id);
    if (!options.length) return p;
    return { ...p, tpl: options[Math.floor(r() * options.length)].id, free: undefined };
  });
  return { ...album, pages };
}

/** Pages that print together: one sheet each (two facing pages, or one joined pair). */
export function sheetsOf(laid: LaidPage[]): number[][] {
  const out: number[][] = [];
  for (const pg of laid) (out[pg.spread] ??= []).push(pg.index);
  return out.map((x) => x ?? []);
}

/**
 * Move sheet `from` to position `to` (both sheet numbers), taking its pages and photos along.
 * Facing pages stay facing; a single page left alone by the move faces a blank page.
 */
export function moveSheet(album: Album, laid: LaidPage[], from: number, to: number): Album {
  const sheets = sheetsOf(laid);
  if (from === to || !sheets[from] || to < 0 || to >= sheets.length) return album;
  const starts: number[] = [];
  let at = 0;
  for (const p of album.pages) { starts.push(at); at += p.n; }
  const chunk = (idx: number[]) => ({ pages: idx.map((i) => album.pages[i]), ids: idx.flatMap((i) => album.order.slice(starts[i], starts[i] + album.pages[i].n)) });
  const parts = sheets.map(chunk);
  const [moved] = parts.splice(from, 1);
  parts.splice(to, 0, moved);
  return { order: parts.flatMap((c) => c.ids), pages: parts.flatMap((c) => c.pages) };
}

/** Change one page's settings (anything but its photo count). */
export function patchPage(album: Album, i: number, patch: Partial<PageCfg>): Album {
  return { ...album, pages: album.pages.map((p, j) => (j === i ? { ...p, ...patch } : p)) };
}

/** Snap a value to the nearest guide within `tol`; returns the value and the guide used. */
export function snap(v: number, guides: number[], tol: number): { v: number; at: number | null } {
  let best: number | null = null;
  for (const g of guides) if (Math.abs(g - v) <= tol && (best === null || Math.abs(g - v) < Math.abs(best - v))) best = g;
  return best === null ? { v, at: null } : { v: best, at: best };
}
