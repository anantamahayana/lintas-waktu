export type ClientSummary = { id: string; name: string; wa: string; email: string; counts: Record<string, number>; last_at: string; balance: number };
const LABEL: Record<string, [string, string]> = { session: ["gallery", "galleries"], proof: ["proof", "proofs"], invoice: ["invoice", "invoices"], booking: ["booking", "bookings"], inquiry: ["inquiry", "inquiries"] };
export const countsText = (c: Record<string, number>) => Object.entries(c).map(([k, n]) => `${n} ${LABEL[k]?.[n === 1 ? 0 : 1] ?? k}`).join(" · ");
