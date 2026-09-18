"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Link, usePathname } from "@/i18n/navigation";

const links = [
  ["work", "/work"],
  ["services", "/services"],
  ["about", "/about"],
  ["contact", "/contact"],
] as const;

export function SiteNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[var(--nav-h)] gutter flex items-center justify-between mix-blend-difference text-white">
      <Link href="/" onClick={close} className="t-wordmark">
        {t("brand.name")}
      </Link>

      <nav className="hidden lg:flex items-center gap-8 t-mono">
        {links.map(([k, href]) => (
          <Link key={k} href={href} className={clsx("link", pathname.startsWith(href) && "opacity-60")}>
            {t(`nav.${k}`)}
          </Link>
        ))}
        <LangSwitch />
      </nav>

      <button
        type="button"
        aria-label={open ? t("nav.close") : t("nav.menu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden t-mono"
      >
        {open ? t("nav.close") : t("nav.menu")}
      </button>

      {/* Mobile menu — plain, full-screen, no blend */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-white text-ink flex flex-col gutter pt-24 pb-16 mix-blend-normal transition-opacity duration-500 lg:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <nav className="flex flex-col gap-2">
          {links.map(([k, href], i) => (
            <Link
              key={k}
              href={href}
              onClick={close}
              className="t-display-sm py-2 transition-transform duration-700 ease-out-soft"
              style={{ transitionDelay: `${i * 60}ms`, transform: open ? "none" : "translateY(12px)" }}
            >
              {t(`nav.${k}`)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between t-mono text-mute">
          <LangSwitch />
          <span>Bali · WITA</span>
        </div>
      </div>
    </header>
  );
}

function LangSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <span className="t-mono flex items-center gap-2">
      <Link href={pathname} locale="en" className={clsx("link", locale !== "en" && "opacity-50")}>EN</Link>
      <Link href={pathname} locale="id" className={clsx("link", locale !== "id" && "opacity-50")}>ID</Link>
    </span>
  );
}
