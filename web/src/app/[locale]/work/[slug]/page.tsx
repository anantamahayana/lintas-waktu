import type { Metadata } from "next";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { Gallery } from "@/components/work/Gallery";
import { ProjectTimeline } from "@/components/work/ProjectTimeline";
import { frameOf, getProject, nextProject, projects, whenOf } from "@/lib/projects";

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
    <article className="pt-[var(--nav-h)]">
      <ProjectTimeline id={p.slug} when={whenOf(p)} label={`${p.title}, ${p.location}`} />

      {/* Hero — the morph target */}
      <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
        <div className="h-[calc(100dvh-var(--nav-h)-var(--timeline-h))] w-full">
          <Photo seed={p.cover} alt={p.title} priority sizes="100vw" className="h-full w-full" />
        </div>
      </ViewTransition>

      {/* Caption row, contact-sheet style */}
      <header className="gutter pt-6 lg:pt-8 pb-12 lg:pb-20 grid lg:grid-cols-12 gap-6">
        <Reveal className="lg:col-span-7 flex flex-col gap-5">
          <span className="t-mono text-faint">{frameOf(p)} · {whenOf(p).replace("-", " · ")}</span>
          <h1 className="t-display-sm">{p.title}</h1>
          <p className="t-statement max-w-[28ch] font-extralight">{p.pull}</p>
        </Reveal>
        <Reveal delay={100} as="dl" className="lg:col-span-4 lg:col-start-9 flex flex-col t-mono">
          <div className="flex justify-between gap-4 py-2.5 border-b border-line"><dt className="text-mute">{t("nav.work")}</dt><dd>{t(`categories.${p.category}`)}</dd></div>
          {p.facts.map((f) => (
            <div key={f.label} className="flex justify-between gap-4 py-2.5 border-b border-line">
              <dt className="text-mute">{f.label}</dt>
              <dd className="text-right normal-case tracking-normal">{f.value}</dd>
            </div>
          ))}
        </Reveal>
      </header>

      <Gallery seeds={p.gallery} title={p.title} />

      <section className="gutter py-16 lg:py-28 grid lg:grid-cols-12 gap-8">
        <Reveal className="lg:col-span-3 t-mono text-mute">{t("project.theDay")}</Reveal>
        <Reveal delay={80} className="lg:col-span-6 t-body text-mute max-w-[60ch]">{p.body}</Reveal>
      </section>

      {p.film && (
        <section className="gutter pb-16 lg:pb-28">
          <Reveal>
            <button type="button" aria-label={t("project.playFilm")} className="group relative w-full aspect-video bg-dark flex items-center justify-center text-on-dark">
              <span className="t-mono absolute left-5 top-5 text-on-dark-mute">{t("project.film")} · {p.film.duration}</span>
              <span className="h-12 w-12 border border-on-dark/40 rounded-full flex items-center justify-center transition-transform duration-700 ease-out-soft group-hover:scale-110">
                <span className="ml-0.5 border-y-[6px] border-y-transparent border-l-[10px] border-l-on-dark" />
              </span>
            </button>
          </Reveal>
        </section>
      )}

      <Link href={`/work/${next.slug}`} className="group block gutter py-10 lg:py-16 border-t border-line">
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <span className="t-mono text-mute">{t("project.next")} · {whenOf(next).replace("-", " · ")}</span>
            <span className="t-display-sm">{next.title}</span>
          </div>
          <div className="w-[120px] lg:w-[200px] aspect-[4/5] shrink-0">
            <Photo seed={next.cover} sizes="200px" className="h-full w-full" />
          </div>
        </div>
      </Link>
    </article>
  );
}
