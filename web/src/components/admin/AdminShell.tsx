"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { token } from "@/lib/admin-api";
import { confirm, confirmLeave, hasUnsavedChanges } from "@/components/admin/ui";

const groups: { label: string; items: { href: string; label: string; exact?: boolean }[] }[] = [
  { label: "Proofing", items: [{ href: "/admin", label: "Sessions", exact: true }, { href: "/admin/sessions/new", label: "New session" }] },
  { label: "Business", items: [{ href: "/admin/invoices", label: "Invoices" }] },
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

  // Unsaved changes: intercept in-app links (capture phase, before Next's
  // Link handler) and ask first. External links are left to `beforeunload`.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!hasUnsavedChanges() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== location.origin) return;
      const href = a.getAttribute("href")!;
      if (href === pathname) return;
      e.preventDefault();
      e.stopPropagation();
      confirmLeave().then((ok) => { if (ok) router.push(href); });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  async function logout() {
    if (!(await confirmLeave())) return;
    const ok = await confirm({ title: "Log out?", body: "You will need the admin password to get back in. Client galleries stay open.", action: "Log out" });
    if (!ok) return;
    token.clear();
    router.replace("/admin/login");
  }

  if (isLogin) return <>{children}</>;
  if (!hasToken) return null;

  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr] print:block">
      {/* Sidebar */}
      <aside className="border-b lg:border-b-0 lg:border-r border-line bg-[#f6f5f1] print:hidden">
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
            <button type="button" onClick={logout} className="link self-start">Log out</button>
          </div>
        </nav>
      </aside>

      <main className="px-5 py-8 lg:px-12 lg:py-10 max-w-[1240px] w-full print:p-0 print:max-w-none">{children}</main>
    </div>
  );
}
