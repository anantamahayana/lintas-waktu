import { describe, expect, it } from "vitest";
import { addPage, applyTpl, autoCounts, clearFrame, emptyAlbum, isEmpty, gridTpl, joinPages, layPages, MAX_PER_PAGE, newAlbum, pickTpl, removePhoto, replacePhoto, setCount, setCustomTemplates, shuffleTemplates, splitPages, swapPhotos, TEMPLATES, templatesFor, validTpl, type Tpl } from "./layout";
import { toSpreads } from "./export";
import { jpegSize } from "./photos";
import { crc32, zip } from "./zip";
import { burstLeaders, bursts, windowRows } from "./cull";
import { boxToMm, currentBoxes, frameRectMm, mmToBox } from "./frames";
import { moveSheet, sheetsOf, snap } from "./layout";
import { wrap } from "./paint";
import type { Photo } from "./photos";
import { coverMm, coverParts } from "./cover";
import { pdfFromJpegs } from "./pdf";
import { cellRectMm, cropRect, DEFAULT_PRESET, effectiveDpi, setJpegDpi, spreadMm, spreadPx } from "./print";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const SHAPE = { page: 1.4, sheet: 2.9, gapPage: 0.02, gapSheet: 0.01 };

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
      if (!t.airy) expect(taken.size).toBe(t.cols * t.rows);
    }
  });
  it("auto pick follows photo shape", () => {
    expect(pickTpl([0.67, 0.67], 1.4).id).toBe("2-cols");
    expect(pickTpl([2.4, 2.4], 1.4).id).toBe("2-rows");
  });
  it("one-photo pages can be shuffled too", () => {
    const a = newAlbum(ids(3), 20);
    const laid = layPages(a, () => 1.5, SHAPE);
    expect(laid[0].tpl!.id).toBe("1-full"); // auto layout fills the page
    const b = shuffleTemplates(a, laid, 3);
    expect(b.pages.every((p, i) => p.tpl && p.tpl !== laid[i].tpl!.id)).toBe(true);
  });
  it("shuffle changes unlocked pages only", () => {
    const a = { order: ids(6), pages: [{ n: 3 }, { n: 3, locked: true }] };
    const laid = layPages(a, () => 1.5, SHAPE);
    const b = shuffleTemplates(a, laid, 7);
    expect(b.pages[0].tpl).toBeDefined();
    expect(b.pages[0].tpl).not.toBe(laid[0].tpl!.id);
    expect(b.pages[1].tpl).toBeUndefined();
  });
});

describe("joined pages (layflat)", () => {
  const check = (a: { order: string[]; pages: { n: number }[] }, n: number) => {
    expect(sum(a.pages.map((p) => p.n))).toBe(n);
    expect(new Set(a.order).size).toBe(n);
  };
  it("join makes one sheet, moves the second page's photos on, and split undoes it", () => {
    let a = newAlbum(ids(12), 6); // 2 per page
    a = joinPages(a, 2);
    check(a, 12);
    expect(a.pages[2]).toMatchObject({ n: 2, joined: true });
    expect(a.pages[3]).toMatchObject({ n: 0, tail: true });
    const laid = layPages(a, () => 1.5, SHAPE);
    expect(laid[2].side).toBe("both");
    expect(laid[2].tpl!.spread).toBe(true);
    expect(laid[3].side).toBe("tail");
    const sp = toSpreads(laid);
    expect(sp[1].left).toBe(laid[2]);
    expect(sp[1].right).toBe(laid[3]);
    a = setCount(a, 2, 1);
    check(a, 12);
    expect(layPages(a, () => 1.5, SHAPE)[2].tpl!.id).toBe("s1-full");
    a = splitPages(a, 2);
    check(a, 12);
    expect(a.pages.some((p) => p.joined || p.tail)).toBe(false);
  });
  it("a joined sheet starts on a left page; the page before it faces a blank", () => {
    const a = joinPages(newAlbum(ids(6), 6), 1);
    const laid = layPages(a, () => 1.5, SHAPE);
    expect(laid.map((p) => [p.side, p.spread])).toEqual([[0, 0], ["both", 1], ["tail", 1], [0, 2], [1, 2], [0, 3], [1, 3]].slice(0, laid.length));
    expect(toSpreads(laid)[0].right).toBeNull();
  });
  it("removing the only photo of a joined sheet removes both pages", () => {
    let a = setCount(joinPages(newAlbum(ids(8), 4), 0), 0, 1);
    a = removePhoto(a, a.order[0]);
    check(a, 7);
    expect(a.pages.some((p) => p.joined || p.tail)).toBe(false);
  });
  it("a frame may cross the fold", () => {
    const p = DEFAULT_PRESET;
    const r = cellRectMm(p, "both", 3, 1, [0, 0, 2, 1]);
    const fold = p.bleedMm + p.pageWmm;
    expect(r.x).toBeLessThan(fold);
    expect(r.x + r.w).toBeGreaterThan(fold);
    const full = cellRectMm({ ...p, marginPct: 0 }, "both", 1, 1, [0, 0, 1, 1]);
    expect(full).toEqual({ x: 0, y: 0, ...spreadMm(p) });
  });
});

describe("albums filled by hand", () => {
  it("starts as empty frames; photos replace them, clearing keeps the frame", () => {
    let a = emptyAlbum(4, 1);
    expect(a.order.every(isEmpty)).toBe(true);
    expect(new Set(a.order).size).toBe(4);
    a = replacePhoto(a, a.order[1], "p1");
    expect(a.order[1]).toBe("p1");
    a = setCount(a, 0, 3);
    expect(a.pages).toHaveLength(4); // growing adds frames, it does not eat other pages
    expect(a.order).toHaveLength(6);
    expect(sum(a.pages.map((p) => p.n))).toBe(a.order.length);
    a = setCount(a, 0, 1); // shrinking drops the empty frames, the photo stays put
    expect(a.order).toHaveLength(4);
    expect(a.order[1]).toBe("p1");
    a = addPage(a, 2);
    expect(a.order).toHaveLength(6);
    expect(new Set(a.order).size).toBe(6);
    expect(sum(a.pages.map((p) => p.n))).toBe(6);
    const before = a.order.length;
    a = clearFrame(a, "p1");
    expect(a.order).toHaveLength(before);
    expect(a.order).not.toContain("p1");
    expect(new Set(a.order).size).toBe(before);
  });
});

describe("custom templates", () => {
  const mine: Tpl = { id: "c-test", n: 5, label: "Lima", cols: 3, rows: 2, cells: [[0, 0, 2, 1], [2, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]], custom: true };
  it("validates frames", () => {
    expect(validTpl(mine.cols, mine.rows, mine.cells)).toBe(true);
    expect(validTpl(2, 2, [[0, 0, 2, 1], [1, 0, 1, 2]])).toBe(false); // overlap
    expect(validTpl(2, 2, [[1, 1, 2, 1]])).toBe(false); // off the grid
    expect(validTpl(2, 2, [])).toBe(false);
    expect(validTpl(3, 3, [[0, 0, 1, 1], [2, 2, 1, 1]])).toBe(true); // gaps are white space
  });
  it("applying one changes the page's photo count and reflows", () => {
    setCustomTemplates([mine]);
    expect(templatesFor(5)).toEqual([mine]);
    let a = newAlbum(ids(20), 10);
    a = applyTpl(a, 1, mine);
    expect(sum(a.pages.map((p) => p.n))).toBe(20);
    expect(a.pages[1]).toMatchObject({ n: 5, tpl: "c-test" });
    expect(layPages(a, () => 1.5, SHAPE)[1].tpl).toBe(mine);
    // Deleted later: the page falls back to a plain grid instead of breaking.
    setCustomTemplates([]);
    const t = layPages(a, () => 1.5, SHAPE)[1].tpl!;
    expect(t.n).toBe(5);
    expect(validTpl(t.cols, t.rows, t.cells)).toBe(true);
    expect(gridTpl(7, true).cells).toHaveLength(7);
  });
  it("a page template is not applied to a joined sheet", () => {
    const a = joinPages(newAlbum(ids(8), 4), 0);
    expect(applyTpl(a, 0, mine)).toBe(a);
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

describe("zip", () => {
  it("crc32 matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
  it("writes a readable archive layout", async () => {
    const z = new Uint8Array(await zip([{ name: "a_01.jpg", data: new Uint8Array([1, 2, 3]) }, { name: "a_02.jpg", data: new Uint8Array([4]) }]).arrayBuffer());
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const end = z.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(2);
    expect(v.getUint32(v.getUint32(end + 16, true), true)).toBe(0x02014b50);
  });
});

describe("cover and proof pdf", () => {
  it("cover sheet = back + spine + front, plus bleed and board wrap on the outside", () => {
    const p = { ...DEFAULT_PRESET, spineMm: 12, wrapMm: 15 };
    const m = coverMm(p), parts = coverParts(p);
    expect(m.w).toBe(2 * 297 + 12 + 2 * (3 + 15));
    expect(m.h).toBe(210 + 2 * 18);
    expect(parts.back.w + parts.spine.w + parts.front.w).toBeCloseTo(m.w, 9);
    expect(parts.trimFront).toEqual({ x: 18 + 297 + 12, y: 18, w: 297, h: 210 });
  });
  it("pdf has one page per jpeg and a valid trailer", async () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 72, 0, 72, 0, 0,
      0xff, 0xc0, 0, 17, 8, 0x01, 0x00, 0x02, 0x00, 3, 0xff, 0xd9]);
    const text = new TextDecoder("latin1").decode(await pdfFromJpegs([jpg, jpg]).arrayBuffer());
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Count 2");
    expect((text.match(/\/Type \/Page /g) ?? []).length).toBe(2);
    const xref = +text.slice(text.lastIndexOf("startxref") + 10).trim().split("\n")[0];
    expect(text.slice(xref, xref + 4)).toBe("xref");
    // every offset in the table points at the object it names
    const rows = text.slice(xref).split("\n").slice(3, 3 + 7);
    rows.forEach((r, k) => expect(text.slice(+r.slice(0, 10), +r.slice(0, 10) + 8)).toBe(`${k + 1} 0 obj`.padEnd(8, "\n").slice(0, 8)));
  });
});

describe("culling helpers", () => {
  const ph = (id: string, time: number, extra: Partial<Photo> = {}): Photo => ({ id, name: id, time, w: 1, h: 1, pick: null, stars: 0, ...extra });
  it("groups bursts by time gap and camera", () => {
    const ps = [ph("a", 0), ph("b", 800), ph("c", 1500), ph("d", 5000), ph("e", 5300, { camera: "Z6" })];
    const { groupOf, size } = bursts(ps);
    expect([groupOf.get("a"), groupOf.get("b"), groupOf.get("c")]).toEqual(["a", "a", "a"]);
    expect(groupOf.get("d")).toBe("d");
    expect(groupOf.get("e")).toBe("e"); // different camera: not the same burst
    expect(size.get("a")).toBe(3);
    const leaders = burstLeaders([ps[0], { ...ps[1], stars: 3 }, ps[2], ps[3], ps[4]], groupOf);
    expect([...leaders].sort()).toEqual(["b", "d", "e"]);
  });
  it("windows rows for a virtual grid", () => {
    expect(windowRows(0, 500, 110, 1000)).toEqual({ first: 0, count: 8 });
    const w = windowRows(11000, 500, 110, 1000);
    expect(w.first).toBe(97);
    expect(w.first + w.count).toBeLessThanOrEqual(1000);
    expect(windowRows(0, 500, 110, 2)).toEqual({ first: 0, count: 2 });
  });
});

describe("hand-placed frames, text and sheet moves", () => {
  it("boxes and millimetres convert both ways, and a page's current frames match its template", () => {
    const p = DEFAULT_PRESET;
    const r = { x: 50, y: 40, w: 100, h: 60 };
    for (const side of [0, 1, "both"] as const) {
      const back = boxToMm(p, side, mmToBox(p, side, r));
      for (const k of ["x", "y", "w", "h"] as const) expect(back[k]).toBeCloseTo(r[k], 9);
    }
    const laid = layPages(newAlbum(ids(6), 2), () => 1.5, SHAPE);
    const boxes = currentBoxes(p, laid[1]);
    const free = { ...laid[1], cfg: { ...laid[1].cfg, free: boxes } };
    boxes.forEach((_, k) => {
      const a = frameRectMm(p, laid[1], k), b = frameRectMm(p, free, k);
      expect(b.x).toBeCloseTo(a.x, 9); expect(b.w).toBeCloseTo(a.w, 9);
    });
  });
  it("changing a page's template or photo count drops hand-placed frames", () => {
    let a = newAlbum(ids(6), 2);
    a = { ...a, pages: a.pages.map((pg, i) => (i === 0 ? { ...pg, free: [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }] } : pg)) };
    expect(setCount(a, 0, 2).pages[0].free).toBeUndefined();
  });
  it("moving a sheet carries its pages and photos", () => {
    const a = newAlbum(ids(8), 8); // 1 photo per page, 4 sheets
    const laid = layPages(a, () => 1.5, SHAPE);
    expect(sheetsOf(laid)).toEqual([[0, 1], [2, 3], [4, 5], [6, 7]]);
    const b = moveSheet(a, laid, 3, 0);
    expect(b.order).toEqual(["p6", "p7", "p0", "p1", "p2", "p3", "p4", "p5"]);
    expect(b.pages).toHaveLength(8);
    const j = joinPages(newAlbum(ids(6), 6), 2); // pages 2+3 joined
    const lj = layPages(j, () => 1.5, SHAPE);
    const m = moveSheet(j, lj, 1, 0);
    expect(m.pages[0].joined).toBe(true);
    expect(m.pages[1].tail).toBe(true);
    expect(sum(m.pages.map((x) => x.n))).toBe(m.order.length);
  });
  it("snaps to the nearest guide within tolerance", () => {
    expect(snap(10.8, [0, 10, 12], 1)).toEqual({ v: 10, at: 10 });
    expect(snap(10.8, [0, 20], 1)).toEqual({ v: 10.8, at: null });
  });
  it("wraps text at spaces and line breaks", () => {
    const m = { measureText: (s: string) => ({ width: s.length * 10 }) as TextMetrics };
    expect(wrap(m, "Ayu dan Made menikah", 100)).toEqual(["Ayu dan", "Made", "menikah"]);
    expect(wrap(m, "a\nb", 100)).toEqual(["a", "b"]);
  });
});
