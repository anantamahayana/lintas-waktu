import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { Behind } from "@/components/home/Behind";
import { RecentWork } from "@/components/home/RecentWork";
import { KindWords } from "@/components/home/KindWords";
import { Invite } from "@/components/home/Invite";
import { getProjects, getSite, getSiteImages } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "", {});
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [projects, site, img] = await Promise.all([getProjects(locale), getSite(), getSiteImages()]);
  const featured = projects.filter((p) => p.featured);
  return (
    <>
      <Hero cover={img.hero ?? featured[0]?.coverSrc} />
      <Intro images={img} />
      <Behind src={img["behind-main"]} />
      <RecentWork projects={featured.length ? featured : projects.slice(0, 3)} />
      <KindWords />
      <Invite site={site} src={img.cta} />
    </>
  );
}
