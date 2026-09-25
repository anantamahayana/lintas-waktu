"use client";

/** Client-gallery API (no admin auth; per-gallery token after PIN unlock). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""; // "" = same origin, through the /api rewrites

export type Branding = { studio_name: string; tagline: string; contact: string; logo_url: string | null };
export type GalleryMeta = { client_name: string; locked: boolean; expired: boolean; preview: boolean; branding: Branding };
export type GPhoto = { file_id: string; filename: string; name: string; width: number; height: number; thumb_url: string; full_url: string };
export type GalleryData = {
  client_name: string; photo_limit: number; max_limit: number; status: "pending" | "completed"; photos: GPhoto[];
  selected_ids: string[]; notes: Record<string, string>; maybe_ids: string[]; rev: number; preview: boolean;
  expires_at: string | null; branding: Branding;
};

const tokenKey = (slug: string) => `lw_g_${slug}`;
export const galleryToken = {
  get: (slug: string) => (typeof window === "undefined" ? null : localStorage.getItem(tokenKey(slug))),
  set: (slug: string, t: string) => localStorage.setItem(tokenKey(slug), t),
  clear: (slug: string) => localStorage.removeItem(tokenKey(slug)),
};

/**
 * The client's picks, kept on this device the moment they change. `synced` turns true once the
 * server confirmed the same picks, so an unsynced copy (tab closed or offline before the autosave
 * landed) wins over the server's older draft on the next visit. `rev` ties it to one round of the
 * gallery: after the photographer resets it, an old copy is ignored.
 */
export type LocalDraft = { rev: number; ids: string[]; notes: Record<string, string>; maybe: string[]; synced: boolean };
const draftKey = (slug: string) => `lw_draft_${slug}`;
export const localDraft = {
  get(slug: string): LocalDraft | null {
    try { return JSON.parse(localStorage.getItem(draftKey(slug)) || "null"); } catch { return null; }
  },
  set(slug: string, d: LocalDraft) {
    try { localStorage.setItem(draftKey(slug), JSON.stringify(d)); } catch {}
  },
  clear(slug: string) {
    try { localStorage.removeItem(draftKey(slug)); } catch {}
  },
};

export class GalleryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function isPreview(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";
}

function headers(slug: string): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  const t = galleryToken.get(slug);
  if (t) h["x-gallery-token"] = t;
  // Photographer preview (/g/<slug>?preview=1 from the admin): send the admin token so
  // the server shows the gallery without PIN and saves nothing. Never implied just because
  // the photographer happens to be logged in to /admin in the same browser — that made
  // real test submissions fail with "preview mode" and left the client's picks unsaved.
  if (isPreview()) {
    const admin = localStorage.getItem("lw_admin_token");
    if (admin) h.authorization = `Bearer ${admin}`;
  }
  return h;
}

async function req<T>(slug: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/gallery/${slug}${path}`, { ...init, headers: headers(slug) });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = typeof j.detail === "string" ? j.detail : msg; } catch {}
    throw new GalleryError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const gapi = {
  meta: (slug: string) => req<GalleryMeta>(slug, "/meta"),
  unlock: (slug: string, pin: string) => req<{ token: string }>(slug, "/unlock", { method: "POST", body: JSON.stringify({ pin }) }),
  load: (slug: string) => req<GalleryData>(slug, ""),
  draft: (slug: string, body: { file_ids: string[]; notes: Record<string, string>; maybe_ids: string[] }, keepalive = false) =>
    // keepalive: the request outlives the page (tab closed, app switched away mid-debounce)
    req<void>(slug, "/draft", { method: "PUT", body: JSON.stringify(body), keepalive }),
  submit: (slug: string, body: { file_ids: string[]; notes: Record<string, string>; extra_ids: string[] }) =>
    req<{ selected_count: number; extra_count: number; message: string }>(slug, "/submit", { method: "POST", body: JSON.stringify(body) }),
  img: (path: string) => `${API_URL}${path}`,
};
