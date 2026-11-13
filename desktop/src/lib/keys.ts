import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

/**
 * One keyboard system for the whole app (design: Figma page 09 "Aturan keyboard & fokus").
 * - Every command is listed once in CATALOG with its label and default keys; screens only supply what it does.
 * - One keydown listener on window. Global commands are checked first, then the active module's.
 * - Single-key shortcuts never fire while the user is typing in a field.
 * - After a pointer click on a button, checkbox, slider or tab, focus leaves it so the next key press goes to the work area.
 * - Keys can be changed by the user; changes are kept on this computer.
 */

export type Scope = "global" | "home" | "kurasi" | "editor" | "sampul" | "ekspor";
type Entry = { label: string; keys: string[]; scope: Scope; group: string; repeat?: boolean };

const E = (label: string, keys: string[], scope: Scope, group: string, repeat = false): Entry => ({ label, keys, scope, group, repeat });

export const CATALOG = {
  "app.new": E("Proyek baru…", ["Ctrl+N"], "global", "File"),
  "app.open": E("Buka proyek…", ["Ctrl+O"], "global", "File"),
  "app.save": E("Simpan", ["Ctrl+S"], "global", "File"),
  "app.close": E("Tutup proyek", ["Ctrl+W"], "global", "File"),
  "app.home": E("Beranda", ["Ctrl+Shift+H"], "global", "File"),
  "app.export": E("Ekspor…", ["Ctrl+E"], "global", "File"),
  "app.undo": E("Urungkan", ["Ctrl+Z"], "global", "Edit", true),
  "app.redo": E("Ulangi", ["Ctrl+Y", "Ctrl+Shift+Z"], "global", "Edit", true),
  "app.keys": E("Pintasan keyboard", ["Ctrl+/"], "global", "Bantuan"),
  "app.prefs": E("Ubah pintasan…", ["Ctrl+,"], "global", "Edit"),
  "app.update": E("Periksa pembaruan…", [], "global", "Bantuan"),
  "app.about": E("Tentang LW Album", [], "global", "Bantuan"),
  "app.props": E("Properti album…", ["Ctrl+Shift+P"], "global", "Album"),
  "app.auto": E("Susun otomatis dari foto terpilih…", ["Ctrl+Shift+A"], "global", "Album"),
  "app.templates": E("Template tata letak…", [], "global", "Album"),
  "app.proof": E("Kirim proof ke klien…", ["Ctrl+Shift+K"], "global", "Album"),
  "app.panels": E("Sembunyikan / tampilkan panel", ["Tab"], "global", "Tampilan"),
  "app.full": E("Layar penuh", ["F11"], "global", "Tampilan"),
  "mod.kurasi": E("Kurasi", ["Ctrl+Alt+1"], "global", "Tampilan"),
  "mod.editor": E("Tata letak", ["Ctrl+Alt+2"], "global", "Tampilan"),
  "mod.sampul": E("Sampul", ["Ctrl+Alt+3"], "global", "Tampilan"),
  "mod.ekspor": E("Ekspor", ["Ctrl+Alt+4"], "global", "Tampilan"),

  "k.prev": E("Foto sebelumnya", ["Left"], "kurasi", "Kurasi", true),
  "k.next": E("Foto berikutnya", ["Right"], "kurasi", "Kurasi", true),
  "k.up": E("Baris atas (kisi)", ["Up"], "kurasi", "Kurasi", true),
  "k.down": E("Baris bawah (kisi)", ["Down"], "kurasi", "Kurasi", true),
  "k.grid": E("Tampilan kisi", ["G"], "kurasi", "Kurasi"),
  "k.one": E("Tampilan satu foto", ["E"], "kurasi", "Kurasi"),
  "k.compare": E("Bandingkan", ["C"], "kurasi", "Kurasi"),
  "k.zoom": E("Zoom 100%", ["Z", "Space"], "kurasi", "Kurasi"),
  "k.pick": E("Pilih", ["P"], "kurasi", "Kurasi"),
  "k.reject": E("Tolak", ["X"], "kurasi", "Kurasi"),
  "k.unflag": E("Hapus tanda", ["U"], "kurasi", "Kurasi"),
  "k.stars": E("Bintang 0–5", ["0", "1", "2", "3", "4", "5"], "kurasi", "Kurasi"),
  "k.stack": E("Tumpuk burst", ["B"], "kurasi", "Kurasi"),
  "k.keep": E("Ambil ini saja dari burst", ["Shift+B"], "kurasi", "Kurasi"),
  "k.bigger": E("Perbesar kisi", ["Ctrl+="], "kurasi", "Kurasi"),
  "k.smaller": E("Perkecil kisi", ["Ctrl+-"], "kurasi", "Kurasi"),
  "k.esc": E("Keluar zoom / bandingkan", ["Esc"], "kurasi", "Kurasi"),

  "e.select": E("Alat pilih", ["V"], "editor", "Tata letak"),
  "e.hand": E("Geser kanvas (tahan Spasi, atau seret klik tengah)", ["H", "Space"], "editor", "Tata letak"),
  "e.text": E("Tambah teks", ["T"], "editor", "Tata letak"),
  "e.frame": E("Tambah bingkai kosong", ["F"], "editor", "Tata letak"),
  "e.nudge": E("Geser 0,5 mm (Shift: 5 mm)", ["Left", "Right", "Up", "Down", "Shift+Left", "Shift+Right", "Shift+Up", "Shift+Down"], "editor", "Tata letak", true),
  "e.prev": E("Spread sebelumnya (← saat tidak ada yang dipilih)", ["PgUp", "Left"], "editor", "Tata letak", true),
  "e.next": E("Spread berikutnya (→ saat tidak ada yang dipilih)", ["PgDn", "Right"], "editor", "Tata letak", true),
  "e.overview": E("Semua spread", ["G"], "editor", "Tata letak"),
  "e.shuffle": E("Acak tata letak halaman", ["R"], "editor", "Tata letak"),
  "e.shuffleAll": E("Acak semua tata letak", [], "editor", "Tata letak"),
  "e.lock": E("Kunci tata letak", ["L"], "editor", "Tata letak"),
  "e.join": E("Sambung / pisahkan panorama", ["J"], "editor", "Tata letak"),
  "e.delete": E("Hapus foto (bingkai tetap) / hapus teks", ["Del", "Backspace"], "editor", "Tata letak"),
  "e.deleteFrame": E("Hapus bingkai beserta fotonya", ["Shift+Del"], "editor", "Tata letak"),
  "e.hero": E("Jadikan foto utama (bingkai terbesar)", ["Shift+H"], "editor", "Tata letak"),
  "e.cut": E("Potong foto (lalu Ctrl+V di halaman lain)", ["Ctrl+X"], "editor", "Tata letak"),
  "e.copyPhoto": E("Salin foto (lalu Ctrl+V di halaman lain)", ["Ctrl+C"], "editor", "Tata letak"),
  "e.paste": E("Tempel foto ke bingkai / halaman yang dipilih", ["Ctrl+V"], "editor", "Tata letak"),
  "e.edit": E("Edit teks / atur foto di bingkai", ["Enter"], "editor", "Tata letak"),
  "e.dup": E("Duplikat teks", ["Ctrl+D"], "editor", "Tata letak"),
  "e.copyLayout": E("Salin tata letak", ["Ctrl+Alt+C"], "editor", "Tata letak"),
  "e.pasteLayout": E("Tempel tata letak", ["Ctrl+Alt+V"], "editor", "Tata letak"),
  "e.newSpread": E("Spread baru", ["Ctrl+Alt+N"], "editor", "Tata letak"),
  "e.deleteSpread": E("Hapus spread ini", ["Ctrl+Del"], "editor", "Tata letak"),
  "e.addPage": E("Sisipkan halaman kosong sesudahnya", [], "editor", "Tata letak"),
  "e.clearPage": E("Kosongkan halaman (bingkai tetap)", [], "editor", "Tata letak"),
  "e.deletePage": E("Hapus halaman ini", [], "editor", "Tata letak"),
  "e.guides": E("Garis bantu", ["Ctrl+;"], "editor", "Tampilan"),
  "e.zoomIn": E("Perbesar", ["Ctrl+="], "editor", "Tampilan", true),
  "e.zoomOut": E("Perkecil", ["Ctrl+-"], "editor", "Tampilan", true),
  "e.fit": E("Pas layar (atau klik dua kali area kosong)", ["Ctrl+0"], "editor", "Tampilan"),
  "e.zoom100": E("Zoom 100%", ["Ctrl+1"], "editor", "Tampilan"),
  "e.actual": E("Ukuran 100%", ["Ctrl+1"], "editor", "Tampilan"),
  "e.selectAll": E("Pilih semua bingkai di spread", ["Ctrl+A"], "editor", "Tata letak"),
  "e.alignLeft": E("Rata kiri", ["Alt+Shift+A"], "editor", "Tata letak"),
  "e.alignHCenter": E("Rata tengah (datar)", ["Alt+Shift+H"], "editor", "Tata letak"),
  "e.alignRight": E("Rata kanan", ["Alt+Shift+D"], "editor", "Tata letak"),
  "e.alignTop": E("Rata atas", ["Alt+Shift+W"], "editor", "Tata letak"),
  "e.alignVCenter": E("Rata tengah (tegak)", ["Alt+Shift+V"], "editor", "Tata letak"),
  "e.alignBottom": E("Rata bawah", ["Alt+Shift+S"], "editor", "Tata letak"),
  "e.distH": E("Sebar rata mendatar", ["Alt+Shift+["], "editor", "Tata letak"),
  "e.distV": E("Sebar rata tegak", ["Alt+Shift+]"], "editor", "Tata letak"),
  "e.esc": E("Batal pilih", ["Esc"], "editor", "Tata letak"),

  "s.side": E("Tukar sisi depan / belakang", ["S"], "sampul", "Sampul"),
  "x.run": E("Mulai ekspor", ["Ctrl+Enter"], "ekspor", "Ekspor"),
} satisfies Record<string, Entry>;

export type CommandId = keyof typeof CATALOG;
export type Handler = { run: (combo: string) => void; enabled?: boolean; checked?: boolean; up?: () => void };

// ---- user key overrides ----
const KEY_STORE = "lwalbum:keys";
let overrides: Partial<Record<CommandId, string[]>> = (() => {
  try { return JSON.parse(localStorage.getItem(KEY_STORE) ?? "{}"); } catch { return {}; }
})();
export const keysOf = (id: CommandId): string[] => overrides[id] ?? CATALOG[id].keys;
export const isCustom = (id: CommandId) => !!overrides[id];
export function setKeys(id: CommandId, keys: string[] | null) {
  if (keys) overrides = { ...overrides, [id]: keys }; else { const { [id]: _drop, ...rest } = overrides; void _drop; overrides = rest; }
  try { localStorage.setItem(KEY_STORE, JSON.stringify(overrides)); } catch { /* storage full: lasts until the app closes */ }
  bump();
}
export function resetKeys() { overrides = {}; try { localStorage.removeItem(KEY_STORE); } catch { /* ignore */ } bump(); }
/** Other commands in the same scope (or global) that already use a key. */
export function conflicts(id: CommandId, key: string): CommandId[] {
  const s = CATALOG[id].scope;
  return (Object.keys(CATALOG) as CommandId[]).filter((o) => o !== id && keysOf(o).includes(key)
    && (CATALOG[o].scope === s || CATALOG[o].scope === "global" || s === "global"));
}

// ---- registry of what each command does right now ----
const handlers = new Map<CommandId, Handler>();
let scope: Scope = "home";
let version = 0;
const listeners = new Set<() => void>();
function bump() { version++; listeners.forEach((l) => l()); }
export const useKeysVersion = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version);
export const setScope = (s: Scope) => { if (s !== scope) { scope = s; bump(); } };
export const getScope = () => scope;
export const handlerOf = (id: CommandId) => handlers.get(id);

/** Give commands their actions for as long as the component is mounted. Handlers are read fresh on every key press. */
export function useCommands(map: Partial<Record<CommandId, Handler>>) {
  const ref = useRef(map);
  ref.current = map;
  const ids = Object.keys(map).sort().join(",");
  useLayoutEffect(() => {
    const mine = ids.split(",").filter(Boolean) as CommandId[];
    for (const id of mine) handlers.set(id, {
      get run() { return ref.current[id]!.run; },
      get enabled() { return ref.current[id]?.enabled; },
      get checked() { return ref.current[id]?.checked; },
      get up() { return ref.current[id]?.up; },
    } as Handler);
    bump();
    return () => { for (const id of mine) handlers.delete(id); bump(); };
  }, [ids]);
}

/** Run a command (from a menu or button) the same way a key press would. */
export function runCommand(id: CommandId) {
  const h = handlers.get(id);
  if (h && h.enabled !== false) h.run("");
}

// ---- key names ----
const CODE: Record<string, string> = {
  ArrowLeft: "Left", ArrowRight: "Right", ArrowUp: "Up", ArrowDown: "Down", PageUp: "PgUp", PageDown: "PgDn",
  Space: "Space", Enter: "Enter", NumpadEnter: "Enter", Escape: "Esc", Delete: "Del", Backspace: "Backspace", Tab: "Tab",
  Slash: "/", Semicolon: ";", Quote: "'", Equal: "=", Minus: "-", Comma: ",", Period: ".", NumpadAdd: "=", NumpadSubtract: "-",
  BracketLeft: "[", BracketRight: "]", Backslash: "\\", Home: "Home", End: "End",
};
/** "Ctrl+Shift+Z" from a key event, independent of keyboard layout for letters and digits. */
export function comboOf(e: KeyboardEvent): string {
  let k = "";
  if (e.code.startsWith("Key")) k = e.code.slice(3);
  else if (e.code.startsWith("Digit")) k = e.code.slice(5);
  else if (e.code.startsWith("Numpad") && /\d$/.test(e.code)) k = e.code.slice(6);
  else if (/^F\d+$/.test(e.code)) k = e.code;
  else k = CODE[e.code] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return "";
  return [e.ctrlKey || e.metaKey ? "Ctrl" : "", e.altKey ? "Alt" : "", e.shiftKey ? "Shift" : "", k].filter(Boolean).join("+");
}
const SHOW: Record<string, string> = { Left: "←", Right: "→", Up: "↑", Down: "↓", Space: "Spasi", Backspace: "⌫" };
/** Parts of a key for keycaps: "Ctrl+Shift+Z" → ["Ctrl", "Shift", "Z"]. */
export const keyParts = (k: string) => k.split(/\+(?!$)/).map((p) => SHOW[p] ?? p);
export const keyText = (k: string) => keyParts(k).join("+");

// ---- the one listener ----
const textLike = (t: EventTarget | null) => {
  if (t instanceof HTMLInputElement) return !["checkbox", "radio", "button", "range", "color", "submit", "reset", "file"].includes(t.type);
  return t instanceof HTMLElement && (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
};
/** Browser/WebView behaviours that would reload, print or zoom the app. */
const BLOCK = new Set(["Ctrl+R", "F5", "Ctrl+P", "Ctrl+F", "Ctrl+=", "Ctrl+-", "Ctrl+0", "Ctrl+Shift+R", "Ctrl+G", "Ctrl+U", "Ctrl+J", "Ctrl+H", "F3", "F7", "Alt+Left", "Alt+Right"]);
const FIELD_OWN = new Set(["Ctrl+Z", "Ctrl+Y", "Ctrl+Shift+Z", "Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+A", "Left", "Right", "Up", "Down", "Shift+Left", "Shift+Right", "Shift+Up", "Shift+Down", "Home", "End", "Del", "Shift+Del", "Backspace", "Enter", "Tab", "Shift+Tab"]);

function find(combo: string): [CommandId, Handler] | null {
  for (const pass of ["global", scope] as Scope[]) {
    for (const [id, h] of handlers) {
      if (CATALOG[id].scope !== pass) continue;
      if (keysOf(id).includes(combo) && h.enabled !== false) return [id, h];
    }
  }
  return null;
}

let held: Handler | null = null;
let installed = false;
/** Install once, from the app root. */
export function installKeys() {
  if (installed) return;
  installed = true;
  window.addEventListener("keydown", (e) => {
    const combo = comboOf(e);
    if (!combo) return;
    // A modal dialog or an open menu has the keyboard to itself.
    if (document.querySelector("dialog[open]") || document.querySelector(".menu-pop")) { if (BLOCK.has(combo)) e.preventDefault(); return; }
    const t = e.target;
    // Keyboard users who tabbed to a control keep Tab, Enter and Space for it.
    const active = document.activeElement;
    if (active && active !== document.body && !textLike(active) && ["Tab", "Shift+Tab", "Enter", "Space"].includes(combo)) return;
    if (textLike(t)) {
      const el = t as HTMLElement;
      if (combo === "Esc") { el.blur(); e.preventDefault(); return; }
      if (combo === "Enter" && el.tagName === "INPUT") { el.blur(); return; }
      const modified = combo.includes("Ctrl+") || combo.includes("Alt+") || /^F\d+$/.test(combo);
      if (!modified || FIELD_OWN.has(combo)) { if (BLOCK.has(combo)) e.preventDefault(); return; }
    }
    const hit = find(combo);
    if (!hit) { if (BLOCK.has(combo)) e.preventDefault(); return; }
    e.preventDefault();
    const [id, h] = hit;
    if (e.repeat && !CATALOG[id].repeat) return;
    if (h.up) held = h;
    h.run(combo);
  }, true);
  window.addEventListener("keyup", (e) => {
    if (held && (e.code === "Space" || e.code === "KeyH")) { held.up?.(); held = null; }
  });
  window.addEventListener("blur", () => { held?.up?.(); held = null; });
  // Focus goes back to the work area after a pointer click on a control, so the next key press is a shortcut,
  // not a second press of that button (Space) or a step of that slider (arrows).
  document.addEventListener("pointerup", (e) => {
    const el = (e.target as Element | null)?.closest?.("button, [role=tab], label, input[type=checkbox], input[type=radio], input[type=range], input[type=color], a");
    if (!el || el.closest("dialog")) return;
    setTimeout(() => {
      const a = document.activeElement as HTMLElement | null;
      if (a && a !== document.body && !textLike(a) && !a.closest("dialog")) a.blur();
    }, 0);
  }, true);
  document.addEventListener("change", (e) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "SELECT" && !t.closest("dialog")) setTimeout(() => t.blur(), 0);
  }, true);
  installTooltips();
}

// ---- tooltips: "Name (key)" for every control with data-cmd or data-tip ----
function installTooltips() {
  const tip = document.createElement("div");
  tip.className = "tooltip";
  tip.setAttribute("role", "tooltip");
  document.body.append(tip);
  let timer = 0, current: Element | null = null, lastHide = 0;
  const hide = () => { clearTimeout(timer); tip.classList.remove("on"); current = null; lastHide = Date.now(); };
  document.addEventListener("mouseover", (e) => {
    const el = (e.target as Element | null)?.closest?.("[data-cmd],[data-tip]");
    if (el === current) return;
    hide();
    if (!el) return;
    current = el;
    const cmd = el.getAttribute("data-cmd") as CommandId | null;
    const label = el.getAttribute("data-tip") ?? (cmd && CATALOG[cmd] ? CATALOG[cmd].label : "");
    const key = cmd && CATALOG[cmd] ? keysOf(cmd)[0] : el.getAttribute("data-key");
    if (!label) return;
    timer = window.setTimeout(() => {
      tip.replaceChildren(document.createTextNode(label));
      if (key) { const k = document.createElement("span"); k.className = "tip-keys"; for (const p of keyParts(key)) { const c = document.createElement("kbd"); c.textContent = p; k.append(c); } tip.append(k); }
      const r = el.getBoundingClientRect();
      tip.classList.add("on");
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let x = r.left + r.width / 2 - w / 2, y = r.bottom + 6;
      if (y + h > window.innerHeight - 4) y = r.top - h - 6;
      x = Math.max(4, Math.min(window.innerWidth - w - 4, x));
      tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }, Date.now() - lastHide < 400 ? 0 : 500);
  });
  document.addEventListener("pointerdown", hide, true);
  window.addEventListener("blur", hide);
}
