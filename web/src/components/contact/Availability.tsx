import clsx from "clsx";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Availability = { from_date: string; to_date: string; taken: string[] };

/**
 * "Is my date free?" — three small month grids with taken days marked. Only dates
 * are known to the site (never who or what); refreshed with the rest of the content.
 */
export async function Availability({ locale }: { locale: string }) {
  let data: Availability | null = null;
  try {
    const res = await fetch(`${API}/api/public/availability?months=3`, { next: { revalidate: 60, tags: ["content"] } });
    if (res.ok) data = (await res.json()) as Availability;
  } catch {}
  if (!data) return null;
  const t = await getTranslations("contact.availability");
  const taken = new Set(data.taken);
  const today = new Date(data.from_date + "T00:00:00");
  const months = Array.from({ length: 3 }, (_, i) => new Date(today.getFullYear(), today.getMonth() + i, 1));
  const monthName = (d: Date) => d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { month: "long", year: "numeric" });
  const dow = locale === "id" ? ["S", "S", "R", "K", "J", "S", "M"] : ["M", "T", "W", "T", "F", "S", "S"];
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <Reveal as="section" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="t-mono text-mute">{t("eyebrow")}</span>
        <p className="t-body max-w-[52ch]">{t("lead")}</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-8">
        {months.map((m) => {
          const first = new Date(m.getFullYear(), m.getMonth(), 1);
          const offset = (first.getDay() + 6) % 7;
          const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          return (
            <div key={key(m)} className="flex flex-col gap-3">
              <span className="t-caption">{monthName(m)}</span>
              <div className="grid grid-cols-7 gap-y-1.5 text-center">
                {dow.map((d, i) => <span key={i} className="t-mono !text-[9px] text-faint">{d}</span>)}
                {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const d = new Date(m.getFullYear(), m.getMonth(), i + 1);
                  const k = key(d);
                  const past = k < data!.from_date;
                  const busy = taken.has(k);
                  return (
                    <span key={k} aria-label={busy ? t("taken") : undefined} className={clsx("t-small tabular-nums h-7 flex items-center justify-center", past ? "text-faint/60" : busy ? "text-faint line-through decoration-ink/40" : "text-ink")}>
                      {i + 1}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="t-small text-mute">{t("note")}</p>
    </Reveal>
  );
}
