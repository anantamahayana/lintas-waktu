"use client";

/** Album proof API (client side, PIN token per proof). See api/app/content/proofs.py. */
import { API_URL } from "./gallery-api";

export type ProofMeta = { client_name: string; lang: "en" | "id"; locked: boolean; expired: boolean; status: "open" | "approved" };
export type PSpread = { index: number; label: string; w: number; h: number; url: string };
export type PNote = { id: number; version: number; spread: number; x: number | null; y: number | null; author: string; text: string; created_at: string; done: boolean };
export type ProofData = {
  client_name: string; lang: "en" | "id"; version: number; status: "open" | "approved"; approved_at: string | null; approved_by: string | null;
  allow_notes: boolean; expires_at: string | null; spreads: PSpread[]; notes: PNote[]; preview: boolean;
};

const safe = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k: string) => { try { localStorage.removeItem(k); } catch {} },
};
export const store = safe;
export const proofToken = {
  get: (slug: string) => safe.get(`lw_p_${slug}`),
  set: (slug: string, t: string) => safe.set(`lw_p_${slug}`, t),
  clear: (slug: string) => safe.del(`lw_p_${slug}`),
};
/** Keys of the notes written on this device, so they can be removed again. */
export const myNotes = {
  all: (slug: string): Record<string, string> => { try { return JSON.parse(safe.get(`lw_pn_${slug}`) || "{}"); } catch { return {}; } },
  add: (slug: string, id: number, key: string) => safe.set(`lw_pn_${slug}`, JSON.stringify({ ...myNotes.all(slug), [id]: key })),
};

export class ProofError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const preview = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

async function req<T>(slug: string, path: string, init: RequestInit = {}): Promise<T> {
  const h: Record<string, string> = { "content-type": "application/json" };
  const t = proofToken.get(slug);
  if (t) h["x-proof-token"] = t;
  if (preview()) { const a = safe.get("lw_admin_token"); if (a) h.authorization = `Bearer ${a}`; }
  const res = await fetch(`${API_URL}/api/proof/${encodeURIComponent(slug)}${path}`, { ...init, headers: h });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); if (typeof j.detail === "string") msg = j.detail; } catch {}
    throw new ProofError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const papi = {
  meta: (slug: string) => req<ProofMeta>(slug, "/meta"),
  unlock: (slug: string, pin: string) => req<{ token: string }>(slug, "/unlock", { method: "POST", body: JSON.stringify({ pin }) }),
  load: (slug: string) => req<ProofData>(slug, ""),
  addNote: (slug: string, body: { spread: number; x: number | null; y: number | null; author: string; text: string }) =>
    req<PNote & { key: string }>(slug, "/notes", { method: "POST", body: JSON.stringify(body) }),
  delNote: (slug: string, id: number, key: string) => req<void>(slug, `/notes/${id}?key=${encodeURIComponent(key)}`, { method: "DELETE" }),
  approve: (slug: string, name: string) => req<ProofData>(slug, "/approve", { method: "POST", body: JSON.stringify({ name }) }),
  img: (path: string) => `${API_URL}${path}`,
};
