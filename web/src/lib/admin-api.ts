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

/**
 * Error from the API, already made readable: `message` is one sentence for a
 * toast, `fields` maps a form field to its own message (from FastAPI's 422
 * validation detail) so forms can show it under the right input.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

// The backend speaks Indonesian in a few places (it is shared with the proofing
// platform); the admin is English, so translate the messages we know.
const EN: Record<string, string> = {
  "Batas maksimal harus ≥ batas paket": "Max with extras must be at least the package size",
  "PIN harus 4 digit angka.": "The PIN must be exactly 4 digits",
  "Folder tidak berisi foto JPEG/PNG.": "The folder has no JPEG/PNG photos",
  "Klien belum mengirim pilihan.": "The client has not sent a selection yet",
  "Logo harus PNG, JPG, SVG, atau WebP.": "The logo must be a PNG, JPG, SVG or WebP",
  "Logo maksimal 2 MB.": "The logo must be under 2 MB",
  "Sesi tidak ditemukan": "Session not found",
  "Password lama salah.": "That isn’t the current password",
  "Slug already in use": "Another project already uses this slug — change it to publish at a different address",
  "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.": "Too many login attempts — try again in 15 minutes",
  "Google Drive API belum di-enable di project Google Cloud Anda.": "The Google Drive API is not enabled for this Google Cloud project",
};
const humanize = (m: string) => EN[m] ?? m.replace(/^Google Drive menolak permintaan: /, "Google Drive refused the request: ").replace(/^Value error, /, "");

const FIELD_LABEL: Record<string, string> = {
  client_name: "Client name", drive_folder_id: "Google Drive folder", photo_limit: "Photos in package", max_limit: "Max with extras",
  pin: "PIN", expires_at: "Expires on", slug: "Slug", title: "Title", month: "Month", date_label: "Date label",
};

/** Turn a FastAPI error body into (message, fields). */
export function parseApiError(status: number, body: unknown, fallback: string): ApiError {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return new ApiError(status, humanize(detail));
  if (Array.isArray(detail)) {
    const fields: Record<string, string> = {};
    for (const e of detail as { loc?: unknown[]; msg?: string }[]) {
      const key = String((e.loc ?? []).filter((x) => x !== "body").join(".") || "form");
      if (!fields[key]) fields[key] = humanize(String(e.msg ?? "Invalid value"));
    }
    const names = Object.keys(fields).map((k) => FIELD_LABEL[k] ?? k);
    const msg = names.length === 1 ? `${names[0]}: ${fields[Object.keys(fields)[0]]}` : `Please check: ${names.join(", ")}`;
    return new ApiError(status, msg, fields);
  }
  return new ApiError(status, fallback);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const t = token.get();
  if (t) headers.authorization = `Bearer ${t}`;
  if (init.body && !(init.body instanceof FormData)) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can’t reach the server. Check your connection (and that the API is running).");
  }
  if (res.status === 401 && typeof window !== "undefined" && !path.endsWith("/login")) {
    token.clear();
    window.location.href = "/admin/login";
  }
  if (!res.ok) {
    const fallback = res.status >= 500 ? "The server hit a problem. Try again in a moment." : res.statusText || "Request failed";
    let body: unknown = null;
    try { body = await res.json(); } catch {}
    throw parseApiError(res.status, body, fallback);
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
  status: SessionStatus; notes: string | null; has_pin: boolean; pin: string | null; client_wa: string | null; is_new: boolean; expires_at: string | null; created_at: string;
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
  id: string; slug: string; title: string; category: Category; kind: "photo" | "film" | "both"; location: string; date_label: string; month: string | null;
  drive_folder_id: string; cover_file_id: string | null; placeholder_urls: string[]; pull_en: string; pull_id: string; body_en: string; body_id: string;
  facts: Fact[]; film_title: string | null; film_duration: string | null; film_url: string | null; film_poster_url?: string | null; featured: boolean;
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

/**
 * Fill the WhatsApp template from Site settings. Placeholders: {name} {link} {pin}
 * {package} {extras} {deadline} {studio}. Lines that end up empty (e.g. a PIN line
 * when there is no PIN) are dropped so the message never shows a blank value.
 */
export function fillWaTemplate(template: string, v: { name: string; link: string; pin?: string | null; package: number; extras?: number | null; deadline?: string | null; studio: string }) {
  const map: Record<string, string> = {
    name: v.name, link: v.link, pin: v.pin ?? "", package: String(v.package),
    extras: v.extras && v.extras > v.package ? String(v.extras) : "", deadline: v.deadline ?? "", studio: v.studio,
  };
  const optional = ["pin", "extras", "deadline"];
  return template
    .split("\n")
    // drop a line whose optional placeholder has no value (no PIN → no "PIN:" line)
    .filter((line) => !optional.some((k) => line.includes(`{${k}}`) && !map[k]))
    .map((line) => line.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? `{${k}}`))
    .join("\n");
}

// ---------------------------------------------------------------- invoices
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type InvoiceItem = { description: string; qty: number; unit_price: number };
export type InvoiceTotals = { subtotal: number; discount: number; taxable: number; tax: number; total: number; deposit_paid: number; balance: number };
export type Invoice = {
  id: string; number: string; token: string; status: InvoiceStatus; kind: "invoice" | "quote"; client_name: string; client_email: string | null;
  client_phone: string | null; client_address: string | null; event_label: string | null; issued_at: string; due_at: string | null; currency: "IDR" | "USD";
  items: InvoiceItem[]; discount: number; tax_percent: number; deposit_paid: number; notes: string | null; session_id: string | null; session_client: string | null;
  paid_at: string | null; sent_at: string | null; created_at: string; updated_at: string; totals: InvoiceTotals; public_url: string;
  verify_code: string; verify_url: string; sent_hash: string | null; current_hash: string;
};
export type InvoiceBusiness = {
  name: string; tagline: string; address: string; email: string; phone: string; bank_details: string; prefix: string;
  default_terms: string; default_due_days: number; tax_percent: number;
};
