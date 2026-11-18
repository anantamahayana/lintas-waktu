import { useDrag } from "../lib/drag";

/** The thing being dragged, drawn next to the pointer above everything. Mounted once in the app. */
export function DragLayer() {
  const d = useDrag();
  if (!d) return null;
  return (
    <div className="photo-ghost" style={{ transform: `translate(${d.x + 12}px, ${d.y + 12}px)` }} aria-hidden="true">
      {d.thumb ? <img src={d.thumb} alt="" /> : d.label ? <b>{d.label}</b> : null}
      {d.hint && <span>{d.hint}</span>}
    </div>
  );
}
