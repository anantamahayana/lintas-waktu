"use client";

import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { ProjectForm } from "@/components/admin/ProjectForm";

export default function NewProjectPage() {
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/projects" className="link">Projects</Link>} title="New project" />
      <ProjectForm />
    </>
  );
}
