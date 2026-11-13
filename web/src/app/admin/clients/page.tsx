"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/admin-api";
import { Empty, Input, LoadError, PageHeader, SkeletonRows, fmtDate } from "@/components/admin/ui";
import { money } from "@/components/invoice/InvoiceDoc";
import { countsText, type ClientSummary } from "@/lib/clients";

/** Everyone the studio has worked with, built from galleries, proofs, invoices, bookings and inquiries. */
export default function ClientsPage() {
  const [rows, setRows] = useState<ClientSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { api.get<ClientSummary[]>("/api/admin/clients").then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Failed")); }, []);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((c) => !t || c.name.toLowerCase().includes(t) || c.wa.includes(t.replace(/\D/g, "") || "§") || c.email.includes(t));
  }, [rows, q]);
  return (
    <>
      <PageHeader eyebrow="Bisnis" title="Klien" actions={<Input placeholder="Cari nama, nomor, email…" value={q} onChange={(e) => setQ(e.target.value)} className="!w-[260px]" />} />
      <p className="t-small text-mute mb-6 max-w-[640px]">Dikelompokkan otomatis: data dengan nomor WhatsApp, email, atau nama yang sama dianggap satu klien. Isi nomor klien di invoice dan galeri supaya tetap terkumpul.</p>
      {err ? <LoadError error={err} retry={() => location.reload()} />
        : rows === null ? <SkeletonRows n={8} />
        : shown.length === 0 ? <Empty title={rows.length ? "Tidak ada yang cocok." : "Belum ada klien."} body={rows.length ? "Coba kata kunci lain." : "Klien muncul di sini begitu kamu membuat galeri, invoice, atau booking."} />
        : (
          <table className="w-full border-t border-line">
            <thead><tr className="t-mono text-faint text-left"><th className="py-3 pr-4 font-normal">Klien</th><th className="py-3 pr-4 font-normal hidden md:table-cell">Pekerjaan</th><th className="py-3 pr-4 font-normal text-right">Sisa tagihan</th><th className="py-3 font-normal text-right hidden sm:table-cell">Terakhir</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-[#f6f5f1]">
                  <td className="py-3.5 pr-4"><Link href={`/admin/clients/${c.id}`} className="font-medium hover:underline">{c.name}</Link>{c.wa && <span className="block t-small text-mute font-mono">+{c.wa}</span>}</td>
                  <td className="py-3.5 pr-4 t-small text-mute hidden md:table-cell">{countsText(c.counts)}</td>
                  <td className={`py-3.5 pr-4 text-right tabular-nums t-small ${c.balance > 0 ? "font-medium" : "text-faint"}`}>{c.balance > 0 ? money(c.balance, "IDR") : "—"}</td>
                  <td className="py-3.5 text-right t-small text-mute hidden sm:table-cell">{fmtDate(c.last_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </>
  );
}
