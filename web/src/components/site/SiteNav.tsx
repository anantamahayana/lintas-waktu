"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";
import { Link, usePathname } from "@/i18n/navigation";
import clsx from "clsx";

const links = ["work", "services", "about"] as const;
const hrefs = { work: "/work", services: "/services", about: "/about", contact: "/contact" } as const;

export function SiteNav() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Lock scroll while the menu is open
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="gutter relative z-40 flex items-center justify-between py-5 lg:py-7">
      {/* Desktop links */}
      <nav className="hidden lg:flex items-center gap-7 text-[14px]">
        {links.map((k) => (
          <Link key={k} href={hrefs[k]} className="hover:text-mute transition-colors">
            {t(`nav.${k}`)}
          </Link>
        ))}
      </nav>

      {/* Wordmark */}
      <Link href="/" className="flex flex-col items-start lg:items-center gap-0.5 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
        <span className="t-wordmark">{t("brand.name")}</span>
        <span className="eyebrow">{t("brand.descriptor")}</span>
      </Link>

      {/* Right */}
      <div className="hidden lg:flex items-center gap-6">
        <LangSwitch />
        <Link href={hrefs.contact} className="btn-ghost !py-2.5 !px-5 text-[14px]">
          {t("nav.contact")}
        </Link>
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        aria-label={open ? t("nav.close") : t("nav.menu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden relative h-9 w-9 -mr-2 flex flex-col items-center justify-center gap-[5px]"
      >
        <span className={clsx("block h-[1.5px] w-[22px] bg-ink transition-transform duration-300", open && "translate-y-[3.25px] rotate-45")} />
        <span className={clsx("block h-[1.5px] w-[22px] bg-ink transition-transform duration-300", open && "-translate-y-[3.25px] -rotate-45")} />
      </button>

      {/* Mobile menu */}
      <LazyMotion features={domAnimation} strict>
        <AnimatePresence>
          {open && (
            <m.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-30 bg-ink text-on-dark flex flex-col px-6 pt-24 pb-8 lg:hidden"
            >
              <nav className="flex flex-col">
                {[...links, "contact" as const].map((k, i) => (
                  <m.div
                    key={k}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="border-b border-line-dark"
                  >
                    <Link href={hrefs[k]} onClick={close} className="flex items-baseline gap-4 py-4">
                      <span className="eyebrow !text-on-dark-mute">0{i + 1}</span>
                      <span className={clsx("font-display text-[44px] leading-none", i === 0 && "italic")}>{t(`nav.${k}`)}</span>
                    </Link>
                  </m.div>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-4">
                <Link href={hrefs.contact} onClick={close} className="btn bg-paper text-ink w-full">
                  {t("cta.start")}
                </Link>
                <div className="flex items-center justify-between text-[13px] text-on-dark-mute">
                  <LangSwitch dark />
                  <span>Instagram · WhatsApp</span>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </header>
  );
}

function LangSwitch({ dark = false }: { dark?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "id" : "en";
  return (
    <span className={clsx("text-[13px] flex items-center gap-1", dark ? "text-on-dark-mute" : "text-mute")}>
      <Link href={pathname} locale="en" className={clsx(locale === "en" && (dark ? "text-on-dark" : "text-ink"))}>EN</Link>
      <span>/</span>
      <Link href={pathname} locale="id" className={clsx(locale === "id" && (dark ? "text-on-dark" : "text-ink"))}>ID</Link>
      <span className="sr-only">{other}</span>
    </span>
  );
}
