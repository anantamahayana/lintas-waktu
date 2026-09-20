"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type InvoiceBusiness } from "@/lib/admin-api";
import { LoadError, PageHeader, SkeletonForm } from "@/components/admin/ui";
import { InvoiceForm } from "@/components/admin/InvoiceForm";

export default function NewInvoicePage() {
  const [biz, setBiz] = useState<InvoiceBusiness | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => { api.get<InvoiceBusiness>("/api/admin/invoice-settings").then((b) => { setBiz(b); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed")); };
  useEffect(() => { load(); }, []);
  return (
    <>
      <PageHeader eyebrow={<><Link href="/admin/invoices" className="link">Invoices</Link> · new</> as unknown as string} title="New invoice" />
      {err ? <LoadError error={err} retry={() => { setErr(null); load(); }} /> : biz ? <InvoiceForm business={biz} /> : <SkeletonForm fields={8} />}
    </>
  );
}
