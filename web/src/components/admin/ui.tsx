"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "ink" | "ghost" | "danger" | "danger-solid"; ref?: React.Ref<HTMLButtonElement> };
export function Btn({ children, kind = "ghost", className, ref, ...rest }: BtnProps) {
  return (
    <button
      ref={ref}
      {...rest}
      className={clsx(
        "t-mono inline-flex items-center justify-center gap-2 px-4 py-2.5 transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none",
        kind === "ink" && "bg-ink text-white hover:bg-dark",
        kind === "ghost" && "border border-line text-ink hover:border-ink",
        kind === "danger" && "border border-line text-mute hover:border-error hover:text-error",
        kind === "danger-solid" && "bg-error text-white hover:bg-[#8c3627]",
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

type Invalid = { invalid?: boolean };
export function Input({ invalid, ...props }: React.InputHTMLAttributes<HTMLInputElement> & Invalid) {
  return <input {...props} aria-invalid={invalid || undefined} className={clsx("field !h-11", invalid && "field-error", props.className)} />;
}
export function Textarea({ invalid, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return <textarea {...props} aria-invalid={invalid || undefined} className={clsx("field !min-h-[96px]", invalid && "field-error", props.className)} />;
}
export function Select({ invalid, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
  return <select {...props} aria-invalid={invalid || undefined} className={clsx("field !h-11", invalid && "field-error", props.className)} />;
}

/** Shared shape for form validation: field → message. Empty object = valid. */
export type FieldErrors = Record<string, string | undefined>;
/** Scroll the first invalid control into view and focus it. */
export function focusFirstInvalid() {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>("[aria-invalid=true]");
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  });
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

/* ------------------------------------------------------------------ toasts
   Stacked, bottom-centre. `toast(msg)` for success, `toast(msg, true)` for
   errors (stay longer, dismissable). Call from anywhere in the admin. */
type Toast = { id: number; m: string; err: boolean };
let listener: ((m: string, err?: boolean) => void) | null = null;
export function toast(message: string, err = false) { listener?.(message, err); }
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    listener = (m, err = false) => {
      const id = ++n;
      setItems((xs) => [...xs.slice(-3), { id, m, err }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), err ? 6000 : 3200);
    };
    return () => { listener = null; };
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      {items.map((t) => (
        <div key={t.id} role={t.err ? "alert" : "status"} className="admin-toast pointer-events-auto bg-ink text-white t-small px-4 py-3 flex items-center gap-3 shadow-lg max-w-[min(92vw,480px)]">
          <span className={clsx("h-2 w-2 shrink-0 rounded-full", t.err ? "bg-error" : "bg-[#c9a84c]")} />
          <span>{t.m}</span>
          {t.err && <button type="button" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} className="ml-1 text-white/60 hover:text-white" aria-label="Dismiss">×</button>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ confirm
   `await confirm({ title, body, action, danger })` → boolean. One dialog,
   mounted once in the shell (<ConfirmHost/>), styled like the rest. */
export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  /** label of the confirming button, e.g. "Delete" */
  action?: string;
  cancel?: string;
  danger?: boolean;
};
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let confirmListener: ((p: Pending) => void) | null = null;
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  if (!confirmListener) return Promise.resolve(window.confirm(opts.title));
  return new Promise((resolve) => confirmListener?.({ ...opts, resolve }));
}
export function ConfirmHost() {
  const [p, setP] = useState<Pending | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { confirmListener = setP; return () => { confirmListener = null; }; }, []);
  const close = useCallback((ok: boolean) => { p?.resolve(ok); setP(null); }, [p]);
  useEffect(() => {
    if (!p) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, close]);
  if (!p) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/40 backdrop-blur-[2px] admin-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="admin-pop w-full max-w-[440px] bg-white border border-line p-6 flex flex-col gap-4 shadow-xl">
        <h2 id="confirm-title" className="font-serif text-[24px] leading-tight">{p.title}</h2>
        {p.body && <div className="t-small text-mute leading-relaxed">{p.body}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" onClick={() => close(false)}>{p.cancel ?? "Cancel"}</Btn>
          <Btn ref={okRef} type="button" kind={p.danger ? "danger-solid" : "ink"} onClick={() => close(true)}>{p.action ?? "Continue"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ unsaved changes
   A form reports `dirty`; the tab then warns before closing, and the shell
   asks (via confirmLeave) before following any in-app link or logging out. */
const dirtyForms = new Set<symbol>();
export function useUnsavedChanges(dirty: boolean) {
  const key = useRef(Symbol("form"));
  useEffect(() => {
    const k = key.current;
    if (dirty) dirtyForms.add(k); else dirtyForms.delete(k);
    return () => { dirtyForms.delete(k); };
  }, [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);
}
export function hasUnsavedChanges() { return dirtyForms.size > 0; }
/** Ask before leaving a dirty form; resolves true when navigation may proceed. */
export async function confirmLeave() {
  if (!hasUnsavedChanges()) return true;
  const ok = await confirm({ title: "Leave without saving?", body: "The changes on this page have not been saved and will be lost.", action: "Leave", danger: true, cancel: "Stay" });
  if (ok) dirtyForms.clear();
  return ok;
}

/* ------------------------------------------------------------------ loading / empty / error
   Skeleton shapes mirror the layout they stand in for, so the page does not
   jump when data lands. Empty states always say what to do next. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("admin-skel bg-line", className)} />;
}
export function SkeletonRows({ n = 5 }: { n?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="border-t border-line">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-6 py-4 border-b border-line">
          <Skeleton className="h-4 w-[26%]" />
          <Skeleton className="h-3 w-[14%]" />
          <Skeleton className="h-3 w-[10%]" />
          <Skeleton className="h-3 w-[18%] ml-auto" />
        </div>
      ))}
    </div>
  );
}
export function SkeletonCards({ n = 8 }: { n?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="border border-line bg-white p-3 flex flex-col gap-3">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid lg:grid-cols-2 gap-6 items-start">
      {Array.from({ length: 2 }, (_, c) => (
        <div key={c} className="border border-line bg-white p-5 lg:p-6 flex flex-col gap-5">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: Math.ceil(fields / 2) }, (_, i) => (
            <div key={i} className="flex flex-col gap-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-11 w-full" /></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line p-10 lg:p-14 text-center flex flex-col items-center gap-3">
      <p className="font-serif text-[24px] leading-tight">{title}</p>
      {body && <p className="t-small text-mute max-w-[44ch]">{body}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/** Shown when the API could not be reached: the message, and a way back. */
export function LoadError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div role="alert" className="border border-line p-10 text-center flex flex-col items-center gap-3">
      <p className="font-serif text-[24px] leading-tight">Could not load this page.</p>
      <p className="t-small text-mute max-w-[48ch]">{error}. Check that the API is running, then try again.</p>
      <div className="pt-2"><Btn onClick={retry}>Try again</Btn></div>
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
