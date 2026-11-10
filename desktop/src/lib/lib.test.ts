import { describe, expect, it } from "vitest";
import { autoCounts, layPages, MAX_PER_PAGE, newAlbum, pickTpl, removePhoto, replacePhoto, setCount, shuffleTemplates, swapPhotos, TEMPLATES } from "./layout";
import { jpegSize } from "./photos";
import { cellRectMm, cropRect, DEFAULT_PRESET, effectiveDpi, setJpegDpi, spreadMm, spreadPx } from "./print";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("autoCounts", () => {
  it("uses every photo once, 1 to 4 per page", () => {
    for (const n of [1, 5, 19, 20, 37, 60, 80, 81, 200]) {
      const c = autoCounts(n, 20);
      expect(sum(c)).toBe(n);
      expect(Math.min(...c)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...c)).toBeLessThanOrEqual(MAX_PER_PAGE);
    }
  });
  it("keeps the requested page count when the photos fit", () => {
    expect(autoCounts(60, 20)).toHaveLength(20);
    expect(autoCounts(8, 20)).toHaveLength(8);
    expect(autoCounts(100, 20)).toHaveLength(25);
  });
});

describe("album edits keep every photo exactly once", () => {
  const check = (a: { order: string[]; pages: { n: number }[] }, n: number) => {
    expect(sum(a.pages.map((p) => p.n))).toBe(n);
    expect(new Set(a.order).size).toBe(n);
    expect(a.order).toHaveLength(n);
  };
  it("setCount reflows onto later pages", () => {
    let a = newAlbum(ids(60), 20);
    a = setCount(a, 3, 1);
    check(a, 60);
    expect(a.pages[3].n).toBe(1);
    a = setCount(a, 0, 4);
    check(a, 60);
    expect(a.pages[0].n).toBe(4);
  });
  it("setCount leaves locked pages alone and adds a page when needed", () => {
    let a = newAlbum(ids(8), 2); // 4 + 4
    a = { ...a, pages: [a.pages[0], { ...a.pages[1], locked: true }] };
    a = setCount(a, 0, 2);
    check(a, 8);
    expect(a.pages[1].n).toBe(4);
    expect(a.pages).toHaveLength(3);
  });
  it("setCount can grow a page in a one-photo-per-page album by dropping end pages", () => {
    let a = newAlbum(ids(12), 20);
    expect(a.pages).toHaveLength(12);
    a = setCount(a, 2, 3);
    check(a, 12);
    expect(a.pages[2].n).toBe(3);
    expect(a.pages).toHaveLength(10);
    expect(setCount({ order: ids(2), pages: [{ n: 2 }] }, 0, 3).pages[0].n).toBe(2);
  });
  it("remove, swap and replace", () => {
    let a = newAlbum(ids(10), 4);
    a = removePhoto(a, "p4");
    check(a, 9);
    a = swapPhotos(a, "p0", "p9");
    expect(a.order[0]).toBe("p9");
    a = replacePhoto(a, "p1", "tray");
    check(a, 9);
    expect(a.order).toContain("tray");
    expect(a.order).not.toContain("p1");
  });
});

describe("templates", () => {
  it("cells stay on the grid and do not overlap", () => {
    for (const t of TEMPLATES) {
      expect(t.cells).toHaveLength(t.n);
      const taken = new Set<string>();
      for (const [c, r, cs, rs] of t.cells) {
        expect(c + cs).toBeLessThanOrEqual(t.cols);
        expect(r + rs).toBeLessThanOrEqual(t.rows);
        for (let x = c; x < c + cs; x++) for (let y = r; y < r + rs; y++) {
          expect(taken.has(`${x},${y}`)).toBe(false);
          taken.add(`${x},${y}`);
        }
      }
      expect(taken.size).toBe(t.cols * t.rows);
    }
  });
  it("auto pick follows photo shape", () => {
    expect(pickTpl([0.67, 0.67], 1.4).id).toBe("2-cols");
    expect(pickTpl([2.4, 2.4], 1.4).id).toBe("2-rows");
  });
  it("shuffle changes unlocked pages only", () => {
    const a = { order: ids(6), pages: [{ n: 3 }, { n: 3, locked: true }] };
    const laid = layPages(a, () => 1.5, 1.4);
    const b = shuffleTemplates(a, laid, 7);
    expect(b.pages[0].tpl).toBeDefined();
    expect(b.pages[0].tpl).not.toBe(laid[0].tpl!.id);
    expect(b.pages[1].tpl).toBeUndefined();
  });
});

describe("print geometry", () => {
  it("A4 landscape spread at 300 dpi with 3 mm bleed", () => {
    expect(spreadPx(DEFAULT_PRESET)).toEqual({ w: 7087, h: 2551 });
  });
  it("cells stay inside the sheet, and inside the trim when there is a margin", () => {
    const p = DEFAULT_PRESET, s = spreadMm(p);
    for (const t of TEMPLATES) for (const side of [0, 1] as const) for (const cell of t.cells) {
      const r = cellRectMm(p, side, t.cols, t.rows, cell);
      const left = p.bleedMm + side * p.pageWmm;
      expect(r.x).toBeGreaterThanOrEqual(left);
      expect(r.x + r.w).toBeLessThanOrEqual(left + p.pageWmm + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(s.h - p.bleedMm + 1e-9);
    }
  });
  it("with no margin, a full-page photo runs into the bleed but not across the fold", () => {
    const p = { ...DEFAULT_PRESET, marginPct: 0 };
    const l = cellRectMm(p, 0, 1, 1, [0, 0, 1, 1]);
    expect(l).toEqual({ x: 0, y: 0, w: p.pageWmm + p.bleedMm, h: p.pageHmm + 2 * p.bleedMm });
    const r = cellRectMm(p, 1, 1, 1, [0, 0, 1, 1]);
    expect(r.x).toBe(p.bleedMm + p.pageWmm);
    expect(r.x + r.w).toBe(spreadMm(p).w);
  });
  it("crop stays inside the photo and keeps the cell's shape", () => {
    for (const pl of [{ z: 1, x: 0.5, y: 0.5 }, { z: 2.5, x: 0, y: 1 }, { z: 1, x: 1, y: 0 }]) {
      const c = cropRect(6000, 4000, 100, 180, pl);
      expect(c.sx).toBeGreaterThanOrEqual(0);
      expect(c.sy).toBeGreaterThanOrEqual(0);
      expect(c.sx + c.sw).toBeLessThanOrEqual(6000 + 1e-6);
      expect(c.sy + c.sh).toBeLessThanOrEqual(4000 + 1e-6);
      expect(c.sw / c.sh).toBeCloseTo(100 / 180, 6);
    }
  });
  it("effective dpi", () => {
    // 6000 px across a 254 mm (10 inch) wide cell of the same shape = 600 dpi; zooming in 2x halves it.
    const cell = { x: 0, y: 0, w: 254, h: 254 * (4000 / 6000) };
    expect(effectiveDpi(6000, 4000, cell)).toBeCloseTo(600, 3);
    expect(effectiveDpi(6000, 4000, cell, { z: 2, x: 0.5, y: 0.5 })).toBeCloseTo(300, 3);
  });
});

describe("jpeg headers", () => {
  const jfif = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 72, 0, 72, 0, 0,
    0xff, 0xc0, 0, 17, 8, 0x0f, 0xa0, 0x17, 0x70, 3]);
  it("writes the print resolution", () => {
    const b = jfif();
    expect(setJpegDpi(b, 300)).toBe(true);
    expect([b[13], (b[14] << 8) | b[15], (b[16] << 8) | b[17]]).toEqual([1, 300, 300]);
    expect(setJpegDpi(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 0, 0, 0, 0, 0, 0]), 300)).toBe(false);
  });
  it("reads the stored size", () => {
    expect(jpegSize(jfif())).toEqual({ w: 6000, h: 4000 });
    expect(jpegSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
