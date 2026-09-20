import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Called by the API (app/content/site_cache.py) right after an admin edit so
 * the site stops serving its cached projects/settings immediately, instead of
 * after the 60 s TTL in lib/content.ts. Authenticated with a shared secret.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  // Everything fetched in lib/content.ts carries this tag. expire:0 = the next
  // visitor gets fresh data rather than stale-while-revalidate.
  revalidateTag("content", { expire: 0 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
