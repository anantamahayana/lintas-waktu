/**
 * Server-side content access for the public site.
 *
 * Every project shown on the site is a row in the API (managed in /admin).
 * Site settings also come from the API, with lib/site.ts as the fallback so
 * the chrome still renders while the backend is unreachable.
 */
import "server-only";
import { type Category, type Project } from "./projects";
import { site as defaults } from "./site";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REVALIDATE = 60; // seconds

type ApiFact = { label: string; value: string };
type ApiPhoto = { file_id: string; filename: string; width: number; height: number; thumb_url: string; full_url: string };
type ApiProject = {
  slug: string; title: string; category: Category; location: string; date_label: string; month: string | null;
  cover_url: string | null; pull: string; body: string; facts: ApiFact[]; film: { title?: string | null; duration?: string | null; url?: string | null } | null;
  featured: boolean; photos: ApiPhoto[];
};
type ApiSettings = {
  studio_name: string; descriptor_en: string; descriptor_id: string; whatsapp_number: string; whatsapp_display: string;
  email: string; instagram: string; service_area: string; usd_rate: number;
};

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** API-relative image paths become absolute; external (placeholder) URLs pass through. */
const abs = (p: string | null | undefined) => (p ? (/^https?:\/\//.test(p) ? p : `${API}${p}`) : undefined);

/** Project shape used by the pages: placeholder-compatible, plus real image URLs when present. */
export type SiteProject = Project & { coverSrc?: string; gallerySrcs?: string[] };

function fromApi(p: ApiProject): SiteProject {
  return {
    slug: p.slug,
    title: p.title,
    category: p.category,
    location: p.location,
    date: p.date_label,
    cover: p.cover_url ?? `api-${p.slug}`,
    coverSrc: abs(p.cover_url),
    gallery: p.photos.map((ph) => ph.file_id),
    gallerySrcs: p.photos.map((ph) => abs(ph.full_url)!),
    facts: p.facts,
    pull: p.pull,
    body: p.body,
    film: p.film?.title || p.film?.url ? { title: p.film.title ?? "Film", duration: p.film.duration ?? "" } : undefined,
    featured: p.featured,
  };
}

export async function getProjects(locale: string): Promise<SiteProject[]> {
  const rows = await get<ApiProject[]>(`/api/public/projects?locale=${locale}`);
  return (rows ?? []).map(fromApi);
}

export async function getProject(slug: string, locale: string): Promise<SiteProject | undefined> {
  const row = await get<ApiProject>(`/api/public/projects/${slug}?locale=${locale}`);
  return row ? fromApi(row) : undefined;
}

/** Three related projects: same category first, then the rest, after the current one. */
export function related(all: SiteProject[], slug: string, n = 3) {
  const i = all.findIndex((p) => p.slug === slug);
  const cur = all[i];
  const rest = [...all.slice(i + 1), ...all.slice(0, i)];
  return [...rest.filter((p) => p.category === cur?.category), ...rest.filter((p) => p.category !== cur?.category)].slice(0, n);
}

export type SiteInfo = {
  name: string;
  whatsapp: { number: string; display: string };
  email: string;
  instagram: string;
  usdRate: number;
};

export async function getSite(): Promise<SiteInfo> {
  const s = await get<ApiSettings>("/api/public/settings");
  return {
    name: s?.studio_name || defaults.name,
    whatsapp: {
      number: s?.whatsapp_number || defaults.whatsapp.number,
      display: s?.whatsapp_display || defaults.whatsapp.display,
    },
    email: s?.email || defaults.email,
    instagram: s?.instagram || defaults.instagram,
    usdRate: s?.usd_rate || 16000,
  };
}

export const apiBase = API;
