import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { Behind } from "@/components/home/Behind";
import { RecentWork } from "@/components/home/RecentWork";
import { KindWords } from "@/components/home/KindWords";
import { Invite } from "@/components/home/Invite";
import { projects } from "@/lib/projects";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "", {});
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <Intro />
      <Behind />
      <RecentWork projects={projects.filter((p) => p.featured)} />
      <KindWords />
      <Invite />
    </>
  );
}
