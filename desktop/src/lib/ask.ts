/**
 * In-app replacements for window.confirm / window.alert. Those are silently blocked inside
 * sandboxed frames (such as a hosted preview), where confirm() just returns false, so a button
 * guarded by it looks like it does nothing.
 */
function show(message: string, ok: string, cancel: string | null): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "dialog small";
    const p = document.createElement("p");
    p.textContent = message;
    const row = document.createElement("div");
    row.className = "dlg-actions";
    const button = (label: string, value: boolean, primary: boolean) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = primary ? "btn primary" : "btn";
      b.textContent = label;
      b.onclick = () => { d.returnValue = value ? "ok" : ""; d.close(); };
      row.append(b);
      return b;
    };
    if (cancel) button(cancel, false, false);
    const main = button(ok, true, true);
    d.append(p, row);
    d.onclose = () => { resolve(d.returnValue === "ok"); d.remove(); };
    document.body.append(d);
    d.showModal();
    main.focus();
  });
}

export const ask = (message: string, ok = "Lanjutkan", cancel = "Batal") => show(message, ok, cancel);
export const tell = (message: string) => show(message, "OK", null).then(() => undefined);
