"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/admin-api";

type Sys = {
  database: string; last_backup: string | null; backup_age_days: number | null; offsite_at: string | null; offsite_age_days: number | null;
  disk_free_mb: number | null; disk_total_mb: number | null; warnings: string[];
};

const ago = (d: number | null) => (d === null ? "never" : d < 1 / 24 ? "just now" : d < 1 ? `${Math.round(d * 24)} h ago` : `${Math.round(d)} d ago`);
const gb = (mb: number) => `${(mb / 1000).toFixed(mb < 10000 ? 1 : 0)} GB`;

/** One quiet line on the dashboard; turns red only when backups are stale or the disk is filling up. */
export function SystemStatus() {
  const [s, setS] = useState<Sys | null>(null);
  useEffect(() => { api.get<Sys>("/api/admin/system").then(setS).catch(() => setS(null)); }, []);
  if (!s) return null;
  const bad = s.warnings.length > 0;
  return (
    <div className={`mb-6 px-4 py-3 border t-small flex flex-wrap items-center gap-x-5 gap-y-1 ${bad ? "border-error text-error" : "border-line text-mute"}`} role={bad ? "alert" : "status"}>
      <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${bad ? "bg-error" : "bg-[#5f7a4a]"}`} />{bad ? "Server needs attention" : "Server OK"}</span>
      <span>Backup on server {ago(s.backup_age_days)}</span>
      <span>Off-server backup {ago(s.offsite_age_days)}</span>
      {s.disk_free_mb !== null && s.disk_total_mb !== null && <span>Disk {gb(s.disk_free_mb)} free of {gb(s.disk_total_mb)}</span>}
      {bad && <span className="basis-full">{s.warnings.join(" · ")} — see docs/DEPLOYMENT.md → Backup API (VPS).</span>}
    </div>
  );
}
