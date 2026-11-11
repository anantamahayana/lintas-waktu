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
export const tell = (message: string, title?: string) => show(message, { ok: "OK", cancel: null, title }).then(() => undefined);
