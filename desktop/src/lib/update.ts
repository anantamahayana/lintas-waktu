import { useSyncExternalStore } from "react";
import { isNative } from "./platform";

/**
 * Updates from GitHub Releases (Tauri updater; Figma page 07 "Pembaruan otomatis").
 * Checked once a few seconds after the app opens, never on a timer. Downloads in the background;
 * installing restarts the app after the open project is saved.
 */
export type Phase = "idle" | "checking" | "none" | "available" | "downloading" | "ready" | "error" | "off";
export type UpdateState = {
  phase: Phase;
  current: string;
  version?: string;
  notes?: string;
  got?: number;
  total?: number;
  error?: string;
  checkedAt?: number;
  /** Install when the window is closed instead of now. */
  onClose?: boolean;
};

const PREF = "lwalbum:autoUpdate";
export const autoCheckOn = () => { try { return localStorage.getItem(PREF) !== "off"; } catch { return true; } };
export const setAutoCheck = (on: boolean) => { try { localStorage.setItem(PREF, on ? "on" : "off"); } catch { /* ignore */ } };

let state: UpdateState = { phase: "idle", current: "" };
const subs = new Set<() => void>();
const set = (patch: Partial<UpdateState>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
export const useUpdate = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
export const getUpdate = () => state;

type Pending = { version: string; body?: string; download: (cb: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void) => Promise<void>; install: () => Promise<void> };
let pending: Pending | null = null;

/** Current version, and whether this build can update itself (signed builds only). */
async function ready(): Promise<boolean> {
  if (!isNative) return false;
  const [{ getVersion }, { invoke }] = await Promise.all([import("@tauri-apps/api/app"), import("@tauri-apps/api/core")]);
  if (!state.current) set({ current: await getVersion().catch(() => "") });
  return invoke<boolean>("updater_ready").catch(() => false);
}

/** Look for a newer version. `manual`: the user asked, so "none" and errors are shown. */
export async function checkForUpdate(manual = false): Promise<void> {
  if (["checking", "downloading", "ready"].includes(state.phase)) return;
  if (!(await ready())) { set({ phase: "off" }); return; }
  set({ phase: "checking", error: undefined });
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const u = await check();
    if (!u) { pending = null; set({ phase: manual ? "none" : "idle", checkedAt: Date.now() }); return; }
    pending = u as unknown as Pending;
    set({ phase: "available", version: u.version, notes: u.body ?? "", checkedAt: Date.now() });
  } catch (e) {
    // Offline or GitHub unreachable: stay quiet unless the user asked.
    set({ phase: manual ? "error" : "idle", error: String(e) });
  }
}

export async function downloadUpdate(): Promise<void> {
  if (!pending || state.phase === "downloading") return;
  set({ phase: "downloading", got: 0, total: 0 });
  try {
    let got = 0;
    await pending.download((e) => {
      if (e.event === "Started") set({ total: e.data?.contentLength ?? 0 });
      else if (e.event === "Progress") { got += e.data?.chunkLength ?? 0; set({ got }); }
    });
    set({ phase: "ready" });
  } catch (e) {
    set({ phase: "error", error: String(e) });
  }
}

/** Save, install and start again. On Windows the installer closes the app and opens the new version. */
export async function installNow(save: () => Promise<unknown> | void): Promise<void> {
  if (!pending || state.phase !== "ready") return;
  await Promise.resolve(save()).catch(() => {});
  await pending.install();
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

export const installOnClose = (on: boolean) => set({ onClose: on });

/** Run once from the app root: the quiet check after start, and "install when closed". */
let started = false;
export function startUpdates(save: () => Promise<unknown> | void) {
  if (started || !isNative) return;
  started = true;
  if (autoCheckOn()) setTimeout(() => void checkForUpdate(false), 5000);
  void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
    void getCurrentWindow().onCloseRequested(async (ev) => {
      if (!state.onClose || state.phase !== "ready" || !pending) return;
      ev.preventDefault();
      await installNow(save).catch(() => {});
    });
  });
}

export const mb = (n?: number) => (n ? `${(n / 1048576).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB` : "");
