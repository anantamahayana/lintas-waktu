import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { UpdateChip } from "./Update";
import { Icon, type IconName } from "../lib/icons";
import { CATALOG, comboOf, conflicts, handlerOf, isCustom, keyParts, keysOf, resetKeys, runCommand, setKeys, useKeysVersion, type CommandId } from "../lib/keys";

// ---------- small building blocks (Figma page 02) ----------

export function Kbd({ k }: { k: string }) {
  return <span className="keys">{keyParts(k).map((p, i) => <kbd key={i}>{p}</kbd>)}</span>;
}

type BtnProps = {
  label?: ReactNode; icon?: IconName; kind?: "primary" | "secondary" | "ghost" | "danger";
  cmd?: CommandId; tip?: string; onClick?: () => void; disabled?: boolean; on?: boolean; full?: boolean; className?: string; type?: "button" | "submit";
};
/** Text button, one line, optional icon. With `cmd` it runs that command and its tooltip shows the key. */
export function Btn({ label, icon, kind = "secondary", cmd, tip, onClick, disabled, on, full, className = "" }: BtnProps) {
  useKeysVersion();
  const h = cmd ? handlerOf(cmd) : undefined;
  const off = disabled ?? (cmd ? !h || h.enabled === false : false);
  return (
    <button type="button" className={`b ${kind} ${full ? "full" : ""} ${on ? "on" : ""} ${className}`} disabled={off} data-cmd={cmd} data-tip={tip}
      aria-pressed={on === undefined ? undefined : on} onClick={onClick ?? (cmd ? () => runCommand(cmd) : undefined)}>
      {icon && <Icon name={icon} />}{label !== undefined && <span className="b-label">{label}</span>}
    </button>
  );
}

/** Square icon button for toolbars; always has a tooltip. */
export function IconBtn({ icon, cmd, tip, on, onClick, disabled, small }: { icon: IconName; cmd?: CommandId; tip?: string; on?: boolean; onClick?: () => void; disabled?: boolean; small?: boolean }) {
  useKeysVersion();
  const h = cmd ? handlerOf(cmd) : undefined;
  const off = disabled ?? (cmd ? !h || h.enabled === false : false);
  const pressed = on ?? (cmd ? h?.checked : undefined);
  return (
    <button type="button" className={`ib ${small ? "s" : ""} ${pressed ? "on" : ""}`} disabled={off} data-cmd={cmd} data-tip={tip} aria-label={tip ?? (cmd ? CATALOG[cmd].label : icon)}
      aria-pressed={pressed === undefined ? undefined : pressed} onClick={onClick ?? (cmd ? () => runCommand(cmd) : undefined)}>
      <Icon name={icon} />
    </button>
  );
}

/** Segmented control. */
export function Seg<T extends string>({ items, value, onChange, full, label }: { items: { v: T; label: ReactNode; tip?: string; icon?: IconName }[]; value: T; onChange: (v: T) => void; full?: boolean; label?: string }) {
  return (
    <div className={`seg ${full ? "full" : ""}`} role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.v} type="button" className={it.v === value ? "on" : ""} aria-pressed={it.v === value} data-tip={it.tip} onClick={() => onChange(it.v)}>
          {it.icon && <Icon name={it.icon} size={14} />}{it.label}
        </button>
      ))}
    </div>
  );
}

/** Property row: fixed label column, control fills the rest (labels never wrap). */
export function Row({ label, children, tip }: { label: string; children: ReactNode; tip?: string }) {
  return <div className="row"><span className="row-label" title={tip ?? label}>{label}</span><div className="row-ctl">{children}</div></div>;
}

/** Number field with the unit inside and a short prefix. Enter applies, Esc leaves; arrows step (Shift ×10). */
export function NumField({ value, onChange, min, max, step = 1, unit, prefix, label, width }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; prefix?: string; label?: string; width?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const show = (v: number) => (Math.round(v * 100) / 100).toLocaleString("id-ID");
  const commit = () => { if (draft !== null) { const v = parseFloat(draft.replace(",", ".")); if (!Number.isNaN(v)) onChange(clamp(v)); setDraft(null); } };
  return (
    <label className="tf" style={width ? { width } : undefined}>
      {prefix && <span className="tf-pre">{prefix}</span>}
      <input type="text" inputMode="decimal" aria-label={label ?? prefix} value={draft ?? show(value)}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setDraft(null); }
          else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); onChange(clamp(value + (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1))); setDraft(null); }
        }} />
      {unit && <span className="tf-unit">{unit}</span>}
    </label>
  );
}

const OPEN_KEY = "lwalbum:sections";
const openState = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(OPEN_KEY) ?? "{}"); } catch { return {}; } };
/** Collapsible panel section; open/closed is remembered. */
export function Section({ id, title, children, defaultOpen = true, action }: { id: string; title: string; children: ReactNode; defaultOpen?: boolean; action?: ReactNode }) {
  const [open, setOpen] = useState(() => openState()[id] ?? defaultOpen);
  const toggle = () => { const next = !open; setOpen(next); try { localStorage.setItem(OPEN_KEY, JSON.stringify({ ...openState(), [id]: next })); } catch { /* ignore */ } };
  return (
    <section className="sec">
      <div className="sec-h">
        <button type="button" className="sec-t" aria-expanded={open} onClick={toggle}><Icon name={open ? "chevron-down" : "chevron-right"} size={14} />{title}</button>
        {action}
      </div>
      {open && <div className="sec-b">{children}</div>}
    </section>
  );
}

// ---------- menu bar ----------

type Item = CommandId | "-";
const MENUS: { label: string; access: string; items: Item[] }[] = [
  { label: "File", access: "F", items: ["app.new", "app.open", "-", "app.save", "-", "app.export", "-", "app.close", "app.home"] },
  { label: "Edit", access: "E", items: ["app.undo", "app.redo", "-", "e.dup", "e.delete", "-", "app.prefs"] },
  { label: "Foto", access: "O", items: ["k.pick", "k.reject", "k.unflag", "-", "k.grid", "k.one", "k.compare", "k.zoom", "-", "k.stack", "k.keep"] },
  { label: "Album", access: "A", items: ["app.props", "app.auto", "e.shuffleAll", "-", "app.templates"] },
  { label: "Halaman", access: "H", items: ["e.newSpread", "e.deleteSpread", "-", "e.addPage", "e.clearPage", "e.deletePage", "-", "e.shuffle", "e.copyLayout", "e.pasteLayout", "e.lock", "-", "e.join", "-", "e.text", "e.frame", "-", "e.selectAll", "e.alignLeft", "e.alignHCenter", "e.alignRight", "e.alignTop", "e.alignVCenter", "e.alignBottom", "e.distH", "e.distV", "-", "e.prev", "e.next"] },
  { label: "Tampilan", access: "T", items: ["mod.kurasi", "mod.editor", "mod.sampul", "mod.ekspor", "-", "e.overview", "-", "e.zoomIn", "e.zoomOut", "e.fit", "e.actual", "-", "e.guides", "app.panels", "app.full"] },
  { label: "Bantuan", access: "B", items: ["app.keys", "app.prefs", "-", "app.update", "app.about"] },
];

export function MenuBar({ title, state, tone }: { title: string; state?: string; tone?: "warn" | "danger" }) {
  useKeysVersion();
  const [open, setOpen] = useState<number | null>(null);
  const [hi, setHi] = useState(-1);
  const bar = useRef<HTMLDivElement>(null);
  const items = open === null ? [] : MENUS[open].items;
  const usable = (it: Item) => it !== "-" && !!handlerOf(it) && handlerOf(it)!.enabled !== false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open === null) {
        if (e.altKey && !e.ctrlKey && !e.shiftKey && !document.querySelector("dialog[open]")) {
          const i = MENUS.findIndex((m) => `Key${m.access}` === e.code);
          if (i >= 0) { e.preventDefault(); setOpen(i); setHi(MENUS[i].items.findIndex(usable)); }
        }
        return;
      }
      const c = comboOf(e);
      if (!c) return;
      e.preventDefault(); e.stopPropagation();
      const move = (d: number) => { let j = hi; for (let n = 0; n < items.length; n++) { j = (j + d + items.length) % items.length; if (usable(items[j])) { setHi(j); return; } } };
      if (c === "Esc") setOpen(null);
      else if (c === "Down") move(1);
      else if (c === "Up") move(-1);
      else if (c === "Right" || c === "Left") { const n = (open + (c === "Right" ? 1 : MENUS.length - 1)) % MENUS.length; setOpen(n); setHi(MENUS[n].items.findIndex(usable)); }
      else if (c === "Enter" || c === "Space") { const it = items[hi]; if (it && usable(it)) { setOpen(null); runCommand(it as CommandId); } }
    };
    const onDown = (e: PointerEvent) => { if (open !== null && !bar.current?.contains(e.target as Node)) setOpen(null); };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("pointerdown", onDown, true); };
  });

  return (
    <div className="menubar" ref={bar}>
      <span className="app-mark" aria-hidden="true">LW</span>
      <nav className="menus" aria-label="Menu">
        {MENUS.map((m, i) => (
          <div key={m.label} className="menu-wrap">
            <button type="button" className={`menu-t ${open === i ? "on" : ""}`} aria-haspopup="menu" aria-expanded={open === i}
              onClick={() => { setOpen(open === i ? null : i); setHi(-1); }} onMouseEnter={() => { if (open !== null && open !== i) { setOpen(i); setHi(-1); } }}>
              {(() => { const a = Math.max(0, m.label.toUpperCase().indexOf(m.access)); return <>{m.label.slice(0, a)}<u>{m.label[a]}</u>{m.label.slice(a + 1)}</>; })()}
            </button>
            {open === i && (
              <div className="menu-pop" role="menu" aria-label={m.label}>
                {m.items.map((it, j) => it === "-" ? <div key={j} className="menu-sep" role="separator" /> : (
                  <button key={it} type="button" role="menuitem" className={`menu-i ${hi === j ? "hi" : ""}`} disabled={!usable(it)}
                    onMouseEnter={() => setHi(j)} onClick={() => { setOpen(null); runCommand(it); }}>
                    <span className="menu-check">{handlerOf(it)?.checked ? <Icon name="check" size={14} /> : null}</span>
                    <span className="menu-l">{CATALOG[it].label}</span>
                    <span className="menu-k">{keysOf(it)[0] ? keyParts(keysOf(it)[0]).join("+") : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="doc-title"><strong>{title}</strong>{state && <span className={tone ?? ""}> · {state}</span>}</div>
    </div>
  );
}

// ---------- module bar ----------

export type Module = "kurasi" | "editor" | "sampul" | "ekspor";
const MODS: { m: Module; label: string; icon: IconName; cmd: CommandId }[] = [
  { m: "kurasi", label: "Kurasi", icon: "images", cmd: "mod.kurasi" },
  { m: "editor", label: "Tata letak", icon: "layout-template", cmd: "mod.editor" },
  { m: "sampul", label: "Sampul", icon: "book", cmd: "mod.sampul" },
  { m: "ekspor", label: "Ekspor", icon: "download", cmd: "mod.ekspor" },
];

export function ModuleBar({ module, onHome, onModule, right }: { module: Module | null; onHome: () => void; onModule: (m: Module) => void; right?: ReactNode }) {
  return (
    <div className="modbar">
      <IconBtn icon="house" tip="Beranda" cmd={module ? "app.home" : undefined} on={!module} onClick={onHome} />
      <span className="vdiv" />
      <nav className="mods" aria-label="Modul">
        {MODS.map((x) => (
          <button key={x.m} type="button" className={`mod ${module === x.m ? "on" : ""}`} disabled={!module} aria-current={module === x.m ? "page" : undefined}
            data-cmd={x.cmd} onClick={() => onModule(x.m)}>
            <Icon name={x.icon} />{x.label}
          </button>
        ))}
      </nav>
      <span className="grow" />
      {right}
    </div>
  );
}

export function StatusBar({ left, warn, right }: { left: ReactNode; warn?: ReactNode; right?: ReactNode }) {
  return (
    <footer className="statusbar">
      <span className="sb-l">{left}</span>
      {warn && <span className="sb-warn"><Icon name="triangle-alert" size={12} />{warn}</span>}
      <span className="grow" />
      {right}
      <UpdateChip onOpen={() => runCommand("app.update")} />
      <button type="button" className="sb-help" data-cmd="app.keys" onClick={() => runCommand("app.keys")}><Icon name="keyboard" size={12} />Ctrl+/ pintasan</button>
    </footer>
  );
}

// ---------- shortcut sheet and editor ----------

const GROUPS = ["File", "Edit", "Tampilan", "Kurasi", "Tata letak", "Album", "Sampul", "Ekspor", "Bantuan"];

export function ShortcutSheet({ edit: startEdit, onClose }: { edit?: boolean; onClose: () => void }) {
  useKeysVersion();
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(!!startEdit);
  const [rec, setRec] = useState<CommandId | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    if (!rec) return;
    const on = (e: KeyboardEvent) => {
      const c = comboOf(e);
      if (!c) return;
      e.preventDefault(); e.stopPropagation();
      if (c === "Esc") { setRec(null); return; }
      const clash = conflicts(rec, c);
      setKeys(rec, [c]);
      setNote(clash.length ? `“${keyParts(c).join("+")}” juga dipakai untuk ${clash.map((x) => CATALOG[x].label).join(", ")}. Ubah salah satunya agar tidak bentrok.` : "");
      setRec(null);
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, [rec]);
  const ids = useMemo(() => (Object.keys(CATALOG) as CommandId[]).filter((id) => {
    const s = q.trim().toLowerCase();
    return !s || CATALOG[id].label.toLowerCase().includes(s) || keysOf(id).some((k) => k.toLowerCase().includes(s));
  }), [q]);
  return (
    <dialog ref={ref} className="dlg dlg-xl" onClose={onClose} onCancel={(e) => { if (rec) e.preventDefault(); }} aria-labelledby="keys-t">
      <header className="dlg-h"><Icon name="keyboard" size={18} /><h1 id="keys-t">Pintasan keyboard</h1>
        <span className="grow" />
        <input className="search" type="text" placeholder="Cari perintah atau tombol…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" />
        <Seg items={[{ v: "lihat", label: "Lihat" }, { v: "ubah", label: "Ubah" }]} value={edit ? "ubah" : "lihat"} onChange={(v) => { setEdit(v === "ubah"); setRec(null); }} />
        <IconBtn icon="x" tip="Tutup (Esc)" onClick={() => ref.current?.close()} />
      </header>
      <div className="dlg-b keys-cols">
        {GROUPS.map((g) => {
          const list = ids.filter((id) => CATALOG[id].group === g);
          if (!list.length) return null;
          return (
            <section key={g} className="keys-g">
              <h2>{g}</h2>
              {list.map((id) => (
                <div key={id} className={`keys-r ${rec === id ? "rec" : ""}`}>
                  <span className="keys-l">{CATALOG[id].label}</span>
                  {edit ? (
                    <button type="button" className={`keys-edit ${isCustom(id) ? "custom" : ""}`} onClick={() => { setRec(id); setNote(""); }} aria-label={`Ubah tombol untuk ${CATALOG[id].label}`}>
                      {rec === id ? "Tekan tombol…" : keysOf(id)[0] ? <Kbd k={keysOf(id)[0]} /> : <span className="dimtext">—</span>}
                    </button>
                  ) : keysOf(id).slice(0, 2).map((k) => <Kbd key={k} k={k} />)}
                </div>
              ))}
            </section>
          );
        })}
      </div>
      <footer className="dlg-f">
        {note ? <span className="warn-text"><Icon name="triangle-alert" size={14} /> {note}</span> : <span className="dimtext">Pintasan satu huruf tidak aktif saat Anda mengetik di isian. Modul berbeda boleh memakai huruf yang sama.</span>}
        <span className="grow" />
        {edit && <Btn label="Kembalikan bawaan" icon="rotate-ccw" kind="ghost" onClick={() => { resetKeys(); setNote(""); }} />}
        <Btn label="Tutup" kind="primary" onClick={() => ref.current?.close()} />
      </footer>
    </dialog>
  );
}
