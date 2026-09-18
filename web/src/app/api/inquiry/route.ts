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

  const hook = process.env.INQUIRY_WEBHOOK_URL;
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
