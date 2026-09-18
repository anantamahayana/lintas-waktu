"use client";

import { useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Reveal-on-scroll. A single shared IntersectionObserver toggles `.is-in`;
 * the animation itself is pure CSS (see globals.css .reveal), so it costs
 * nothing on the main thread. Respects prefers-reduced-motion via CSS.
 */
let observer: IntersectionObserver | null = null;
function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          observer?.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
  );
  return observer;
}

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  style,
}: {
  children: ReactNode;
  className?: string;
  /** ms, for stagger */
  delay?: number;
  as?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = getObserver();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      className={clsx("reveal", className)}
      style={{ ...style, ...(delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : {}) }}
    >
      {children}
    </Comp>
  );
}
