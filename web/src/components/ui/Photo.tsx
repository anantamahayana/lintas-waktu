import Image from "next/image";
import clsx from "clsx";
import { dummyPhoto } from "@/lib/dummy-photos";
import { boxStyle, type Frame } from "@/lib/frame";

/**
 * Photograph slot.
 *
 * `src` — real image URL (later supplied by the admin / CMS).
 * Without `src` it shows a context-appropriate dummy photo (see
 * lib/dummy-photos.ts) keyed by `seed`, so each slot is stable.
 * Rendered through next/image (fill) so AVIF/WebP, sizing and lazy-loading
 * work now and don't change when real photos arrive.
 */
export function Photo({
  src,
  seed = "lintas-waktu",
  alt = "",
  className,
  ratio,
  rounded = "",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
  eager = false,
  quality = 85,
  frame,
}: {
  src?: string;
  seed?: string;
  alt?: string;
  className?: string;
  /** e.g. "4/5", "3/2" — omit when the parent controls height */
  ratio?: string;
  rounded?: string;
  /** next/image sizes hint — set per layout for best performance */
  sizes?: string;
  priority?: boolean;
  /** load immediately without preload hint (e.g. hidden crossfade layers) */
  eager?: boolean;
  /** next/image quality; must be one of next.config images.qualities */
  quality?: 75 | 85;
  /** focus point / zoom / whole, chosen in the admin (Site images, project cover) */
  frame?: Frame | null;
}) {
  const url = src ?? dummyPhoto(seed);
  return (
    <div
      className={clsx("relative overflow-hidden photo-hover bg-line", rounded, className)}
      style={{ ...(ratio ? { aspectRatio: ratio } : {}), ...boxStyle(frame) }}
    >
      {/* the zoom lives on a wrapper so the hover motion on the image itself still works */}
      <div className="absolute inset-0" style={frame && frame.zoom > 1 && frame.fit !== "whole" ? { transform: `scale(${frame.zoom})`, transformOrigin: `${frame.x}% ${frame.y}%` } : undefined}>
        <Image
          src={url}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          priority={priority}
          loading={eager ? "eager" : undefined}
          className="object-cover"
          style={frame ? { objectPosition: `${frame.x}% ${frame.y}%` } : undefined}
        />
      </div>
    </div>
  );
}
