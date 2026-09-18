import type { Metadata } from "next";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { Gallery } from "@/components/work/Gallery";
import { getProject, nextProject, projects } from "@/lib/projects";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  return p ? { title: p.title, description: p.pull } : {};
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = getProject(slug);
  if (!p) notFound();
  const t = await getTranslations();
  const next = nextProject(slug);

  return (
    <article>
      {/* Hero — the morph target */}
      <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
        <div className="h-[70vh] lg:h-[84vh] w-full">
          <Photo seed={p.cover} alt={p.title} priority sizes="100vw" className="h-full w-full" />
        </div>
      </ViewTransition>

      <header className="wrap gutter pt-12 lg:pt-16 pb-12 lg:pb-16 flex flex-col items-center text-center gap-5">
        <Reveal><span className="t-mono text-mute">{t(`categories.${p.category}`)} · {p.location} · {p.date}</span></Reveal>
        <Reveal delay={80}><h1 className="t-display-sm">{p.title}</h1></Reveal>
        <Reveal delay={160}><p className="t-statement max-w-[36ch] text-balance">{p.pull}</p></Reveal>
        <Reveal delay={240} as="dl" className="flex flex-wrap justify-center gap-x-10 gap-y-3 pt-4">
          {p.facts.map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1">
              <dt className="t-mono text-faint">{f.label}</dt>
              <dd className="t-small text-ink">{f.value}</dd>
            </div>
          ))}
        </Reveal>
      </header>

      <Gallery seeds={p.gallery} title={p.title} />

      <section className="wrap gutter py-16 lg:py-24 flex flex-col items-center text-center gap-5">
        <Reveal><span className="t-mono text-mute">{t("project.theDay")}</span></Reveal>
        <Reveal delay={80}><p className="t-body max-w-[60ch]">{p.body}</p></Reveal>
      </section>

      {p.film && (
        <section className="wrap gutter pb-16 lg:pb-24">
          <Reveal>
            <button type="button" aria-label={t("project.playFilm")} className="group relative w-full aspect-video bg-dark flex items-center justify-center text-on-dark">
              <span className="t-mono absolute left-5 top-5 text-on-dark-mute">{t("project.film")} · {p.film.duration}</span>
              <span className="h-14 w-14 border border-on-dark/50 rounded-full flex items-center justify-center transition-transform duration-700 ease-out-soft group-hover:scale-110">
                <span className="ml-0.5 border-y-[6px] border-y-transparent border-l-[10px] border-l-on-dark" />
              </span>
            </button>
          </Reveal>
        </section>
      )}

      <Link href={`/work/${next.slug}`} className="group block border-t border-line">
        <div className="wrap gutter py-12 lg:py-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <span className="t-mono text-mute">{t("project.next")}</span>
            <span className="t-display-sm">{next.title}</span>
            <span className="t-mono text-faint">{t(`categories.${next.category}`)} · {next.location}</span>
          </div>
          <div className="w-[140px] lg:w-[180px] aspect-[4/5] shrink-0">
            <Photo seed={next.cover} sizes="180px" className="h-full w-full" />
          </div>
        </div>
      </Link>
    </article>
  );
}
