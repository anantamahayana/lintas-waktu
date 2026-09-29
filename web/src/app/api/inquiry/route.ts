import { NextResponse } from "next/server";

/**
 * Inquiry endpoint — placeholder until the FastAPI backend (phase 2) owns
 * inquiries. Validates the payload and, if INQUIRY_WEBHOOK_URL is set,
 * forwards it there (e.g. an n8n/Make webhook or the API later).
 * Otherwise it just logs so the form works end-to-end in development.
 */
type Inquiry = {
  name: string;
  partner?: string;
  email: string;
  based?: string;
  kind: string;
  date?: string;
  location?: string;
  budget?: string;
  message: string;
  locale?: string;
  /** honeypot — must be empty */
  website?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Inquiry;
  try {
    body = (await req.json()) as Inquiry;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  // Honeypot: bots fill every field; humans never see this one.
  if (body.website) return NextResponse.json({ ok: true });

  const errors: Record<string, string> = {};
  if (!body.name?.trim()) errors.name = "required";
  if (!body.email?.trim() || !EMAIL.test(body.email)) errors.email = "invalid";
  if (!body.kind?.trim()) errors.kind = "required";
  if (!body.message?.trim()) errors.message = "required";
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const payload = { ...body, receivedAt: new Date().toISOString() };

  // 1) the backend, when configured (stores it for /admin/inquiries)
  const api = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const hook = process.env.INQUIRY_WEBHOOK_URL;
  if (api) {
    try {
      // This call comes from the server, so the API would see one address for every visitor and its
      // per-visitor limit would become a site-wide one. Pass the visitor's address, vouched for by the
      // shared REVALIDATE_SECRET (the API ignores the header without it).
      const headers: Record<string, string> = { "content-type": "application/json" };
      const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const secret = process.env.REVALIDATE_SECRET;
      if (ip && secret) Object.assign(headers, { "x-visitor-ip": ip, "x-visitor-key": secret });
      const res = await fetch(`${api}/api/public/inquiries`, { method: "POST", headers, body: JSON.stringify(body) });
      if (res.status === 429) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
      if (!res.ok) throw new Error(`api ${res.status}`);
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[inquiry] api forward failed", e);
      // without a webhook to fall back on, say so: the form then points the visitor to WhatsApp/email
      // instead of thanking them for a message nobody will read
      if (!hook) return NextResponse.json({ ok: false, error: "forward_failed" }, { status: 502 });
    }
  }

  // 2) optional webhook
  if (hook) {
    try {
      const res = await fetch(hook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
    } catch (e) {
      console.error("[inquiry] forward failed", e);
      return NextResponse.json({ ok: false, error: "forward_failed" }, { status: 502 });
    }
  } else {
    console.log("[inquiry]", JSON.stringify(payload));
  }

  return NextResponse.json({ ok: true });
}
