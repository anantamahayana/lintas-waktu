import type { Metadata } from "next";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMeta } from "@/lib/seo";
import { dummyPhoto } from "@/lib/dummy-photos";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { Gallery } from "@/components/work/Gallery";
import { getProject, relatedProjects, projects } from "@/lib/projects";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return pageMeta(locale, `/work/${slug}`, { title: p.title, description: p.pull, image: dummyPhoto(p.cover, 1200) });
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = getProject(slug);
  if (!p) notFound();
  const t = await getTranslations();
  const related = relatedProjects(slug);

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

      {/* More work — three related projects to choose from */}
      <section className="border-t border-line">
        <div className="wrap gutter py-16 lg:py-24 flex flex-col items-center gap-10 lg:gap-14">
          <Reveal className="flex flex-col items-center text-center gap-3">
            <span className="t-mono text-mute">{t("project.more")}</span>
          </Reveal>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-10 w-full">
            {related.map((r, i) => (
              <Reveal as="li" key={r.slug} delay={i * 100}>
                <Link href={`/work/${r.slug}`} className="group flex flex-col items-center text-center gap-4">
                  <ViewTransition name={`photo-${r.slug}`} share="morph" default="none">
                    <div className="w-full aspect-[4/5]">
                      <Photo seed={r.cover} alt={r.title} sizes="(min-width:640px) 30vw, 100vw" className="h-full w-full" />
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
