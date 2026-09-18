"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

// Placeholder pricing — real packages come from the admin in phase 2.
const packages = [
  { name: "Essential", tagline: "Half a day, photographs only.", idr: 12_000_000, usd: 750, includes: ["6 hours coverage", "1 photographer", "300+ edited photographs", "Private online gallery"] },
  { name: "Signature", tagline: "The full day, photo & film.", idr: 24_000_000, usd: 1500, includes: ["10 hours coverage", "Photographer + videographer", "500+ edited photographs", "4–6 min highlight film", "Private online gallery"] },
  { name: "Full Story", tagline: "Two days, every chapter.", idr: 38_000_000, usd: 2400, includes: ["Ceremony + reception day", "2 photographers + videographer", "800+ edited photographs", "Highlight film + full ceremony edit", "Fine-art album (30 pages)"] },
];
const fmtIDR = (n: number) => "IDR " + n.toLocaleString("id-ID");
const fmtUSD = (n: number) => "USD " + n.toLocaleString("en-US");

/** Packages as a table, not cards: one row per package, one column per fact. */
export function Packages({ eyebrow, note }: { eyebrow?: string; note?: string } = {}) {
  const t = useTranslations("home.packages");
  const [cur, setCur] = useState<"IDR" | "USD">("IDR");

  return (
    <section className="gutter py-16 lg:py-28 flex flex-col gap-10 lg:gap-14">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-4">
          <span className="t-mono text-mute">{eyebrow ?? t("eyebrow")}</span>
          <h2 className="t-display-sm max-w-[16ch]">{t("line1")} <span className="font-light">{t("line2")}</span></h2>
        </div>
        <div role="group" aria-label="Currency" className="flex gap-4 t-mono">
          {(["IDR", "USD"] as const).map((c) => (
            <button key={c} type="button" aria-pressed={cur === c} onClick={() => setCur(c)} className={clsx("link", cur !== c && "text-mute")}>
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="flex flex-col border-t border-line">
        {packages.map((p, i) => (
          <Reveal key={p.name} delay={i * 80} className="grid lg:grid-cols-12 gap-x-8 gap-y-4 py-8 lg:py-10 border-b border-line">
            <div className="lg:col-span-3 flex flex-col gap-2">
              <span className="t-display-sm">{p.name}</span>
              <span className="t-small text-mute">{p.tagline}</span>
            </div>
            <ul className="lg:col-span-5 t-small text-mute leading-[1.9] lg:columns-2">
              {p.includes.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <div className="lg:col-span-4 flex lg:flex-col lg:items-end justify-between gap-3">
              <span className="t-mono-lg">
                <span className="text-mute">from </span>
                {cur === "IDR" ? fmtIDR(p.idr) : fmtUSD(p.usd)}
              </span>
              <Link href="/contact" className="action">{t("ask")}</Link>
            </div>
          </Reveal>
        ))}
      </div>
      {note && <p className="t-small text-mute max-w-[60ch]">{note}</p>}
    </section>
  );
}
