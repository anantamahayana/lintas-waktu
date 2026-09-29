"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { waLink } from "@/lib/site";
import { Postmark } from "./Postmark";

const KINDS = ["wedding", "prewedding", "editorial", "event", "personal", "other"] as const;
const BUDGETS = ["r1", "r2", "r3", "r4", "b5"] as const; // r*: ranges since Sep 2026 prices; b1–b4 were the old ones
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = {
  name: string; partner: string; email: string; based: string; kind: string;
  date: string; location: string; budget: string; message: string; website: string;
};

export function ContactForm({ initialKind = "", whatsapp }: { initialKind?: string; whatsapp?: string }) {
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
    const wa = waLink(`Hi Lintas Waktu — ${v.name} here. I just sent an inquiry about a ${v.kind} (${v.date || "date TBC"}).`, whatsapp);
    return (
      <div className="relative flex flex-col gap-6 py-6">
        <Postmark label={t("stamp")} date={new Date().toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Makassar" })}
          className="stamp-in absolute -top-2 right-0 h-24 w-24 sm:h-28 sm:w-28 text-ink/80" />
        <p className="t-statement max-w-[24ch] pr-24 sm:pr-28">{t("sentTitle", { name: v.name.split(" ")[0] })}</p>
        <p className="t-body text-mute max-w-[48ch]">{t("sentBody")}</p>
        <a href={wa} className="action">{t("sentWhatsapp")}</a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <h2 className="t-mono text-mute">{t("title")}</h2>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
        <Field label={t("name")} error={errors.name}>
          <input className={clsx("field", errors.name && "field-error")} value={v.name} onChange={set("name")} autoComplete="name" placeholder={t("ph.name")} />
        </Field>
        <Field label={t("partner")} optional={t("optional")}>
          <input className="field" value={v.partner} onChange={set("partner")} placeholder={t("ph.partner")} />
        </Field>
        <Field label={t("email")} error={errors.email}>
          <input type="email" className={clsx("field", errors.email && "field-error")} value={v.email} onChange={set("email")} autoComplete="email" placeholder={t("ph.email")} />
        </Field>
        <Field label={t("based")} optional={t("optional")}>
          <input className="field" value={v.based} onChange={set("based")} placeholder={t("ph.based")} />
        </Field>
        <Field label={t("kind")} error={errors.kind}>
          <select className={clsx("field", errors.kind && "field-error", !v.kind && "text-faint")} value={v.kind} onChange={set("kind")}>
            <option value="" disabled>—</option>
            {KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
          </select>
        </Field>
        <Field label={t("date")} optional={t("optional")}>
          <input className="field" value={v.date} onChange={set("date")} placeholder={t("ph.date")} />
        </Field>
        <Field label={t("location")} optional={t("optional")}>
          <input className="field" value={v.location} onChange={set("location")} placeholder={t("ph.location")} />
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
        <button type="submit" disabled={status === "sending"} className="ink-btn">
          {status === "sending" ? t("sending") : t("submit")}
        </button>
      </div>
      {status === "error" && <p className="t-small text-error">{t("errorGeneric")}</p>}
    </form>
  );
}

function Field({ label, optional, error, children }: { label: string; optional?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="t-mono text-mute">
        {label}
        {optional && <span className="text-faint"> · {optional}</span>}
      </span>
      {children}
      {error && <span className="t-small text-error">{error}</span>}
    </label>
  );
}
