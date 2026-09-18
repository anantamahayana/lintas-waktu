import Image from "next/image";
import clsx from "clsx";

/**
 * Photograph slot.
 *
 * `src` — real image URL (later supplied by the admin / CMS).
 * Without `src` it shows a deterministic dummy photo from picsum.photos,
 * keyed by `seed`, so the same slot always shows the same picture.
 * Rendered through next/image (fill) so AVIF/WebP, sizing and lazy-loading
 * work now and don't change when real photos arrive.
 */
export function Photo({
  src,
  seed = "lintas-waktu",
  alt = "",
  className,
  ratio,
  rounded = "rounded-lg",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
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
}) {
  const url = src ?? `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/1500`;
  return (
    <div
      className={clsx("relative overflow-hidden photo-hover bg-paper-deep", rounded, className)}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      <Image
        src={url}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
