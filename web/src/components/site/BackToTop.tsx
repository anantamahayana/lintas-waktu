"use client";

/** "Back to the beginning": a smooth scroll to the top (instant when motion is reduced). */
export function BackToTop({ label }: { label: string }) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
      }}
      className="group link t-mono text-mute hover:text-ink inline-flex items-center gap-2"
    >
      <span aria-hidden className="inline-block transition-transform duration-500 group-hover:-translate-y-0.5">↑</span>
      {label}
    </a>
  );
}
