import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getProjects } from "@/lib/content";
import { localeUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects(routing.defaultLocale);
  const paths = ["", "/work", "/services", "/about", "/contact", ...projects.map((p) => `/work/${p.slug}`)];
  const now = new Date();
  return paths.map((path) => ({
    url: localeUrl(routing.defaultLocale, path),
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/work/") ? 0.6 : 0.8,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, localeUrl(l, path)])) },
  }));
}
