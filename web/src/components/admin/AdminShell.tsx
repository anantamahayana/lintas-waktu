"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { token } from "@/lib/admin-api";

const groups: { label: string; items: { href: string; label: string; exact?: boolean }[] }[] = [
  { label: "Proofing", items: [{ href: "/admin", label: "Sessions", exact: true }, { href: "/admin/sessions/new", label: "New session" }] },
  { label: "Website", items: [{ href: "/admin/projects", label: "Projects" }, { href: "/admin/inquiries", label: "Inquiries" }] },
  { label: "", items: [{ href: "/admin/settings", label: "Site settings" }] },
];

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [open, setOpen] = useState(false);
  // Token presence, read without a hydration mismatch (server snapshot = false)
  const hasToken = useSyncExternalStore(subscribeStorage, () => !!token.get(), () => false);

  // Gate: no token → login. Reads storage directly — effects only run on the
  // client, so this avoids the hydration snapshot (false) racing the redirect.
  useEffect(() => {
    if (!isLogin && !token.get()) router.replace("/admin/login");
  }, [isLogin, router, pathname]);

  if (isLogin) return <>{children}</>;
  if (!hasToken) return null;

  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="border-b lg:border-b-0 lg:border-r border-line bg-[#f6f5f1]">
        <div className="flex items-center justify-between px-5 py-4 lg:py-6">
          <Link href="/admin" className="flex flex-col gap-0.5">
            <span className="font-serif italic text-[20px] leading-none">Lintas Waktu</span>
            <span className="t-mono text-faint">Admin</span>
          </Link>
          <button type="button" onClick={() => setOpen((v) => !v)} className="lg:hidden t-mono text-mute">{open ? "Close" : "Menu"}</button>
        </div>
        <nav className={clsx("px-3 pb-5 flex flex-col gap-4", open ? "block" : "hidden lg:flex")}>
          {groups.map((g, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {g.label && <span className="t-mono text-faint px-2 pb-1.5">{g.label}</span>}
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={clsx("px-2 py-2 text-[14px] transition-colors", active(it.href, it.exact) ? "bg-white border border-line" : "text-ink/80 hover:text-ink")}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="mt-auto pt-6 flex flex-col gap-2 px-2 t-small text-mute">
            <a href="/" target="_blank" rel="noreferrer" className="link self-start">View website ↗</a>
            <button type="button" onClick={() => { token.clear(); router.replace("/admin/login"); }} className="link self-start">Log out</button>
          </div>
        </nav>
      </aside>

      <main className="px-5 py-8 lg:px-12 lg:py-10 max-w-[1240px] w-full">{children}</main>
    </div>
  );
}
