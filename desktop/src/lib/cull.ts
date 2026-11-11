import type { Photo } from "./photos";

/**
 * Bursts: photos taken within `gapMs` of the one before, by the same camera, form one group.
 * Returns each photo's group id (the id of the group's first photo) and the group sizes.
 */
export function bursts(photos: Photo[], gapMs = 1500): { groupOf: Map<string, string>; size: Map<string, number> } {
  const sorted = [...photos].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  const groupOf = new Map<string, string>(), size = new Map<string, number>();
  let head: Photo | null = null, prev: Photo | null = null;
  for (const p of sorted) {
    if (!prev || !head || p.time - prev.time > gapMs || (p.camera ?? "") !== (prev.camera ?? "")) head = p;
    groupOf.set(p.id, head.id);
    size.set(head.id, (size.get(head.id) ?? 0) + 1);
    prev = p;
  }
  return { groupOf, size };
}

/** One photo per burst: the picked one if any, else the best starred, else the first. */
export function burstLeaders(photos: Photo[], groupOf: Map<string, string>): Set<string> {
  const best = new Map<string, Photo>();
  const score = (p: Photo) => (p.pick === true ? 100 : 0) + p.stars * 10 - (p.pick === false ? 50 : 0);
  for (const p of photos) {
    const g = groupOf.get(p.id) ?? p.id, cur = best.get(g);
    if (!cur || score(p) > score(cur)) best.set(g, p);
  }
  return new Set([...best.values()].map((p) => p.id));
}

/** Hour buckets ("07:00") present in the photos, in order, with counts. */
export function hours(photos: Photo[]): { hour: number; count: number }[] {
  const m = new Map<number, number>();
  for (const p of photos) { const h = new Date(p.time).getHours(); m.set(h, (m.get(h) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([hour, count]) => ({ hour, count }));
}

/** First visible row and how many rows to draw, for a list laid out in fixed-height rows. */
export function windowRows(scrollTop: number, viewH: number, rowH: number, rows: number, overscan = 3) {
  const first = Math.max(0, Math.floor(scrollTop / rowH) - overscan);
  const last = Math.min(rows, Math.ceil((scrollTop + viewH) / rowH) + overscan);
  return { first, count: Math.max(0, last - first) };
}
