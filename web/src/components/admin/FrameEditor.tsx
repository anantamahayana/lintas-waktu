"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { FRAME0, type Frame } from "@/lib/frame";

export type FramePreview = { label: string; ratio: number };

/**
 * Choose how a photograph sits in its box on the site: tap or drag the point that must stay
 * visible, zoom in, or (where the layout allows) show the whole photo. The previews are the
 * real shapes of the box on a computer and on a phone, cropped exactly as the site will.
 */
export function FrameEditor({ src, title, value, previews, allowWhole, onSave, onClose }: {
  src: string; title: string; value: Frame | null | undefined; previews: FramePreview[]; allowWhole?: boolean;
  onSave: (f: Frame | null) => Promise<void> | void; onClose: () => void;
}) {
  const [f, setF] = useState<Frame>({ ...FRAME0, ...(value ?? {}) });
  const [natural, setNatural] = useState<number | null>(null); // photo's own width / height
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const whole = f.fit === "whole";

  const pointAt = (clientX: number, clientY: number) => {
    const img = area.current?.querySelector("img");
    if (!img) return;
    const r = img.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)));
    setF((v) => ({ ...v, x, y }));
  };

  async function save() {
    setBusy(true);
    try {
      const out: Frame = { x: f.x, y: f.y, zoom: whole ? 1 : f.zoom, fit: whole ? "whole" : "cover", ratio: whole ? natural ?? f.ratio ?? null : null };
      const isDefault = out.x === 50 && out.y === 50 && out.zoom === 1 && out.fit === "cover";
      await onSave(isDefault ? null : out);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-3 sm:p-4 admin-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className="admin-pop w-full max-w-[1100px] max-h-[94vh] overflow-y-auto bg-white border border-line flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex flex-col"><span className="t-mono text-mute">Framing</span><span className="font-serif text-[22px] leading-tight">{title}</span></div>
          <button type="button" onClick={onClose} aria-label="Close" className="h-10 w-10 text-mute hover:text-ink text-[18px]">✕</button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 p-5">
          <div className="flex flex-col gap-3">
            <p className="t-small text-mute">{whole ? "The whole photograph is shown; the box takes the photo’s own shape." : "Tap or drag on the photo to choose what must stay in view — a face, the couple, the horizon."}</p>
            <div ref={area} className={clsx("relative bg-[#f0eee8] flex items-center justify-center select-none touch-none", !whole && "cursor-crosshair")}
              onPointerDown={(e) => { if (whole) return; dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pointAt(e.clientX, e.clientY); }}
              onPointerMove={(e) => { if (dragging.current) pointAt(e.clientX, e.clientY); }}
              onPointerUp={() => { dragging.current = false; }}>
              <div className="relative inline-block">
                <img src={src} alt="" draggable={false} onLoad={(e) => setNatural(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} className="block max-h-[58vh] max-w-full" />
                {!whole && (
                  <span className="pointer-events-none absolute h-8 w-8 -ml-4 -mt-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5),0_2px_10px_rgba(0,0,0,.4)]" style={{ left: `${f.x}%`, top: `${f.y}%` }}>
                    <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -ml-[3px] -mt-[3px] rounded-full bg-white" />
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {allowWhole && (
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {([["cover", "Fill the frame"], ["whole", "Show whole photo"]] as const).map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={(f.fit ?? "cover") === k} onClick={() => setF((v) => ({ ...v, fit: k }))}
                    className={clsx("h-11 px-3 border t-small", (f.fit ?? "cover") === k ? "border-ink text-ink" : "border-line text-mute hover:border-ink")}>{l}</button>
                ))}
              </div>
            )}
            {!whole && (
              <label className="flex flex-col gap-2">
                <span className="t-mono text-mute flex justify-between">Zoom <span className="text-ink">{Math.round(f.zoom * 100)}%</span></span>
                <input type="range" min={1} max={2.5} step={0.05} value={f.zoom} onChange={(e) => setF((v) => ({ ...v, zoom: Number(e.target.value) }))} className="w-full accent-[#1f1e1c]" />
              </label>
            )}

            <div className="flex flex-col gap-3">
              <span className="t-mono text-mute">How it looks on the site</span>
              <div className="flex flex-wrap items-end gap-3">
                {(whole ? [{ label: "Everywhere", ratio: natural ?? 1 }] : previews).map((p) => (
                  <figure key={p.label} className="flex flex-col gap-1.5">
                    <div className="relative overflow-hidden bg-line" style={{ aspectRatio: String(p.ratio), width: p.ratio >= 1 ? 300 : Math.round(200 * p.ratio) }}>
                      <div className="absolute inset-0" style={!whole && f.zoom > 1 ? { transform: `scale(${f.zoom})`, transformOrigin: `${f.x}% ${f.y}%` } : undefined}>
                        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${f.x}% ${f.y}%` }} />
                      </div>
                    </div>
                    <figcaption className="t-mono !text-[10px] text-faint">{p.label}</figcaption>
                  </figure>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
              <button type="button" onClick={() => setF(FRAME0)} className="link t-mono text-mute mr-auto self-center">Reset to centre</button>
              <button type="button" onClick={onClose} className="t-mono px-4 py-2.5 border border-line">Cancel</button>
              <button type="button" disabled={busy} onClick={save} className="t-mono px-4 py-2.5 bg-ink text-white disabled:opacity-40">{busy ? "Saving…" : "Save framing"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
