import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { getProject, nextProject, projects } from "@/lib/projects";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return { title: p.title, description: p.pull };
}

// Gallery rhythm (see Figma Work Detail): 2 · 3 · 1 · 2 …
const ROWS = [2, 3, 1, 2];

export default async function ProjectPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = getProject(slug);
  if (!p) notFound();
  const t = await getTranslations();
  const next = nextProject(slug);

  // Split gallery seeds into rows following ROWS
  const rows: string[][] = [];
  for (let i = 0, r = 0; i < p.gallery.length; r++) {
    const n = ROWS[r % ROWS.length];
    rows.push(p.gallery.slice(i, i + n));
    i += n;
  }

  return (
    <article>
      {/* Title block */}
      <header className="gutter pt-8 pb-8 lg:pt-18 lg:pb-12 flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
        <Reveal className="flex flex-col gap-4 lg:gap-5 lg:flex-1">
          <p className="eyebrow">
            <Link href="/work" className="hover:text-ink transition-colors">← {t("project.back")}</Link>
            <span className="mx-3">·</span>
            {t(`categories.${p.category}`)} · {p.location} · {p.date}
          </p>
          <Headline as="h1" size="hero" line1={p.title} line2={p.pull.split(".")[0] + "."} />
        </Reveal>
        <Reveal delay={120} as="dl" className="w-full lg:w-[320px] flex flex-col">
          {p.facts.map((f) => (
            <div key={f.label} className="flex justify-between gap-4 py-2.5 border-b border-line t-small">
              <dt className="text-mute">{f.label}</dt>
              <dd className="text-right">{f.value}</dd>
            </div>
          ))}
        </Reveal>
      </header>

      {/* Hero image */}
      <Reveal className="gutter">
        <Photo seed={p.cover} alt={p.title} priority sizes="100vw" className="h-[440px] lg:h-[720px]" />
      </Reveal>

      {/* Story */}
      <section className="gutter py-12 lg:py-24 flex flex-col lg:flex-row gap-6 lg:gap-16">
        <Reveal className="lg:w-[320px] shrink-0">
          <p className="eyebrow">{t("project.theDay")}</p>
        </Reveal>
        <Reveal delay={80} className="flex flex-col gap-6 max-w-[720px]">
          <p className="t-h3 font-display italic">{p.pull}</p>
          <p className="t-body text-mute max-w-[640px]">{p.body}</p>
        </Reveal>
      </section>

      {/* Gallery */}
      <section className="gutter flex flex-col gap-3 lg:gap-5">
        {rows.map((row, ri) => (
          <div key={ri} className={`grid gap-3 lg:gap-5 ${row.length === 1 ? "grid-cols-1" : row.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"}`}>
            {row.map((seed, i) => (
              <Reveal key={seed} delay={i * 70} className={row.length === 3 && i === 2 ? "col-span-2 lg:col-span-1" : ""}>
                <Photo
                  seed={seed}
                  sizes={row.length === 1 ? "100vw" : row.length === 2 ? "50vw" : "(min-width:1024px) 33vw, 50vw"}
                  className={row.length === 1 ? "h-[440px] lg:h-[760px]" : row.length === 2 ? "h-[220px] lg:h-[560px]" : "h-[220px] lg:h-[620px]"}
                />
              </Reveal>
            ))}
          </div>
        ))}
      </section>

      {/* Film */}
      {p.film && (
        <section className="gutter py-14 lg:py-24 flex flex-col items-center gap-5 lg:gap-6">
          <Reveal><p className="eyebrow">{t("project.film")} · {p.film.duration}</p></Reveal>
          <Reveal delay={80} className="w-full">
            <button
              type="button"
              aria-label={t("project.playFilm")}
              className="group relative w-full aspect-video rounded-lg bg-green overflow-hidden flex items-center justify-center"
            >
              <span className="h-14 w-14 lg:h-22 lg:w-22 rounded-full bg-paper flex items-center justify-center transition-transform duration-500 ease-out-soft group-hover:scale-105">
                <span className="ml-1 border-y-[9px] border-y-transparent border-l-[14px] border-l-ink" />
              </span>
            </button>
          </Reveal>
        </section>
      )}

      {/* Next project */}
      <Link
        href={`/work/${next.slug}`}
        className="group bg-paper-deep gutter py-10 lg:py-18 flex items-center justify-between gap-6 transition-colors hover:bg-highlight"
      >
        <div className="flex flex-col gap-2">
          <span className="eyebrow">{t("project.next")}</span>
          <span className="t-h3 lg:t-h2">
            {next.title} — {t(`categories.${next.category}`)} · {next.location}
          </span>
        </div>
        <Photo seed={next.cover} sizes="240px" className="hidden sm:block w-[160px] h-[110px] lg:w-[240px] lg:h-[160px] shrink-0" />
      </Link>
    </article>
  );
}
