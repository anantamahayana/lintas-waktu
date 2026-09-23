"use client";

import { useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import { money } from "./InvoiceDoc";
import { VERIFY, type Lang } from "./strings";

const API = process.env.NEXT_PUBLIC_API_URL ?? ""; // "" = same origin, through the /api rewrites

type Result = {
  valid: boolean; reason: "match" | "outdated" | "no_match" | "unknown" | "void"; number: string; status?: string | null; kind?: string | null;
  client_name?: string | null; total?: number | null; currency?: string | null; issued_at?: string | null; paid_at?: string | null;
  business?: { name: string; bank_details: string; email: string; phone: string } | null;
};

/**
 * /verify — anyone holding a printed or PDF invoice can confirm it is ours and unchanged.
 * Shows nothing about a document unless the number AND code match, so it cannot be
 * used to look up clients.
 */
export function VerifyView({ number: n0, code: c0, lang: l0 }: { number: string; code: string; lang?: string }) {
  const [lang, setLang] = useState<Lang>(l0 === "id" ? "id" : "en");
  useEffect(() => { if (!l0 && navigator.language.toLowerCase().startsWith("id")) { const t = setTimeout(() => setLang("id"), 0); return () => clearTimeout(t); } }, [l0]);
  const v = VERIFY[lang];
  const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—");
  const [number, setNumber] = useState(n0);
  const [code, setCode] = useState(c0);
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(num = number, cd = code) {
    if (!num.trim() || !cd.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/public/verify/${encodeURIComponent(num.trim())}?c=${encodeURIComponent(cd.trim())}`);
      setRes(await r.json());
    } catch {
      setRes({ valid: false, reason: "unknown", number: num });
    } finally {
      setBusy(false);
    }
  }
  // Arrived via the QR link: check straight away (deferred a tick so the effect itself sets no state)
  useEffect(() => { if (n0 && c0) { const t = setTimeout(() => check(n0, c0), 0); return () => clearTimeout(t); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onSubmit = (e: FormEvent) => { e.preventDefault(); check(); };

  const contact = res?.business?.email || res?.business?.phone || v.us;

  return (
    <main className="px-5 py-14 sm:py-20 max-w-[560px] mx-auto flex flex-col gap-10">
      <header className="flex flex-col gap-2 text-center relative">
        <span className="font-serif italic text-[26px] leading-none">Lintas Waktu</span>
        <span className="t-mono text-mute">{v.title}</span>
        <span className="t-mono absolute right-0 top-0 flex gap-2">
          {(["en", "id"] as Lang[]).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={lang === l ? "text-ink" : "text-faint"}>{l.toUpperCase()}</button>)}
        </span>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 border border-line p-6">
        <p className="t-body">{v.lead}</p>
        <label className="flex flex-col gap-1.5"><span className="t-mono text-mute">{v.number}</span><input className="field font-mono" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="LW-2026-0001" autoCapitalize="characters" /></label>
        <label className="flex flex-col gap-1.5"><span className="t-mono text-mute">{v.code}</span><input className="field font-mono tracking-[0.12em]" value={code} onChange={(e) => setCode(e.target.value)} placeholder="K7Q2-M9XA" autoCapitalize="characters" /></label>
        <button type="submit" disabled={busy} className="ink-btn self-start">{busy ? v.checking : v.check}</button>
      </form>

      {res && (
        <section aria-live="polite" className={clsx("border p-6 flex flex-col gap-4", res.valid ? "border-[#5f7a4a]" : "border-error")}>
          {res.valid ? (
            <>
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[#5f7a4a] text-white flex items-center justify-center text-[14px]">✓</span>
                <span className="font-serif text-[24px] leading-tight">{v.genuine(res.kind ?? "invoice")}</span>
              </div>
              <p className="t-body">{v.issuedBy(res.business?.name ?? "")}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 t-small">
                <dt className="t-mono text-faint">{v.number}</dt><dd className="font-mono">{res.number}</dd>
                <dt className="t-mono text-faint">{v.for}</dt><dd>{res.client_name}</dd>
                <dt className="t-mono text-faint">{v.total}</dt><dd className="tabular-nums">{money(res.total ?? 0, res.currency ?? "IDR")}</dd>
                <dt className="t-mono text-faint">{v.issued}</dt><dd>{fmtDate(res.issued_at)}</dd>
                <dt className="t-mono text-faint">{v.status}</dt><dd>{res.status === "paid" ? `${v.paid} · ${fmtDate(res.paid_at)}` : v.awaiting}</dd>
                {res.business?.bank_details && res.status !== "paid" && res.kind !== "quote" && (
                  <><dt className="t-mono text-faint">{v.bank}</dt><dd className="whitespace-pre-line text-ink">{res.business.bank_details}</dd></>
                )}
              </dl>
              <p className="t-small text-mute">{v.altered(contact)}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-error text-white flex items-center justify-center text-[14px]">!</span>
                <span className="font-serif text-[24px] leading-tight">{res.reason === "void" ? v.cancelledTitle : v.notVerified}</span>
              </div>
              <p className="t-body">{res.reason === "void" ? v.voidBody : res.reason === "unknown" ? v.unknownBody : v.noMatchBody}</p>
            </>
          )}
        </section>
      )}
    </main>
  );
}
