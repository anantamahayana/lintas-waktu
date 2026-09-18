"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Headline } from "@/components/ui/Headline";
import { Reveal } from "@/components/ui/Reveal";

// Placeholder pricing — real packages come from the admin in phase 2.
// USD is a rounded indication (rate configured in site settings later).
const packages = [
  { name: "Essential", tagline: "Half a day, photographs only.", idr: 12_000_000, usd: 750, includes: ["6 hours coverage", "1 photographer", "300+ edited photographs", "Private online gallery"] },
  { name: "Signature", tagline: "The full day, photo & film.", idr: 24_000_000, usd: 1500, includes: ["10 hours coverage", "Photographer + videographer", "500+ edited photographs", "4–6 min highlight film", "Private online gallery"] },
  { name: "Full Story", tagline: "Two days, every chapter.", idr: 38_000_000, usd: 2400, includes: ["Ceremony + reception day", "2 photographers + videographer", "800+ edited photographs", "Highlight film + full ceremony edit", "Fine-art album (30 pages)"] },
];

const fmtIDR = (n: number) => "IDR " + n.toLocaleString("id-ID");
const fmtUSD = (n: number) => "USD " + n.toLocaleString("en-US");

export function Packages() {
  const t = useTranslations("home.packages");
  const [cur, setCur] = useState<"IDR" | "USD">("IDR");

  return (
    <section className="bg-paper-deep gutter py-16 lg:py-28 flex flex-col items-start lg:items-center gap-8 lg:gap-12">
      <Reveal className="flex flex-col items-start lg:items-center gap-4">
        <p className="eyebrow">{t("eyebrow")}</p>
        <Headline line1={t("line1")} line2={t("line2")} className="lg:text-center" />
        <div role="group" aria-label="Currency" className="mt-2 inline-flex rounded-full border border-line p-1">
          {(["IDR", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cur === c}
              onClick={() => setCur(c)}
              className={clsx(
                "rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-300",
                cur === c ? "bg-ink text-paper" : "text-mute hover:text-ink",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-3 w-full">
        {packages.map((p, i) => (
          <Reveal key={p.name} delay={i * 90} className="bg-paper border border-line rounded-[10px] p-7 lg:p-9 flex flex-col gap-5">
            <span className="t-h3">{p.name}</span>
            <p className="t-body text-mute">{p.tagline}</p>
            <span className="t-h3">
              <span className="text-mute text-[0.6em] align-middle mr-1">from</span>
              {cur === "IDR" ? fmtIDR(p.idr) : fmtUSD(p.usd)}
            </span>
            <ul className="t-small text-mute leading-[1.9]">
              {p.includes.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <Link href="/contact" className="btn-ghost self-start !py-2.5 !px-5 text-[14px]">{t("ask")}</Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
