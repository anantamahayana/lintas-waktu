"use client";

import { useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import { money } from "./InvoiceDoc";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Result = {
  valid: boolean; reason: "match" | "outdated" | "no_match" | "unknown" | "void"; number: string; status?: string | null; kind?: string | null;
  client_name?: string | null; total?: number | null; currency?: string | null; issued_at?: string | null; paid_at?: string | null;
  business?: { name: string; bank_details: string; email: string; phone: string } | null;
};
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—");

/**
 * /verify — anyone holding a printed or PDF invoice can confirm it is ours and unchanged.
 * Shows nothing about a document unless the number AND code match, so it cannot be
 * used to look up clients.
 */
export function VerifyView({ number: n0, code: c0 }: { number: string; code: string }) {
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

  const contact = res?.business?.email || res?.business?.phone || "us";

  return (
    <main className="px-5 py-14 sm:py-20 max-w-[560px] mx-auto flex flex-col gap-10">
      <header className="flex flex-col gap-2 text-center">
        <span className="font-serif italic text-[26px] leading-none">Lintas Waktu</span>
        <span className="t-mono text-mute">Document verification</span>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 border border-line p-6">
        <p className="t-body">Enter the number and the verification code printed at the bottom of the invoice or quotation.</p>
        <label className="flex flex-col gap-1.5"><span className="t-mono text-mute">Number</span><input className="field font-mono" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="LW-2026-0001" autoCapitalize="characters" /></label>
        <label className="flex flex-col gap-1.5"><span className="t-mono text-mute">Verification code</span><input className="field font-mono tracking-[0.12em]" value={code} onChange={(e) => setCode(e.target.value)} placeholder="K7Q2-M9XA" autoCapitalize="characters" /></label>
        <button type="submit" disabled={busy} className="ink-btn self-start">{busy ? "Checking…" : "Verify"}</button>
      </form>

      {res && (
        <section aria-live="polite" className={clsx("border p-6 flex flex-col gap-4", res.valid ? "border-[#5f7a4a]" : "border-error")}>
          {res.valid ? (
            <>
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[#5f7a4a] text-white flex items-center justify-center text-[14px]">✓</span>
                <span className="font-serif text-[24px] leading-tight">Genuine {res.kind === "quote" ? "quotation" : "invoice"}</span>
              </div>
              <p className="t-body">This document was issued by {res.business?.name} and the details below are the current, official ones.</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 t-small">
                <dt className="t-mono text-faint">Number</dt><dd className="font-mono">{res.number}</dd>
                <dt className="t-mono text-faint">For</dt><dd>{res.client_name}</dd>
                <dt className="t-mono text-faint">Total</dt><dd className="tabular-nums">{money(res.total ?? 0, res.currency ?? "IDR")}</dd>
                <dt className="t-mono text-faint">Issued</dt><dd>{fmtDate(res.issued_at)}</dd>
                <dt className="t-mono text-faint">Status</dt><dd>{res.status === "paid" ? `Paid · ${fmtDate(res.paid_at)}` : "Issued — awaiting payment"}</dd>
                {res.business?.bank_details && res.status !== "paid" && res.kind !== "quote" && (
                  <><dt className="t-mono text-faint">Official payment details</dt><dd className="whitespace-pre-line text-ink">{res.business.bank_details}</dd></>
                )}
              </dl>
              <p className="t-small text-mute">If the document you hold shows a different amount, name or bank account, it has been altered — do not pay it. Contact {contact} to confirm.</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-error text-white flex items-center justify-center text-[14px]">!</span>
                <span className="font-serif text-[24px] leading-tight">{res.reason === "void" ? "This document was cancelled" : "Not verified"}</span>
              </div>
              <p className="t-body">
                {res.reason === "void"
                  ? "This number was issued and later voided. It is no longer payable — a replacement carries a new number."
                  : res.reason === "unknown"
                    ? "We have no issued document with this number. Check the number, or ask us directly before paying anything."
                    : "The code does not match this number. Either the document was altered after we issued it, or it is an older version that has since been corrected. Ask us for the current one before paying."}
              </p>
            </>
          )}
        </section>
      )}
    </main>
  );
}
