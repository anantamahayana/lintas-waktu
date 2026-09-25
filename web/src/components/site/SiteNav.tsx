"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Link, usePathname } from "@/i18n/navigation";

const left = [["home", "/"], ["work", "/work"], ["services", "/services"]] as const;
const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
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
  const [mounted, setMounted] = useState(false);
  const close = () => setOpen(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    if (open) window.addEventListener("keydown", onKey);
    return () => { document.documentElement.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);

  // Sticky: transparent over the hero, then compact glass once scrolled.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 80));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const NavLink = ({ k, href }: { k: string; href: string }) => (
    <Link
      href={href}
      onClick={close}
      className={clsx("link t-mono", isActive(pathname, href) ? "text-ink" : "text-mute hover:text-ink")}
    >
      {t(`nav.${k}`)}
    </Link>
  );

  return (
    <header
      className={clsx(
        "sticky top-0 z-[60] border-b transition-[background-color,border-color,backdrop-filter] duration-700 ease-out-soft",
        "animate-[navIn_900ms_cubic-bezier(.22,1,.36,1)_backwards]",
        open ? "bg-white border-line" : scrolled ? "glass border-line" : "bg-white border-transparent",
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
        {/* the open panel has its own language switch at the bottom */}
        <div className={clsx("lg:hidden justify-self-end transition-opacity duration-300", open && "opacity-0 pointer-events-none")}><LangSwitch /></div>
      </div>

      <style>{`@keyframes navIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`}</style>

      {/* Mobile menu — portalled to <body>: the header's backdrop-filter would otherwise
          turn `fixed` into "fixed inside the header" and clip the panel (that was the bug). */}
      {mounted && createPortal(<MobileMenu open={open} close={close} />, document.body)}
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

/**
 * Full-screen panel on phones: the four pages as a quiet serif list with
 * hairlines, then language and the two ways to reach us. Enters with a soft
 * fade and a short stagger; nothing slides in from the side.
 */
function MobileMenu({ open, close }: { open: boolean; close: () => void }) {
  const t = useTranslations();
  const pathname = usePathname();
  const items = [...left, ...right];
  return (
    <div
      aria-hidden={!open}
      className={clsx(
        "fixed inset-0 z-50 bg-white flex flex-col lg:hidden transition-opacity duration-500 ease-out-soft",
        open ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      {/* spacer under the sticky header */}
      <div className="h-[72px] shrink-0" />
      <nav className="gutter flex-1 flex flex-col justify-center">
        <ul className="border-t border-line">
          {items.map(([k, href], i) => {
            const active = isActive(pathname, href);
            return (
              <li key={k} className="border-b border-line">
                <Link
                  href={href}
                  onClick={close}
                  className="flex items-baseline justify-between py-5 transition-[opacity,transform] duration-700 ease-out-soft"
                  style={{ transitionDelay: open ? `${120 + i * 70}ms` : "0ms", transform: open ? "none" : "translateY(12px)", opacity: open ? 1 : 0 }}
                >
                  <span className={clsx("font-serif text-[34px] leading-none", active ? "italic" : "")}>{t(`nav.${k}`)}</span>
                  <span className="t-mono text-faint">0{i + 1}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div
        className="gutter pb-[max(28px,env(safe-area-inset-bottom))] flex items-end justify-between transition-opacity duration-700 ease-out-soft"
        style={{ transitionDelay: open ? "420ms" : "0ms", opacity: open ? 1 : 0 }}
      >
        <div className="flex flex-col gap-1">
          <span className="t-wordmark">{t("brand.name")}</span>
          <span className="t-mono text-faint">{t("brand.descriptor")}</span>
        </div>
        <LangSwitch />
      </div>
    </div>
  );
}
