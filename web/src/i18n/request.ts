import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { mergeCopy } from "@/lib/copy";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Text changed in the admin; cached like the rest of the content and flushed on every edit. */
async function overrides(locale: string): Promise<unknown> {
  try {
    const res = await fetch(`${API}/api/public/copy/${locale}`, { next: { revalidate: 60, tags: ["content"] } });
    return res.ok ? await res.json() : {};
  } catch {
    return {}; // API unreachable: the built-in text still renders the site
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const defaults = (await import(`../../messages/${locale}.json`)).default;
  return {
    locale,
    messages: mergeCopy(defaults, await overrides(locale)),
  };
});
