"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

// Packages and prices are site text (editable in the admin → Site text); prices are free text per currency.
// `badge` marks the package we point people to (empty = none); `note` is one line under its price.
type Pkg = { name: string; tagline: string; price_idr: string; price_usd: string; includes: string; badge?: string; note?: string };

/** Three centred columns divided by hairlines — an investment page, not a pricing table. */
export function Packages({ eyebrow, note }: { eyebrow?: string; note?: string } = {}) {
  const t = useTranslations("home.packages");
  const [cur, setCur] = useState<"IDR" | "USD">("IDR");
  const packages = t.raw("items") as Pkg[];

  return (
    <section className="wrap gutter py-20 lg:py-28 flex flex-col items-center text-center gap-12 lg:gap-16">
      <Reveal className="flex flex-col items-center gap-5">
        <span className="t-mono text-mute">{eyebrow ?? t("eyebrow")}</span>
        <h2 className="t-display-sm max-w-[20ch]">{t("line1")} <em>{t("line2")}</em></h2>
        <div role="group" aria-label="Currency" className="flex gap-4 t-mono pt-2">
          {(["IDR", "USD"] as const).map((c) => (
            <button key={c} type="button" aria-pressed={cur === c} onClick={() => setCur(c)} className={clsx("link", cur === c ? "text-ink" : "text-faint")}>{c}</button>
          ))}
        </div>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-3 w-full max-w-[1000px] divide-y sm:divide-y-0 sm:divide-x divide-line border-y border-line">
        {packages.map((p, i) => (
          <Reveal key={`${i}-${p.name}`} delay={i * 100} className={clsx("relative flex flex-col items-center gap-5 py-10 px-6 lg:px-10", p.badge && "bg-[color-mix(in_oklab,var(--color-white)_35%,white)]")}>
            {p.badge && <span className="t-mono !text-[10px] text-ink border border-ink px-2.5 py-1.5 -mb-1">{p.badge}</span>}
            <span className="t-caption">{p.name}</span>
            <span className="t-small text-mute">{p.tagline}</span>
            <span className="font-serif text-[26px] leading-none">{(cur === "IDR" ? p.price_idr : p.price_usd) || p.price_idr || p.price_usd}</span>
            {p.note && <span className="font-serif italic text-[15px] text-ink -mt-1 max-w-[26ch]">{p.note}</span>}
            <ul className="t-small text-mute leading-[2]">
              {p.includes.split("\n").filter((x) => x.trim()).map((x) => <li key={x}>{x}</li>)}
            </ul>
            <Link href="/contact?kind=wedding" className={clsx("action mt-auto", p.badge && "bg-ink !text-white hover:bg-dark")}>{t("ask")}</Link>
          </Reveal>
        ))}
      </div>
      {note && <p className="t-small text-mute max-w-[60ch]">{note}</p>}
    </section>
  );
}
