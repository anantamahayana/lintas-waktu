import type { Metadata } from "next";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { Gallery } from "@/components/work/Gallery";
import { Film, FilmBadge } from "@/components/work/Film";
import { getProject, getProjects, related } from "@/lib/content";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateStaticParams() {
  // Published projects are pre-rendered at build time; anything added later renders on demand
  const projects = await getProjects(routing.defaultLocale);
  return routing.locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProject(slug, locale);
  if (!p) return {};
  return pageMeta(locale, `/work/${slug}`, { title: p.title, description: p.pull, image: p.coverSrc });
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = await getProject(slug, locale);
  if (!p) notFound();
  const t = await getTranslations();
  const all = await getProjects(locale);
  const relatedProjects = related(all, slug);

  const isFilm = p.kind === "film" && p.film;
  const hasStills = p.gallery.length > 0;

  return (
    <article>
      {/* Hero — a photograph, or for a film project the film itself (click to play) */}
      {isFilm && p.film ? (
        <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
          <div className="wrap gutter pt-6 lg:pt-10">
            <Film embedUrl={p.film.embedUrl!} poster={p.coverSrc ?? p.film.poster} title={p.title} label={p.film.title} duration={p.film.duration} playLabel={t("project.playFilm")} priority className="w-full aspect-video" />
          </div>
        </ViewTransition>
      ) : (
        <ViewTransition name={`photo-${p.slug}`} share="morph" default="none">
          <div className="h-[70vh] lg:h-[84vh] w-full">
            <Photo src={p.coverSrc} seed={p.cover} alt={p.title} priority sizes="100vw" className="h-full w-full" />
          </div>
        </ViewTransition>
      )}

      <header className="wrap gutter pt-12 lg:pt-16 pb-12 lg:pb-16 flex flex-col items-center text-center gap-5">
        <Reveal><span className="t-mono text-mute">{t(`categories.${p.category}`)}{p.kind !== "photo" && ` · ${t(p.kind === "film" ? "project.kindFilm" : "project.kindBoth")}`} · {p.location} · {p.date}</span></Reveal>
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

      {/* Photo + film: the film sits right after the words, before the photographs */}
      {!isFilm && p.film && (
        <section className="wrap gutter pb-12 lg:pb-16">
          <Reveal>
            <Film embedUrl={p.film.embedUrl!} poster={p.film.poster} title={p.title} label={p.film.title} duration={p.film.duration} playLabel={t("project.playFilm")} className="w-full aspect-video" />
          </Reveal>
        </section>
      )}

      {hasStills && (
        <>
          {isFilm && (
            <div className="wrap gutter pt-4 pb-8 lg:pb-10 text-center">
              <Reveal><span className="t-mono text-mute">{t("project.stills")}</span></Reveal>
            </div>
          )}
          <Gallery seeds={p.gallery} srcs={p.gallerySrcs} title={p.title} />
        </>
      )}

      <section className="wrap gutter py-16 lg:py-24 flex flex-col items-center text-center gap-5">
        <Reveal><span className="t-mono text-mute">{t("project.theDay")}</span></Reveal>
        <Reveal delay={80}><p className="t-body max-w-[60ch]">{p.body}</p></Reveal>
      </section>

      {/* More work — three related projects to choose from */}
      <section className="border-t border-line">
        <div className="wrap gutter py-16 lg:py-24 flex flex-col items-center gap-10 lg:gap-14">
          <Reveal className="flex flex-col items-center text-center gap-3">
            <span className="t-mono text-mute">{t("project.more")}</span>
          </Reveal>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-10 w-full">
            {relatedProjects.map((r, i) => (
              <Reveal as="li" key={r.slug} delay={i * 100}>
                <Link href={`/work/${r.slug}`} className="group flex flex-col items-center text-center gap-4">
                  <ViewTransition name={`photo-${r.slug}`} share="morph" default="none">
                    <div className="relative w-full aspect-[4/5]">
                      <Photo src={r.coverSrc} seed={r.cover} alt={r.title} sizes="(min-width:640px) 30vw, 100vw" className="h-full w-full" />
                      {r.film && <FilmBadge duration={r.film.duration} />}
                    </div>
                  </ViewTransition>
                  <div className="flex flex-col gap-1">
                    <span className="t-caption">{r.title}</span>
                    <span className="t-mono text-mute">{t(`categories.${r.category}`)} · {r.location}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={300}><Link href="/work" className="action">{t("project.all")}</Link></Reveal>
        </div>
      </section>
    </article>
  );
}
