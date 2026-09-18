"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, token } from "@/lib/admin-api";
import { Btn, Field, Input } from "@/components/admin/ui";

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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#f6f5f1] px-5">
      <form onSubmit={onSubmit} className="w-full max-w-[400px] bg-white border border-line p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="font-serif italic text-[24px] leading-none">Lintas Waktu</span>
          <span className="t-mono text-mute">Admin sign in</span>
        </div>
        <Field label="Password" error={error ?? undefined}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
        </Field>
        <Btn kind="ink" type="submit" disabled={busy || !password}>{busy ? "Signing in…" : "Sign in"}</Btn>
        <p className="t-small text-faint">5 failed attempts per address, 20 total, per 15 minutes.</p>
      </form>
    </div>
  );
}
