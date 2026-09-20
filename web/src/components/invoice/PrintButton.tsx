"use client";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return <button type="button" onClick={() => window.print()} className="action !py-2.5 !px-4">{label}</button>;
}
