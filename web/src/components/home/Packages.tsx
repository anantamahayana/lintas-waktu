"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

// Packages and prices are site text (editable in the admin → Site text); prices are free text per currency.
type Pkg = { name: string; tagline: string; price_idr: string; price_usd: string; includes: string };

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
          <Reveal key={`${i}-${p.name}`} delay={i * 100} className="flex flex-col items-center gap-5 py-10 px-6 lg:px-10">
            <span className="t-caption">{p.name}</span>
            <span className="t-small text-mute">{p.tagline}</span>
            <span className="font-serif text-[26px] leading-none">{(cur === "IDR" ? p.price_idr : p.price_usd) || p.price_idr || p.price_usd}</span>
            <ul className="t-small text-mute leading-[2]">
              {p.includes.split("\n").filter((x) => x.trim()).map((x) => <li key={x}>{x}</li>)}
            </ul>
            <Link href="/contact" className="action mt-2">{t("ask")}</Link>
          </Reveal>
        ))}
      </div>
      {note && <p className="t-small text-mute max-w-[60ch]">{note}</p>}
    </section>
  );
}
