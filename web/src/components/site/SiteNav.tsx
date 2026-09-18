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
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  // Sticky behaviour: compact after 80px; hide on scroll down, show on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 80);
        setHidden(y > 400 && y > last + 4);
        if (y < last - 4 || y <= 400) setHidden(false);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

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
    <header
      className={clsx(
        "sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b transition-[transform,border-color,box-shadow] duration-500 ease-out-soft",
        "animate-[navIn_900ms_cubic-bezier(.22,1,.36,1)_backwards]",
        scrolled ? "border-line shadow-[0_1px_0_0_rgba(0,0,0,0.02)]" : "border-transparent",
        hidden && !open ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div
        className={clsx(
          "wrap gutter grid grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-500 ease-out-soft",
          scrolled ? "h-[60px] lg:h-[64px]" : "h-[72px] lg:h-[84px]",
        )}
      >
        <nav className="hidden lg:flex items-center gap-8">
          {left.map(([k, href]) => <NavLink key={k} k={k} href={href} />)}
        </nav>
        <button type="button" aria-label={t("nav.menu")} onClick={() => setOpen((v) => !v)} className="lg:hidden justify-self-start t-mono text-mute">
          {open ? t("nav.close") : t("nav.menu")}
        </button>

        <Link href="/" onClick={close} className="flex flex-col items-center justify-self-center overflow-hidden">
          <span className="t-wordmark transition-transform duration-500 ease-out-soft" style={{ transform: scrolled ? "scale(0.92)" : "none" }}>
            {t("brand.name")}
          </span>
          <span
            className="t-mono text-faint hidden sm:block transition-[opacity,max-height,margin] duration-500 ease-out-soft"
            style={{ opacity: scrolled ? 0 : 1, maxHeight: scrolled ? 0 : 16, marginTop: scrolled ? 0 : 4 }}
          >
            {t("brand.descriptor")}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8 justify-self-end">
          {right.map(([k, href]) => <NavLink key={k} k={k} href={href} />)}
          <LangSwitch />
        </nav>
        <div className="lg:hidden justify-self-end"><LangSwitch /></div>
      </div>

      <style>{`@keyframes navIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`}</style>

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
