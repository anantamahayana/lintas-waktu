"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, token } from "@/lib/admin-api";
import { Btn, Field, Input } from "@/components/admin/ui";
import { Logo } from "@/components/brand/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ access_token: string }>("/api/admin/login", { password });
      token.set(r.access_token);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#f6f5f1] px-5">
      <form onSubmit={onSubmit} className="w-full max-w-[400px] bg-white border border-line p-8 flex flex-col gap-6">
        <div className="flex flex-col items-start gap-3">
          <Logo size={28} />
          <span className="t-mono text-mute">Masuk admin</span>
        </div>
        <Field label="Kata sandi" error={error ?? undefined}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
        </Field>
        <Btn kind="ink" type="submit" disabled={busy || !password}>{busy ? "Masuk…" : "Masuk"}</Btn>
        <p className="t-small text-faint">Maksimal 5 kali gagal per alamat, 20 total, per 15 menit.</p>
      </form>
    </div>
  );
}
