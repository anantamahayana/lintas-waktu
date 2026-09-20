"use client";

/**
 * Thin client for the FastAPI backend used by /admin. The admin JWT lives in
 * localStorage (same approach as the original platform); every request
 * carries it as a Bearer token. 401 → back to /admin/login.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const KEY = "lw_admin_token";

export const token = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(KEY)),
  set: (t: string) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const t = token.get();
  if (t) headers.authorization = `Bearer ${t}`;
  if (init.body && !(init.body instanceof FormData)) headers["content-type"] = "application/json";
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && typeof window !== "undefined" && !path.endsWith("/login")) {
    token.clear();
    window.location.href = "/admin/login";
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j);
    } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => request<T>(p, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(p: string, body: unknown) => request<T>(p, { method: "PATCH", body: JSON.stringify(body) }),
  del: (p: string) => request<void>(p, { method: "DELETE" }),
  upload: <T>(p: string, form: FormData) => request<T>(p, { method: "POST", body: form }),
  /** Authenticated file download (exports) */
  async download(path: string, filename: string) {
    const res = await fetch(`${API_URL}${path}`, { headers: { authorization: `Bearer ${token.get()}` } });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  },
  /** Absolute URL for an API-relative image path (adds gallery token when given) */
  img: (path: string, t?: string | null) =>
    /^https?:\/\//.test(path) ? path : `${API_URL}${path}${t ? (path.includes("?") ? "&" : "?") + "t=" + t : ""}`,
};

// ---------------------------------------------------------------- types (mirror api/app/schemas)
export type SessionStatus = "pending" | "completed";
export type SessionOut = {
  id: string; slug: string; client_name: string; drive_folder_id: string; photo_limit: number; max_limit: number | null;
  status: SessionStatus; notes: string | null; has_pin: boolean; expires_at: string | null; created_at: string;
  submitted_at: string | null; first_opened_at: string | null; last_seen_at: string | null; draft_count: number;
  preview_urls: string[]; selected_count: number; extra_count: number; gallery_url: string;
};
export type SessionDetail = SessionOut & {
  selected_photos: { id: number; drive_file_id: string; filename: string; note: string | null; is_extra: boolean }[];
  draft_photos: { drive_file_id: string; filename: string; note: string | null }[];
  gallery_token: string | null;
};
export type CacheStatus = { total: number; thumb: number; full: number; warming: boolean; ready: boolean };

export type Category = "wedding" | "prewedding" | "event" | "personal";
export type Fact = { label: string; value: string };
export type ProjectPhoto = { file_id: string; filename: string; width: number; height: number; thumb_url: string; full_url: string };
export type Project = {
  id: string; slug: string; title: string; category: Category; location: string; date_label: string; month: string | null;
  drive_folder_id: string; cover_file_id: string | null; placeholder_urls: string[]; pull_en: string; pull_id: string; body_en: string; body_id: string;
  facts: Fact[]; film_title: string | null; film_duration: string | null; film_url: string | null; featured: boolean;
  published: boolean; sort_order: number; cover_url: string | null; photo_count: number; created_at: string; updated_at: string;
  photos?: ProjectPhoto[];
};
export type InquiryStatus = "new" | "replied" | "booked" | "closed";
export type Inquiry = {
  id: string; name: string; partner: string | null; email: string; based: string | null; kind: string; date: string | null;
  location: string | null; budget: string | null; message: string; locale: string; status: InquiryStatus;
  internal_note: string | null; created_at: string; updated_at: string;
};
export type SiteSettings = {
  studio_name: string; descriptor_en: string; descriptor_id: string; whatsapp_number: string; whatsapp_display: string;
  email: string; instagram: string; service_area: string; usd_rate: number; default_package_size: number;
  default_validity_days: number; whatsapp_template: string;
};
