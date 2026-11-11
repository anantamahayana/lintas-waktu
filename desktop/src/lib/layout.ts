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
export type PageCfg = { n: number; tpl?: string; locked?: boolean; joined?: boolean; tail?: boolean };

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

const fixedPage = (p: PageCfg) => !!(p.locked || p.tail || p.joined);

/**
 * Make the page counts add up again after page `i` changed by `diff` photos
 * (positive: `diff` photos need a new home; negative: page `i` needs that many more).
 * Returns null when there is nothing to borrow.
 */
function settle(pages: PageCfg[], i: number, diff: number): PageCfg[] | null {
  if (diff > 0) {
    const others = [...pages.keys()].filter((j) => j > i).concat([...pages.keys()].filter((j) => j < i).reverse());
    for (const j of others) {
      if (diff === 0) break;
      if (fixedPage(pages[j])) continue;
      const next = Math.min(MAX_PER_PAGE, pages[j].n + diff);
      if (next > pages[j].n) { diff -= next - pages[j].n; pages[j] = { ...pages[j], n: next, tpl: undefined }; }
    }
    while (diff > 0) { const take = Math.min(MAX_PER_PAGE, diff); pages.push({ n: take }); diff -= take; }
  } else if (diff < 0) {
    // Borrow from the end of the book; a page left empty is removed.
    for (let j = pages.length - 1; j >= 0 && diff < 0; j--) {
      if (j === i || fixedPage(pages[j])) continue;
      const give = Math.min(pages[j].n, -diff);
      pages[j] = { ...pages[j], n: pages[j].n - give, tpl: undefined };
      diff += give;
    }
    if (diff < 0) return null;
  }
  return pages.filter((p) => p.n > 0 || p.tail);
}

/**
 * Change how many photos page `i` holds. The difference is given to, or borrowed from, other
 * unlocked pages, so the photos reflow and every photo stays in the album exactly once.
 */
export function setCount(album: Album, i: number, n: number): Album {
  const pages = album.pages.map((p) => ({ ...p }));
  if (!pages[i] || pages[i].tail || n < 1 || n > MAX_CELLS) return album;
  let diff = pages[i].n - n;
  let order = album.order;
  const start = pages.slice(0, i).reduce((s, p) => s + p.n, 0), end = start + pages[i].n;
  if (diff < 0 && order.some(isEmpty)) {
    // An album filled by hand: a page that grows gets new empty frames instead of taking other pages' photos.
    order = [...order.slice(0, end), ...freshEmpties(order, -diff), ...order.slice(end)];
    diff = 0;
  } else if (diff > 0) {
    // A page that shrinks gives up its empty frames first.
    const drop = new Set(order.slice(start, end).filter(isEmpty).slice(-diff));
    order = order.filter((id) => !drop.has(id));
    diff -= drop.size;
  }
  pages[i] = { ...pages[i], n, tpl: undefined };
  const out = settle(pages, i, diff);
  return out ? { order, pages: out } : album;
}

/** Use a template on page `i`, changing the page's photo count to fit it. */
export function applyTpl(album: Album, i: number, tpl: Tpl): Album {
  const page = album.pages[i];
  if (!page || page.tail || !!page.joined !== !!tpl.spread) return album;
  const a = page.n === tpl.n ? album : setCount(album, i, tpl.n);
  if (a.pages[i]?.n !== tpl.n) return album;
  return { ...a, pages: a.pages.map((p, j) => (j === i ? { ...p, tpl: tpl.id } : p)) };
}

/** Make page `i` and the page after it one sheet. The second page's photos move to later pages. */
export function joinPages(album: Album, i: number): Album {
  const pages = album.pages.map((p) => ({ ...p }));
  const a = pages[i];
  if (!a || a.joined || a.tail) return album;
  const b = pages[i + 1];
  let spare = 0;
  if (b && !b.joined && !b.tail) { spare = b.n; pages[i + 1] = { n: 0, tail: true }; }
  else pages.splice(i + 1, 0, { n: 0, tail: true });
  pages[i] = { ...a, joined: true, tpl: undefined };
  const out = settle(pages, i + 1, spare);
  return out ? { ...album, pages: out } : album;
}

/** Split a joined sheet back into two pages, sharing its photos between them. */
export function splitPages(album: Album, i: number): Album {
  const pages = album.pages.map((p) => ({ ...p }));
  const a = pages[i];
  if (!a?.joined || !pages[i + 1]?.tail) return album;
  const left = Math.min(MAX_PER_PAGE, Math.ceil(a.n / 2));
  const right = Math.min(MAX_PER_PAGE, a.n - left);
  pages[i] = { n: left, locked: a.locked };
  pages[i + 1] = { n: right };
  const out = settle(pages, i + 1, a.n - left - right);
  return out ? { ...album, pages: out } : album;
}

/** Take one photo out of the album (it goes back to the tray). */
export function removePhoto(album: Album, id: string): Album {
  const at = album.order.indexOf(id);
  if (at < 0) return album;
  let seen = 0, dropTail = false;
  const pages: PageCfg[] = [];
  for (const p of album.pages) {
    if (dropTail && p.tail) { dropTail = false; continue; }
    if (at >= seen && at < seen + p.n) {
      if (p.n > 1) pages.push({ ...p, n: p.n - 1, tpl: undefined });
      else dropTail = !!p.joined;
    } else pages.push(p);
    seen += p.n;
  }
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
    if (p.locked || p.tail || (only !== undefined && only !== i) || p.n === 0) return p;
    const options = templatesFor(p.n, !!p.joined).filter((t) => t.id !== current[i]?.tpl?.id);
    if (!options.length) return p;
    return { ...p, tpl: options[Math.floor(r() * options.length)].id };
  });
  return { ...album, pages };
}
