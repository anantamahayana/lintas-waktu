"use client";

import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";

/* Small admin UI kit — same tokens as the site, denser spacing. */

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <span className="t-mono text-mute">{eyebrow}</span>}
        <h1 className="font-serif text-[34px] leading-none">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("border border-line bg-white p-5 lg:p-6 flex flex-col gap-4", className)}>
      {title && <h2 className="t-mono text-mute">{title}</h2>}
      {children}
    </section>
  );
}

export function Btn({ children, kind = "ghost", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "ink" | "ghost" | "danger" }) {
  return (
    <button
      {...rest}
      className={clsx(
        "t-mono inline-flex items-center justify-center gap-2 px-4 py-2.5 transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none",
        kind === "ink" && "bg-ink text-white hover:bg-dark",
        kind === "ghost" && "border border-line text-ink hover:border-ink",
        kind === "danger" && "border border-line text-mute hover:border-error hover:text-error",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("flex flex-col gap-1.5", className)}>
      <span className="t-mono text-mute">{label}{hint && <span className="text-faint normal-case tracking-normal"> · {hint}</span>}</span>
      {children}
      {error && <span className="t-small text-error">{error}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("field !h-11", props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx("field !min-h-[96px]", props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx("field !h-11", props.className)} />;
}

export function Pill({ tone = "mute", children }: { tone?: "mute" | "ok" | "warn" | "new"; children: ReactNode }) {
  const dot = { mute: "bg-faint", ok: "bg-[#5f7a4a]", warn: "bg-[#c9a84c]", new: "bg-error" }[tone];
  return (
    <span className="inline-flex items-center gap-2 t-small">
      <span className={clsx("h-2 w-2 rounded-full", dot)} />
      {children}
    </span>
  );
}

export function Stat({ n, label, active, onClick }: { n: number | string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={clsx("flex flex-col gap-1 p-4 border text-left transition-colors", active ? "bg-ink text-white border-ink" : "border-line hover:border-ink")}>
      <span className="font-serif text-[30px] leading-none">{n}</span>
      <span className={clsx("t-small", active ? "text-white/80" : "text-mute")}>{label}</span>
    </button>
  );
}

/** Tiny toast; call `toast(msg)` from anywhere in the admin. */
let listener: ((m: string, err?: boolean) => void) | null = null;
export function toast(message: string, err = false) { listener?.(message, err); }
export function Toaster() {
  const [t, setT] = useState<{ m: string; err: boolean } | null>(null);
  useEffect(() => {
    listener = (m, err = false) => { setT({ m, err }); setTimeout(() => setT(null), 3200); };
    return () => { listener = null; };
  }, []);
  if (!t) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white t-small px-4 py-3 flex items-center gap-3 shadow-lg">
      <span className={clsx("h-2 w-2 rounded-full", t.err ? "bg-error" : "bg-[#c9a84c]")} />
      {t.m}
    </div>
  );
}

export function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}
export function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
