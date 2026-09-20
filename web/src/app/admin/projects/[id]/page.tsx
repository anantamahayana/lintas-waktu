"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Project } from "@/lib/admin-api";
import { PageHeader, toast, LoadError, SkeletonForm } from "@/components/admin/ui";
import { ProjectForm } from "@/components/admin/ProjectForm";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [p, setP] = useState<Project | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => { api.get<Project>(`/api/admin/projects/${id}`).then((x) => { setP(x); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed")); }, [id]);
  useEffect(() => { load(); }, [load]);
  if (err) return <LoadError error={err} retry={() => { setErr(null); load(); }} />;
  if (!p) return <SkeletonForm fields={10} />;
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/projects" className="link">Projects</Link>} title={p.title} />
      <ProjectForm project={p} />
    </>
  );
}
