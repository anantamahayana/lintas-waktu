"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { nextGoldenHour } from "@/lib/sun";

const BALI = { lat: -8.65, lng: 115.22, offset: 8, tz: "Asia/Makassar" }; // Denpasar, WITA (UTC+8)

/**
 * "Bali · 16.42 WITA" and the next golden hour, for visitors planning from elsewhere.
 * Until the clock is known it renders the same lines invisibly, with the longest wording,
 * so the block has its final size from the first paint (no layout shift); then it fades in.
 * Updates on the minute, never faster, and nothing runs while the tab is hidden.
 */
export function BaliTime({ className }: { className?: string }) {
  const t = useTranslations("time");
  const locale = useLocale();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
    };
    const onVis = () => { clearTimeout(timer); if (!document.hidden) tick(); };
    tick();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const fmt = (d: Date) => d.toLocaleTimeString(locale === "id" ? "id-ID" : "en-GB", { timeZone: BALI.tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const gold = now && nextGoldenHour(now, BALI.lat, BALI.lng, BALI.offset);

  return (
    <p className={clsx("w-full flex flex-col items-center text-center gap-1.5 t-mono text-faint transition-opacity duration-700", now ? "opacity-100" : "opacity-0", className)} aria-hidden={!now}>
      <span>{t("clock", { time: now ? fmt(now) : "00.00" })}</span>
      <span>
        {!now || !gold ? t("golden", { when: t("tomorrow"), from: "00.00", to: "00.00" })
          : gold.from <= now ? t("goldenNow", { to: fmt(gold.to) })
          : t("golden", { when: t(gold.when), from: fmt(gold.from), to: fmt(gold.to) })}
      </span>
    </p>
  );
}
