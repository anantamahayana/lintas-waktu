"use client";

import { useId, useState } from "react";
import clsx from "clsx";

/**
 * Accordion with native-feeling open/close: the answer animates via CSS
 * grid-template-rows (0fr → 1fr), no JS measuring, no layout thrash.
 */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();
  return (
    <ul className="flex flex-col">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <li key={it.q} className="border-b border-line">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`${id}-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-start justify-between gap-6 py-5 lg:py-6 text-left"
            >
              <span className="t-h3">{it.q}</span>
              <span
                aria-hidden
                className={clsx("t-h3 text-mute transition-transform duration-500 ease-out-soft", isOpen && "rotate-45")}
              >
                +
              </span>
            </button>
            <div
              id={`${id}-${i}`}
              className={clsx("grid transition-[grid-template-rows] duration-500 ease-out-soft", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
            >
              <div className="overflow-hidden">
                <p className="t-body text-mute max-w-[640px] pb-6">{it.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
