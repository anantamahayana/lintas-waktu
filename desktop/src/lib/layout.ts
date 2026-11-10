import type { GridCell } from "./print";

/** A page template: `n` photos on a small grid. The user picks one per page; "auto" picks by photo shape. */
export type Tpl = { id: string; n: number; label: string; cols: number; rows: number; cells: GridCell[] };

export const TEMPLATES: Tpl[] = [
  { id: "1-full", n: 1, label: "Satu foto", cols: 1, rows: 1, cells: [[0, 0, 1, 1]] },
  { id: "2-cols", n: 2, label: "Dua berdampingan", cols: 2, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 1, 1]] },
  { id: "2-rows", n: 2, label: "Dua bertumpuk", cols: 1, rows: 2, cells: [[0, 0, 1, 1], [0, 1, 1, 1]] },
  { id: "3-left", n: 3, label: "Besar kiri, dua kanan", cols: 2, rows: 2, cells: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
  { id: "3-top", n: 3, label: "Besar atas, dua bawah", cols: 2, rows: 3, cells: [[0, 0, 2, 2], [0, 2, 1, 1], [1, 2, 1, 1]] },
  { id: "3-cols", n: 3, label: "Tiga kolom", cols: 3, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1]] },
  { id: "4-grid", n: 4, label: "Kisi 2 × 2", cols: 2, rows: 2, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  { id: "4-left", n: 4, label: "Besar kiri, tiga kanan", cols: 3, rows: 3, cells: [[0, 0, 2, 3], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]] },
  { id: "4-top", n: 4, label: "Besar atas, tiga bawah", cols: 3, rows: 3, cells: [[0, 0, 3, 2], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1]] },
];

export const MAX_PER_PAGE = 4;
export const templatesFor = (n: number) => TEMPLATES.filter((t) => t.n === n);
export const tplById = (id: string | undefined) => TEMPLATES.find((t) => t.id === id);

/** One page: how many photos it takes, an optional fixed template, and whether shuffles may touch it. */
export type PageCfg = { n: number; tpl?: string; locked?: boolean };

/** The album: photo ids in reading order, cut into pages by each page's `n`. */
export type Album = { order: string[]; pages: PageCfg[] };

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
 * Change how many photos page `i` holds. The difference is given to, or borrowed from, other
 * unlocked pages, so the photos reflow and every photo stays in the album exactly once.
 */
export function setCount(album: Album, i: number, n: number): Album {
  const pages = album.pages.map((p) => ({ ...p }));
  if (!pages[i] || n < 1 || n > MAX_PER_PAGE) return album;
  let diff = pages[i].n - n; // photos that must be absorbed elsewhere (negative: borrowed)
  pages[i] = { ...pages[i], n, tpl: undefined };
  if (diff > 0) {
    // The page shrank: its spare photos go to the pages after it, then before it, then onto new pages.
    const others = [...pages.keys()].filter((j) => j > i).concat([...pages.keys()].filter((j) => j < i).reverse());
    for (const j of others) {
      if (diff === 0) break;
      if (pages[j].locked) continue;
      const next = Math.min(MAX_PER_PAGE, pages[j].n + diff);
      if (next !== pages[j].n) { diff -= next - pages[j].n; pages[j] = { ...pages[j], n: next, tpl: undefined }; }
    }
    while (diff > 0) { const take = Math.min(MAX_PER_PAGE, diff); pages.push({ n: take }); diff -= take; }
  } else if (diff < 0) {
    // The page grew: borrow from the end of the book; a page left empty is removed.
    for (let j = pages.length - 1; j >= 0 && diff < 0; j--) {
      if (j === i || pages[j].locked) continue;
      const give = Math.min(pages[j].n, -diff);
      pages[j] = { ...pages[j], n: pages[j].n - give, tpl: undefined };
      diff += give;
    }
    if (diff < 0) return album; // nothing left to borrow from
  }
  return { ...album, pages: pages.filter((p) => p.n > 0) };
}

/** Take one photo out of the album (it goes back to the tray). */
export function removePhoto(album: Album, id: string): Album {
  const at = album.order.indexOf(id);
  if (at < 0) return album;
  let seen = 0;
  const pages: PageCfg[] = [];
  for (const p of album.pages) {
    if (at >= seen && at < seen + p.n) { if (p.n > 1) pages.push({ ...p, n: p.n - 1, tpl: undefined }); }
    else pages.push(p);
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

/** Best template for these photos: the one whose cells are closest in shape to the photos, in order. */
export function pickTpl(aspects: number[], contentAspect: number, gapFrac = 0): Tpl {
  const options = templatesFor(aspects.length);
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

export type LaidPage = { index: number; cfg: PageCfg; ids: string[]; tpl: Tpl | null };

/** Cut the order into pages and settle each page's template. */
export function layPages(album: Album, aspectOf: (id: string) => number, contentAspect: number, gapFrac = 0): LaidPage[] {
  let at = 0;
  return album.pages.map((cfg, index) => {
    const ids = album.order.slice(at, at + cfg.n);
    at += cfg.n;
    const fixed = tplById(cfg.tpl);
    const tpl = ids.length === 0 ? null : fixed && fixed.n === ids.length ? fixed : pickTpl(ids.map(aspectOf), contentAspect, gapFrac);
    return { index, cfg, ids, tpl };
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
    if (p.locked || (only !== undefined && only !== i) || p.n === 0) return p;
    const options = templatesFor(p.n).filter((t) => t.id !== current[i]?.tpl?.id);
    if (!options.length) return p;
    return { ...p, tpl: options[Math.floor(r() * options.length)].id };
  });
  return { ...album, pages };
}
