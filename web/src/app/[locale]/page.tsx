import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { Statement } from "@/components/home/Statement";
import { RecentWork } from "@/components/home/RecentWork";
import { Behind } from "@/components/home/Behind";
import { ContactStrip } from "@/components/home/ContactStrip";
import { projects, whenOf } from "@/lib/projects";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const featured = projects.filter((p) => p.featured);
  const frames = featured.map((p) => ({ id: p.slug, slug: p.slug, title: p.title, location: p.location, when: whenOf(p), cover: p.cover }));
  const recent = projects.slice(0, 4);

  return (
    <>
      <Hero frames={frames} />
      <Statement />
      <RecentWork projects={recent} />
      <Behind />
      <ContactStrip />
    </>
  );
}
