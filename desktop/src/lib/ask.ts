/**
 * In-app replacements for window.confirm / window.alert. Those are silently blocked inside
 * sandboxed frames (such as a hosted preview), where confirm() just returns false, so a button
 * guarded by it looks like it does nothing.
 * Destructive questions (`danger`) start with focus on Cancel; Ctrl+Enter confirms.
 */
type Opts = { ok?: string; cancel?: string | null; title?: string; danger?: boolean };

function show(message: string, { ok = "Lanjutkan", cancel = "Batal", title, danger }: Opts): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "dlg dlg-sm";
    if (title) {
      const h = document.createElement("header"); h.className = "dlg-h";
      const t = document.createElement("h1"); t.textContent = title; h.append(t); d.append(h);
    }
    const b = document.createElement("div"); b.className = "dlg-b";
    for (const para of message.split("\n\n")) { const p = document.createElement("p"); p.textContent = para; b.append(p); }
    const f = document.createElement("footer"); f.className = "dlg-f";
    const grow = document.createElement("span"); grow.className = "grow"; f.append(grow);
    const button = (label: string, value: boolean, kind: string) => {
      const el = document.createElement("button");
      el.type = "button"; el.className = `b ${kind}`; el.textContent = label;
      el.onclick = () => { d.returnValue = value ? "ok" : ""; d.close(); };
      f.append(el);
      return el;
    };
    const no = cancel ? button(cancel, false, "secondary") : null;
    const yes = button(ok, true, danger ? "danger" : "primary");
    d.append(b, f);
    d.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { d.returnValue = "ok"; d.close(); } });
    d.onclose = () => { resolve(d.returnValue === "ok"); d.remove(); };
    document.body.append(d);
    d.showModal();
    (danger && no ? no : yes).focus();
  });
}

export const ask = (message: string, ok = "Lanjutkan", cancel = "Batal", opts: Omit<Opts, "ok" | "cancel"> = {}) => show(message, { ok, cancel, ...opts });
/**
 * A note that does not stop the work: a toast at the bottom that fades after a few seconds
 * (longer for longer text), or at once with ✕. Read aloud by screen readers.
 */
export function tell(message: string, title?: string): Promise<void> {
  return new Promise((resolve) => {
    let box = document.getElementById("toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.append(box); }
    const t = document.createElement("div"); t.className = "toast";
    const body = document.createElement("div");
    if (title) { const h = document.createElement("strong"); h.textContent = title; body.append(h); }
    for (const para of message.split("\n\n")) { const p = document.createElement("p"); p.textContent = para; body.append(p); }
    const x = document.createElement("button"); x.type = "button"; x.className = "toast-x"; x.textContent = "✕"; x.setAttribute("aria-label", "Tutup");
    let timer = 0;
    const close = () => { clearTimeout(timer); t.remove(); resolve(); };
    (t as HTMLElement & { close?: () => void }).close = close;
    const arm = () => { clearTimeout(timer); timer = window.setTimeout(close, Math.min(14000, 4000 + message.length * 50)); };
    x.onclick = close;
    t.onmouseenter = () => clearTimeout(timer); // reading it: keep it
    t.onmouseleave = arm;
    t.append(body, x); box.append(t);
    while (box.children.length > 3) { const old = box.firstElementChild as (Element & { close?: () => void }) | null; if (!old) break; if (old.close) old.close(); else old.remove(); }
    arm();
  });
}

/** An error in words a person can act on, instead of the raw system text. */
export function friendly(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();
  if (/os error (2|3)\b|cannot find the (file|path)|no such file/.test(m)) return "File atau folder tidak ditemukan. Mungkin dipindah, diganti nama, atau drive-nya tidak tersambung.";
  if (/os error 5\b|access is denied|permission denied/.test(m)) return "Tidak punya izin menulis di sana. Tutup program lain yang memakai file itu, atau pilih folder lain.";
  if (/os error (112|39)\b|no space|disk full/.test(m)) return "Disk penuh. Kosongkan ruang lalu coba lagi.";
  if (/os error 32\b|being used by another process/.test(m)) return "File sedang dipakai program lain. Tutup program itu lalu coba lagi.";
  if (/failed to fetch|networkerror|network error|timed out|dns/.test(m)) return "Tidak tersambung ke internet. Periksa koneksi lalu coba lagi.";
  return raw;
}
