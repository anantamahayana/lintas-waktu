"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Project } from "@/lib/admin-api";
import { PageHeader, toast } from "@/components/admin/ui";
import { ProjectForm } from "@/components/admin/ProjectForm";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [p, setP] = useState<Project | null>(null);
  useEffect(() => { api.get<Project>(`/api/admin/projects/${id}`).then(setP).catch((e) => toast(e.message, true)); }, [id]);
  if (!p) return <p className="t-small text-mute">Loading…</p>;
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/projects" className="link">Projects</Link>} title={p.title} />
      <ProjectForm project={p} />
    </>
  );
}
