import type { Rect } from "./print";

/** Align and distribute frames (sheet millimetres). Pure functions; the editor turns the rects back into page boxes. */
export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";
export type Axis = "x" | "y";

export const bounds = (rs: Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};

/**
 * Line every rect up on one edge or centre of its reference: the selection's bounds (one `ref`
 * for all), or one per rect (each frame's own page or safe area).
 */
export function align(rs: Rect[], mode: AlignMode, ref: Rect | Rect[]): Rect[] {
  return rs.map((r, i) => {
    const b = Array.isArray(ref) ? ref[i] : ref;
    switch (mode) {
      case "left": return { ...r, x: b.x };
      case "hcenter": return { ...r, x: b.x + (b.w - r.w) / 2 };
      case "right": return { ...r, x: b.x + b.w - r.w };
      case "top": return { ...r, y: b.y };
      case "vcenter": return { ...r, y: b.y + (b.h - r.h) / 2 };
      case "bottom": return { ...r, y: b.y + b.h - r.h };
    }
  });
}

const pos = (a: Axis) => (a === "x" ? "x" : "y") as "x" | "y";
const size = (a: Axis) => (a === "x" ? "w" : "h") as "w" | "h";
/** Indices sorted by position on the axis (ties by the other axis), so the reading order is kept. */
const order = (rs: Rect[], a: Axis) => rs.map((_, i) => i).sort((i, j) => rs[i][pos(a)] - rs[j][pos(a)] || rs[i][pos(a === "x" ? "y" : "x")] - rs[j][pos(a === "x" ? "y" : "x")]);

/** Equal space between neighbours; the first and last stay where they are. Needs three or more. */
export function distribute(rs: Rect[], a: Axis): Rect[] {
  if (rs.length < 3) return rs;
  const o = order(rs, a), p = pos(a), s = size(a);
  const first = rs[o[0]], last = rs[o[o.length - 1]];
  const span = last[p] + last[s] - first[p];
  const gap = (span - rs.reduce((t, r) => t + r[s], 0)) / (rs.length - 1);
  const out = rs.map((r) => ({ ...r }));
  let at = first[p];
  for (const i of o) { out[i][p] = at; at += rs[i][s] + gap; }
  return out;
}

/** Put `gap` mm between neighbours, starting from the first one (left or top). */
export function spaceBy(rs: Rect[], a: Axis, gap: number): Rect[] {
  if (rs.length < 2) return rs;
  const o = order(rs, a), p = pos(a), s = size(a);
  const out = rs.map((r) => ({ ...r }));
  let at = rs[o[0]][p];
  for (const i of o) { out[i][p] = at; at += rs[i][s] + gap; }
  return out;
}

/** The axis the frames are mostly laid along: wider spread than tall means a row. */
export function mainAxis(rs: Rect[]): Axis {
  const b = bounds(rs);
  const cx = rs.map((r) => r.x + r.w / 2), cy = rs.map((r) => r.y + r.h / 2);
  const sx = Math.max(...cx) - Math.min(...cx), sy = Math.max(...cy) - Math.min(...cy);
  return sx >= sy || b.w > b.h * 3 ? "x" : "y";
}

/** Give every rect the width, height or both of rect `to` (the one clicked last), keeping each top-left corner. */
export function matchSize(rs: Rect[], what: "w" | "h" | "both", to: number): Rect[] {
  const t = rs[to];
  if (!t) return rs;
  return rs.map((r) => ({ ...r, w: what === "h" ? r.w : t.w, h: what === "w" ? r.h : t.h }));
}
