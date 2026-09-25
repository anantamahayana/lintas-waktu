/**
 * Site text = the defaults in messages/{en,id}.json, with what the admin changed ("Site text")
 * laid over them. Only text that differs from the default is stored, so improving a default in
 * code still reaches every field nobody has touched. Lists are replaced as a whole.
 */
export type Copy = { [k: string]: string | Copy | Copy[] };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Defaults with the overrides on top; an override of the wrong shape is ignored. */
export function mergeCopy<T>(defaults: T, overrides: unknown): T {
  if (isObj(defaults) && isObj(overrides)) {
    const out: Record<string, unknown> = { ...defaults };
    for (const k of Object.keys(defaults)) if (k in overrides) out[k] = mergeCopy(defaults[k], overrides[k]);
    return out as T;
  }
  if (Array.isArray(defaults)) return (Array.isArray(overrides) ? overrides : defaults) as T;
  if (typeof defaults === "string") return (typeof overrides === "string" ? overrides : defaults) as T;
  return defaults;
}

/** What differs from the defaults — the part worth storing. undefined when nothing does. */
export function diffCopy(value: unknown, defaults: unknown): unknown {
  if (isObj(value) && isObj(defaults)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) {
      const d = diffCopy(value[k], defaults[k]);
      if (d !== undefined) out[k] = d;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return JSON.stringify(value) === JSON.stringify(defaults) ? undefined : value;
}
