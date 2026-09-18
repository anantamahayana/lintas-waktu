"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { waLink } from "@/lib/site";

const KINDS = ["wedding", "prewedding", "event", "personal", "other"] as const;
const BUDGETS = ["b1", "b2", "b3", "b4", "b5"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = {
  name: string; partner: string; email: string; based: string; kind: string;
  date: string; location: string; budget: string; message: string; website: string;
};

export function ContactForm({ initialKind = "" }: { initialKind?: string }) {
  const t = useTranslations("contact.form");
  const locale = useLocale();
  const [v, setV] = useState<Values>({
    name: "", partner: "", email: "", based: "", kind: KINDS.includes(initialKind as never) ? initialKind : "",
    date: "", location: "", budget: "", message: "", website: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  function validate() {
    const e: typeof errors = {};
    if (!v.name.trim()) e.name = t("required");
    if (!EMAIL.test(v.email)) e.email = t("invalidEmail");
    if (!v.kind) e.kind = t("required");
    if (!v.message.trim()) e.message = t("required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...v, locale }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    const wa = waLink(`Hi Lintas Waktu — ${v.name} here. I just sent an inquiry about a ${v.kind} (${v.date || "date TBC"}).`);
    return (
      <div className="flex flex-col items-center text-center gap-4 py-10">
        <span className="h-12 w-12 rounded-full bg-ink text-paper flex items-center justify-center text-lg">✓</span>
        <p className="t-h2 font-display italic">{t("sentTitle", { name: v.name.split(" ")[0] })}</p>
        <p className="t-body text-mute max-w-[440px]">{t("sentBody")}</p>
        <a href={wa} className="btn-ghost mt-2">{t("sentWhatsapp")}</a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      <h2 className="t-h3">{t("title")}</h2>

      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
        <Field label={t("name")} error={errors.name}>
          <input className={clsx("field", errors.name && "field-error")} value={v.name} onChange={set("name")} autoComplete="name" placeholder="Ayu Lestari" />
        </Field>
        <Field label={t("partner")} optional={t("optional")}>
          <input className="field" value={v.partner} onChange={set("partner")} placeholder="Marco Rossi" />
        </Field>
        <Field label={t("email")} error={errors.email}>
          <input type="email" className={clsx("field", errors.email && "field-error")} value={v.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label={t("based")} optional={t("optional")}>
          <input className="field" value={v.based} onChange={set("based")} placeholder="Melbourne, Australia" />
        </Field>
        <Field label={t("kind")} error={errors.kind}>
          <select className={clsx("field", errors.kind && "field-error", !v.kind && "text-faint")} value={v.kind} onChange={set("kind")}>
            <option value="" disabled>—</option>
            {KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
          </select>
        </Field>
        <Field label={t("date")} optional={t("optional")}>
          <input className="field" value={v.date} onChange={set("date")} placeholder="June 2027" />
        </Field>
        <Field label={t("location")} optional={t("optional")}>
          <input className="field" value={v.location} onChange={set("location")} placeholder="Uluwatu, or not sure yet" />
        </Field>
        <Field label={t("budget")} optional={t("optional")}>
          <select className={clsx("field", !v.budget && "text-faint")} value={v.budget} onChange={set("budget")}>
            <option value="">—</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{t(`budgets.${b}`)}</option>)}
          </select>
        </Field>
      </div>

      <Field label={t("message")} error={errors.message}>
        <textarea rows={4} className={clsx("field resize-none", errors.message && "field-error")} value={v.message} onChange={set("message")} placeholder={t("messagePh")} />
      </Field>

      {/* Honeypot — hidden from people, filled by bots */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} /></label>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <p className="t-small text-mute">{t("privacy")}</p>
        <button type="submit" disabled={status === "sending"} className="btn-ink">
          {status === "sending" ? t("sending") : t("submit")}
        </button>
      </div>
      {status === "error" && <p className="t-small text-error">Something went wrong — please try WhatsApp or email.</p>}
    </form>
  );
}

function Field({ label, optional, error, children }: { label: string; optional?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">
        {label}
        {optional && <span className="normal-case tracking-normal text-faint"> ({optional})</span>}
      </span>
      {children}
      {error && <span className="t-small text-error">{error}</span>}
    </label>
  );
}
