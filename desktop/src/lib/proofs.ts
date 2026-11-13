/**
 * Online proofs (Figma page 07 "Kirim proof ke klien", page 05 tab Revisi). The app signs in to the
 * Lintas Waktu API with the admin password (the token, never the password, is kept for ~8 hours),
 * uploads one JPEG per spread and publishes them; the client opens /p/<code> on the site.
 */
const DEFAULT_API = "https://api.lintaswaktuvisual.com";
const API_KEY = "lwalbum:api", TOKEN_KEY = "lwalbum:apiToken";
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } };

export const apiBase = () => (get(API_KEY) || DEFAULT_API).replace(/\/$/, "");

/** Seconds until the stored token expires (0 = none or expired). */
function tokenLeft(t: string | null): number {
  if (!t) return 0;
  try { const exp = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp as number; return Math.max(0, exp - Date.now() / 1000); } catch { return 0; }
}
export const signedIn = () => tokenLeft(get(TOKEN_KEY)) > 120;
export const signOut = () => set(TOKEN_KEY, null);

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (!headers["content-type"] && typeof init.body === "string") headers["content-type"] = "application/json";
  if (auth) { const t = get(TOKEN_KEY); if (t) headers.authorization = `Bearer ${t}`; }
  let res: Response;
  try { res = await fetch(`${apiBase()}${path}`, { ...init, headers }); }
  catch { throw new ApiError(0, "Tidak bisa menghubungi server Lintas Waktu. Periksa internet."); }
  if (res.status === 401 && auth) signOut();
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); if (typeof j.detail === "string") msg = j.detail; } catch { /* keep status text */ }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function signIn(password: string): Promise<void> {
  const r = await call<{ access_token: string }>("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) }, false);
  set(TOKEN_KEY, r.access_token);
}

export type ProofNote = { id: number; version: number; spread: number; x: number | null; y: number | null; author: string; text: string; created_at: string; done: boolean };
export type ProofInfo = {
  id: string; slug: string; pin: string; url: string; client_name: string; lang: "en" | "id"; version: number; spread_count: number;
  status: "open" | "approved"; approved_at: string | null; approved_by: string | null; expires_at: string | null; allow_notes: boolean;
  open_count: number; first_opened_at: string | null; last_seen_at: string | null; notes: ProofNote[];
};

export const proofs = {
  find: async (projectKey: string) => (await call<ProofInfo[]>(`/api/admin/proofs?project_key=${encodeURIComponent(projectKey)}`))[0] ?? null,
  create: (body: { project_key: string; client_name: string; lang: "en" | "id"; expires_days: number; allow_notes: boolean }) =>
    call<ProofInfo>("/api/admin/proofs", { method: "POST", body: JSON.stringify(body) }),
  upload: (id: string, index: number, blob: Blob) => call<void>(`/api/admin/proofs/${id}/draft/${index}`, { method: "PUT", body: blob, headers: { "content-type": "image/jpeg" } }),
  publish: (id: string, spreads: { label: string; w: number; h: number }[]) => call<ProofInfo>(`/api/admin/proofs/${id}/publish`, { method: "POST", body: JSON.stringify({ spreads }) }),
  get: (id: string) => call<ProofInfo>(`/api/admin/proofs/${id}`),
  mark: (id: string, noteId: number, done: boolean) => call<ProofNote>(`/api/admin/proofs/${id}/notes/${noteId}`, { method: "PATCH", body: JSON.stringify({ done }) }),
};

/** The WhatsApp message in the client's language. */
export function waMessage(p: Pick<ProofInfo, "client_name" | "lang" | "url" | "pin" | "expires_at">): string {
  const until = p.expires_at ? new Date(p.expires_at).toLocaleDateString(p.lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short" }) : "";
  return p.lang === "id"
    ? `Halo ${p.client_name}! Proof album kalian sudah siap 🤍\nBuka: ${p.url} (PIN ${p.pin})\nKetuk foto untuk menulis catatan, lalu tekan "Setujui album" kalau sudah pas.${until ? ` Link terbuka sampai ${until}.` : ""}`
    : `Hi ${p.client_name}! Your album proof is ready 🤍\nOpen: ${p.url} (PIN ${p.pin})\nTap any photo to leave a note, then press "Approve album" when you're happy.${until ? ` The link is open until ${until}.` : ""}`;
}

/** Open a web link in the default browser (the app's own window never navigates away). */
export async function openExternal(url: string) {
  if ("__TAURI_INTERNALS__" in window) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else window.open(url, "_blank", "noopener");
}

export async function copyText(s: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(s); return true; } catch { return false; }
}
