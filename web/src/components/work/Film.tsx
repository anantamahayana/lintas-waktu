"use client";

import { useState } from "react";
import clsx from "clsx";
import { Photo } from "@/components/ui/Photo";

/**
 * Click-to-play film. Nothing from YouTube/Vimeo loads until the visitor
 * presses play — the page stays as light as a photograph. The poster is the
 * project's own still when it has one, otherwise the provider's thumbnail;
 * with neither, a quiet dark slate carries the title.
 */
export function Film({
  embedUrl,
  poster,
  title,
  label,
  duration,
  playLabel,
  className,
  priority = false,
}: {
  embedUrl: string;
  poster?: string;
  title: string;
  /** e.g. "Highlight film" */
  label: string;
  duration?: string;
  playLabel: string;
  className?: string;
  priority?: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={clsx("relative bg-dark", className)}>
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setPlaying(true)} aria-label={`${playLabel}: ${title}`} className={clsx("group relative block w-full overflow-hidden bg-dark text-on-dark text-left", className)}>
      {poster ? (
        <Photo src={poster} alt="" priority={priority} sizes="100vw" className="absolute inset-0 h-full w-full" />
      ) : (
        <span className="absolute inset-0 flex items-end p-6 lg:p-10">
          <span className="t-display-sm text-on-dark/80">{title}</span>
        </span>
      )}
      {/* soft darkening so the play mark reads on any frame */}
      <span className="absolute inset-0 bg-dark/25 transition-colors duration-700 group-hover:bg-dark/35" />
      <span className="t-mono absolute left-5 top-5 text-on-dark/85">
        {label}{duration ? ` · ${duration}` : ""}
      </span>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="h-16 w-16 lg:h-20 lg:w-20 rounded-full border border-on-dark/60 backdrop-blur-[2px] flex items-center justify-center transition-transform duration-700 ease-out-soft group-hover:scale-110">
          <span className="ml-1 border-y-[7px] border-y-transparent border-l-[12px] border-l-on-dark" />
        </span>
      </span>
      <span className="t-mono absolute bottom-5 left-5 text-on-dark/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100">{playLabel}</span>
    </button>
  );
}

/** Small "▶ 5:12" mark in a card corner for projects that carry a film. */
export function FilmBadge({ duration }: { duration?: string }) {
  return (
    <span className="pointer-events-none absolute left-3 bottom-3 inline-flex items-center gap-2 bg-dark/70 text-on-dark t-mono !text-[10px] px-2.5 py-1.5 backdrop-blur-[2px]">
      <span className="border-y-[4px] border-y-transparent border-l-[6px] border-l-on-dark" />
      {duration || "Film"}
    </span>
  );
}
