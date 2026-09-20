"use client";

import { use, useEffect, useState } from "react";
import { api, type Invoice, type InvoiceBusiness } from "@/lib/admin-api";
import { InvoiceDoc } from "@/components/invoice/InvoiceDoc";
import { PrintButton } from "@/components/invoice/PrintButton";
import { LoadError, SkeletonForm } from "@/components/admin/ui";

/** Print view for the photographer — works for drafts too (the client link does not). */
export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ inv: Invoice; biz: InvoiceBusiness } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([api.get<Invoice>(`/api/admin/invoices/${id}`), api.get<InvoiceBusiness>("/api/admin/invoice-settings")])
      .then(([inv, biz]) => { setData({ inv, biz }); setTimeout(() => window.print(), 400); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [id]);
  if (err) return <LoadError error={err} retry={() => location.reload()} />;
  if (!data) return <SkeletonForm fields={6} />;
  return (
    <div className="print-page">
      <div className="max-w-[820px] mx-auto flex items-center justify-between pb-5 print:hidden">
        <span className="t-mono text-mute">{data.inv.number}{data.inv.status === "draft" && " · draft — for your eyes; mark as sent to share"}</span>
        <PrintButton />
      </div>
      <InvoiceDoc doc={data.inv} business={data.biz} />
    </div>
  );
}
