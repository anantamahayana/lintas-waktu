"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Link, usePathname } from "@/i18n/navigation";

const left = [["work", "/work"], ["services", "/services"]] as const;
const right = [["about", "/about"], ["contact", "/contact"]] as const;

/**
 * A quiet white bar: links left and right, the wordmark in the middle
 * like a signature. On phones: wordmark + "Menu".
 */
export function SiteNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  const NavLink = ({ k, href }: { k: string; href: string }) => (
    <Link
      href={href}
      onClick={close}
      className={clsx("link t-mono", pathname.startsWith(href) ? "text-ink" : "text-mute hover:text-ink")}
    >
      {t(`nav.${k}`)}
    </Link>
  );

  return (
    <header className="relative z-50 bg-white">
      <div className="wrap gutter h-[72px] lg:h-[84px] grid grid-cols-[1fr_auto_1fr] items-center">
        <nav className="hidden lg:flex items-center gap-8">
          {left.map(([k, href]) => <NavLink key={k} k={k} href={href} />)}
        </nav>
        <button type="button" aria-label={t("nav.menu")} onClick={() => setOpen((v) => !v)} className="lg:hidden justify-self-start t-mono text-mute">
          {open ? t("nav.close") : t("nav.menu")}
        </button>

        <Link href="/" onClick={close} className="flex flex-col items-center gap-1 justify-self-center">
          <span className="t-wordmark">{t("brand.name")}</span>
          <span className="t-mono text-faint hidden sm:block">{t("brand.descriptor")}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8 justify-self-end">
          {right.map(([k, href]) => <NavLink key={k} k={k} href={href} />)}
          <LangSwitch />
        </nav>
        <div className="lg:hidden justify-self-end"><LangSwitch /></div>
      </div>

      {/* Mobile menu */}
      <div
        className={clsx(
          "fixed inset-0 top-[72px] z-40 bg-white flex flex-col items-center justify-center gap-8 transition-opacity duration-500 lg:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {[...left, ...right].map(([k, href], i) => (
          <Link
            key={k}
            href={href}
            onClick={close}
            className="font-serif text-[36px] leading-none transition-[opacity,transform] duration-700 ease-out-soft"
            style={{ transitionDelay: `${i * 60}ms`, transform: open ? "none" : "translateY(10px)", opacity: open ? 1 : 0 }}
          >
            {t(`nav.${k}`)}
          </Link>
        ))}
      </div>
    </header>
  );
}

function LangSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <span className="t-mono flex items-center gap-2">
      <Link href={pathname} locale="en" className={clsx("link", locale === "en" ? "text-ink" : "text-faint")}>EN</Link>
      <span className="text-faint">/</span>
      <Link href={pathname} locale="id" className={clsx("link", locale === "id" ? "text-ink" : "text-faint")}>ID</Link>
    </span>
  );
}
