import { useSyncExternalStore } from "react";

/**
 * One pointer-based drag for the whole app (photos, spreads, cards), instead of the browser's drag and drop:
 * the item follows the pointer at once, targets light up without flicker, Esc cancels, and it keeps working
 * while the window accepts files dropped from Explorer (Tauri's native drop turns HTML drag and drop off).
 *
 * A drop target is any element with `data-drop="<key>"`; the key is handed to the drag's `onDrop`.
 */
export type DragState = {
  /** What is being dragged, e.g. "photo:<id>" or "spread:3". */
  item: string;
  x: number;
  y: number;
  /** Key of the target under the pointer that accepts this drag, or "". */
  over: string;
  thumb?: string;
  label?: string;
  /** Short hint next to the ghost for the current target. */
  hint?: string;
};

let cur: DragState | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const dragState = () => cur;
export const useDrag = () => useSyncExternalStore(subscribe, dragState, dragState);

/** The drop key under a screen point (the ghost ignores the pointer, so it never hides a target). */
export function dropKeyAt(x: number, y: number): string {
  const el = document.elementFromPoint(x, y)?.closest("[data-drop]") as HTMLElement | null;
  return el?.dataset.drop ?? "";
}

/** Swallow the click that ends a drag, so it neither selects nor clears anything. */
export function swallowNextClick() {
  const stop = (e: Event) => { e.stopPropagation(); e.preventDefault(); };
  window.addEventListener("click", stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
}

type Opts = {
  item: string;
  thumb?: string;
  label?: string;
  /** Which target keys this drag can drop on. */
  accepts: (key: string) => boolean;
  /** Text next to the ghost for a target ("" = none). */
  hint?: (key: string) => string;
  onDrop: (key: string) => void;
  /** Called on every move with the target under the pointer (e.g. to turn pages while hovering). */
  onOver?: (key: string) => void;
  /** Pixels to move before a press becomes a drag; below it the press stays a click. */
  threshold?: number;
};

/** Start watching a pointer press; it becomes a drag once it moves `threshold` px. */
export function beginDrag(e: { clientX: number; clientY: number; button: number }, o: Opts) {
  if (e.button !== 0) return;
  const sx = e.clientX, sy = e.clientY, th = o.threshold ?? 6;
  let live = false;
  const mv = (ev: PointerEvent) => {
    if (!live && Math.hypot(ev.clientX - sx, ev.clientY - sy) < th) return;
    if (!live) document.body.classList.add("is-dragging");
    live = true;
    const k = dropKeyAt(ev.clientX, ev.clientY), over = k && o.accepts(k) ? k : "";
    o.onOver?.(over);
    cur = { item: o.item, x: ev.clientX, y: ev.clientY, over, thumb: o.thumb, label: o.label, hint: o.hint ? o.hint(over) : undefined };
    emit();
  };
  const finish = (drop: boolean) => {
    window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel); window.removeEventListener("keydown", key, true);
    document.body.classList.remove("is-dragging");
    const last = cur;
    cur = null;
    emit();
    if (!live) return;
    swallowNextClick();
    if (drop && last?.over) o.onDrop(last.over);
  };
  const up = () => finish(true);
  const cancel = () => finish(false);
  const key = (ev: KeyboardEvent) => { if (ev.key === "Escape" && live) { ev.stopPropagation(); ev.preventDefault(); finish(false); } };
  window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel); window.addEventListener("keydown", key, true);
}
