"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ApiError, api, type Fact, type Project, type ProjectPhoto } from "@/lib/admin-api";
import { Btn, Card, Field, Input, Select, Textarea, confirm, focusFirstInvalid, toast, useUnsavedChanges, type FieldErrors } from "@/components/admin/ui";
import { FrameEditor } from "@/components/admin/FrameEditor";

type Values = Omit<Project, "id" | "cover_url" | "photo_count" | "created_at" | "updated_at" | "photos" | "sort_order">;

const empty: Values = {
  slug: "", title: "", category: "wedding", kind: "photo", location: "", date_label: "", month: null, drive_folder_id: "", cover_file_id: null, placeholder_urls: [],
  pull_en: "", pull_id: "", body_en: "", body_id: "", facts: [], film_title: null, film_duration: null, film_url: null, featured: false, published: false, cover_frame: null,
};

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Create/edit form. Photos come from the Drive folder; the cover is chosen among them. */
export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(project ? { ...empty, ...project } : empty);
  const [photos, setPhotos] = useState<ProjectPhoto[]>(project?.photos ?? []);
  const [busy, setBusy] = useState(false);
  const [framing, setFraming] = useState(false);
  const [tab, setTab] = useState<"en" | "id">("en");
  const [saved, setSaved] = useState<Values>(project ? { ...empty, ...project } : empty);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof Values>(k: K) => (e: { target: { value: string } }) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!v.title.trim()) e.title = "Give the project a title.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)) e.slug = "Lowercase letters, numbers and hyphens only, e.g. ayu-marco.";
    if (v.month && !/^\d{4}-\d{2}$/.test(v.month)) e.month = "Use YYYY-MM, e.g. 2026-06.";
    const isFilm = v.kind === "film";
    if (!isFilm && !v.drive_folder_id.trim() && v.placeholder_urls.length === 0) e.drive_folder_id = "Paste the Google Drive folder link or ID.";
    const isVideoLink = (u: string) => /(youtu\.be\/|youtube\.com\/|vimeo\.com\/)/.test(u);
    if (v.kind !== "photo" && !v.film_url) e.film_url = "A film project needs its YouTube or Vimeo link.";
    else if (v.film_url && !isVideoLink(v.film_url)) e.film_url = "Only YouTube and Vimeo links can be embedded.";
    return e;
  }

  const facts = v.facts ?? [];
  const setFact = (i: number, f: Partial<Fact>) => setV((s) => ({ ...s, facts: s.facts.map((x, j) => (j === i ? { ...x, ...f } : x)) }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) { focusFirstInvalid(); return; }
    // Going live (or off the site) is the one change visitors notice — say so.
    if (project && v.published !== saved.published) {
      const ok = await confirm(v.published
        ? { title: "Publish this project?", body: <>“{v.title}” will appear on the website within a minute, with its cover and every photo in the folder.</>, action: "Publish" }
        : { title: "Take this project off the website?", body: <>“{v.title}” and its page will disappear from the site within a minute. Nothing is deleted; you can publish it again later.</>, action: "Unpublish", danger: true });
      if (!ok) return;
    } else if (!project && v.published) {
      const ok = await confirm({ title: "Create and publish?", body: <>“{v.title}” will go live on the website right away. Untick “Published” to save it as a draft first.</>, action: "Create & publish" });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const body = { ...v, month: v.month || null, film_title: v.film_title || null, film_duration: v.film_duration || null, film_url: v.film_url || null };
      const result = project
        ? await api.patch<Project>(`/api/admin/projects/${project.id}`, body)
        : await api.post<Project>("/api/admin/projects", body);
      toast(project ? "Saved" : "Project created");
      setPhotos(result.photos ?? []);
      const next = { ...v, cover_file_id: result.cover_file_id };
      setV(next);
      setSaved(next);
      if (!project) router.replace(`/admin/projects/${result.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) { setErrors(err.fields); focusFirstInvalid(); }
      else if (err instanceof ApiError && err.status === 409) { setErrors({ slug: err.message }); focusFirstInvalid(); }
      toast(err instanceof Error ? err.message : "Could not save", true);
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    if (!project) return;
    try { const r = await api.post<Project>(`/api/admin/projects/${project.id}/sync`); setPhotos(r.photos ?? []); toast(`Folder re-read · ${r.photo_count} photos`); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", true); }
  }

  async function remove() {
    if (!project) return;
    const ok = await confirm({ title: `Delete “${project.title}”?`, body: "The project and its copy are removed from the admin and the website. Photographs in Google Drive are not touched. This cannot be undone.", action: "Delete project", danger: true });
    if (!ok) return;
    try { await api.del(`/api/admin/projects/${project.id}`); setSaved(v); toast(`“${project.title}” deleted`); router.push("/admin/projects"); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", true); }
  }

  return (
    <form onSubmit={save} noValidate className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <Card title="Basics">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Title" error={errors.title}><Input invalid={!!errors.title} value={v.title} onChange={(e) => setV((s) => ({ ...s, title: e.target.value, slug: project ? s.slug : slugify(e.target.value) }))} placeholder="Ayu & Marco" /></Field>
            <Field label="Slug" hint="/work/…" error={errors.slug}><Input invalid={!!errors.slug} value={v.slug} onChange={set("slug")} /></Field>
            <Field label="Category">
              <Select value={v.category} onChange={set("category")}>
                <option value="wedding">Wedding</option><option value="prewedding">Pre-wedding</option><option value="event">Event</option><option value="personal">Personal</option>
              </Select>
            </Field>
            <Field label="Kind" hint="what this project is made of">
              <Select value={v.kind} onChange={set("kind")}>
                <option value="photo">Photographs</option><option value="both">Photographs + film</option><option value="film">Film only</option>
              </Select>
            </Field>
            <Field label="Location"><Input value={v.location} onChange={set("location")} placeholder="Uluwatu" /></Field>
            <Field label="Date label" hint="shown on the site"><Input value={v.date_label} onChange={set("date_label")} placeholder="June 2026" /></Field>
            <Field label="Month" hint="YYYY-MM, for ordering" error={errors.month}><Input invalid={!!errors.month} value={v.month ?? ""} onChange={set("month")} placeholder="2026-06" /></Field>
          </div>
          <Field label={v.kind === "film" ? "Google Drive folder with stills" : "Google Drive folder"} hint={v.kind === "film" ? "optional — a few frames; the first one becomes the poster" : "link or ID — web-size JPEGs"} error={errors.drive_folder_id}>
            <Input invalid={!!errors.drive_folder_id} value={v.drive_folder_id} onChange={set("drive_folder_id")} placeholder="https://drive.google.com/drive/folders/…" />
          </Field>
          {v.placeholder_urls.length > 0 && !v.drive_folder_id && (
            <p className="t-small text-mute">
              Sample project: the site shows {v.placeholder_urls.length} placeholder photographs (Unsplash) until a Drive folder is set here.
            </p>
          )}
        </Card>

        <Card title="Story">
          <div className="flex gap-2">
            {(["en", "id"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setTab(l)} className={clsx("t-mono px-3 py-1.5 border", tab === l ? "bg-ink text-white border-ink" : "border-line")}>{l.toUpperCase()}</button>
            ))}
          </div>
          {tab === "en" ? (
            <>
              <Field label="Pull quote (EN)" hint="one sentence"><Textarea value={v.pull_en} onChange={set("pull_en")} rows={2} /></Field>
              <Field label="Body (EN)"><Textarea value={v.body_en} onChange={set("body_en")} rows={6} /></Field>
            </>
          ) : (
            <>
              <Field label="Kutipan (ID)" hint="satu kalimat"><Textarea value={v.pull_id} onChange={set("pull_id")} rows={2} /></Field>
              <Field label="Cerita (ID)"><Textarea value={v.body_id} onChange={set("body_id")} rows={6} /></Field>
            </>
          )}
        </Card>

        <Card title="Facts">
          <div className="flex flex-col gap-2">
            {facts.map((f, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input value={f.label} onChange={(e) => setFact(i, { label: e.target.value })} placeholder="Location" />
                <Input value={f.value} onChange={(e) => setFact(i, { value: e.target.value })} placeholder="Uluwatu, Bali" />
                <Btn type="button" onClick={() => setV((s) => ({ ...s, facts: s.facts.filter((_, j) => j !== i) }))}>×</Btn>
              </div>
            ))}
            <Btn type="button" className="self-start" onClick={() => setV((s) => ({ ...s, facts: [...s.facts, { label: "", value: "" }] }))}>+ Add fact</Btn>
          </div>
        </Card>

        {v.kind !== "photo" && (
          <Card title={v.kind === "film" ? "Film" : "Film · shown after the pull quote, before the photographs"}>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Title"><Input value={v.film_title ?? ""} onChange={set("film_title")} placeholder="Highlight film" /></Field>
              <Field label="Duration"><Input value={v.film_duration ?? ""} onChange={set("film_duration")} placeholder="5:12" /></Field>
              <Field label="Link" hint="YouTube or Vimeo" error={errors.film_url}><Input invalid={!!errors.film_url} value={v.film_url ?? ""} onChange={set("film_url")} placeholder="https://vimeo.com/…" /></Field>
            </div>
            <p className="t-small text-mute">
              Nothing loads from YouTube/Vimeo until a visitor presses play. {v.kind === "film" && "Without a stills folder, the poster is taken from the video link (press Sync if Vimeo was unreachable when saving)."}
            </p>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <Card title="Publish">
          <label className="flex items-center gap-3 t-small"><input type="checkbox" checked={v.published} onChange={(e) => setV((s) => ({ ...s, published: e.target.checked }))} /> Published on the website</label>
          <label className="flex items-center gap-3 t-small"><input type="checkbox" checked={v.featured} onChange={(e) => setV((s) => ({ ...s, featured: e.target.checked }))} /> Featured on the home page</label>
          <div className="flex flex-wrap gap-2 pt-2">
            <Btn kind="ink" type="submit" disabled={busy || (!!project && !dirty)}>{busy ? "Saving…" : project ? (dirty ? "Save changes" : "Saved") : "Create project"}</Btn>
            {project && <Btn type="button" onClick={sync}>Sync folder</Btn>}
            {project && v.published && <a className="link t-mono self-center" href={`/work/${v.slug}`} target="_blank" rel="noreferrer">View ↗</a>}
          </div>
          {project && <Btn type="button" kind="danger" className="self-start" onClick={remove}>Delete project</Btn>}
        </Card>

        <Card title={`Cover · ${photos.length} ${v.drive_folder_id ? "photos in folder" : v.placeholder_urls.length ? "placeholder photos" : "stills"}`}>
          {photos.length === 0 && v.kind === "film" ? (
            project?.film_poster_url
              ? <div className="flex flex-col gap-2"><div className="aspect-video bg-line overflow-hidden"><img src={project.film_poster_url} alt="" className="w-full h-full object-cover" /></div><p className="t-small text-mute">Poster from the video link. Add a stills folder to use your own frame.</p></div>
              : <p className="t-small text-faint">{project ? "No poster yet — the site shows a dark title slate. Press Sync to retry the video thumbnail, or add a stills folder." : "Save the project; the poster is taken from the video link."}</p>
          ) : photos.length === 0 ? (
            <p className="t-small text-faint">{project ? "No photos found — check the folder and press Sync." : "Save the project to read the folder, then choose a cover."}</p>
          ) : (
            <ul className="grid grid-cols-4 gap-1.5 max-h-[420px] overflow-y-auto">
              {photos.map((p) => (
                <li key={p.file_id}>
                  <button
                    type="button"
                    onClick={() => setV((s) => (s.cover_file_id === p.file_id ? s : { ...s, cover_file_id: p.file_id, cover_frame: null }))}
                    className={clsx("block w-full aspect-square bg-line overflow-hidden border-2 transition-colors", v.cover_file_id === p.file_id ? "border-ink" : "border-transparent hover:border-line")}
                    title={p.filename}
                  >
                    <img src={api.img(p.thumb_url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(() => {
            const cover = photos.find((p) => p.file_id === v.cover_file_id) ?? (v.cover_file_id ? undefined : photos[0]);
            if (!cover) return null;
            return (
              <>
                <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="t-small text-mute">{v.cover_frame ? `Framing set · focus ${Math.round(v.cover_frame.x)}% / ${Math.round(v.cover_frame.y)}%${v.cover_frame.zoom > 1 ? ` · ${Math.round(v.cover_frame.zoom * 100)}%` : ""}` : "Cover is centred in its frame"}</span>
                  <Btn type="button" onClick={() => setFraming(true)}>Adjust framing</Btn>
                </div>
                {framing && (
                  <FrameEditor
                    src={api.img(cover.full_url)}
                    title={`${v.title || "Project"} · cover`}
                    value={v.cover_frame}
                    previews={[{ label: "Work grid", ratio: 4 / 5 }, { label: "Project page · computer", ratio: 1.9 }, { label: "Project page · phone", ratio: 0.66 }]}
                    onSave={(f) => { setV((s) => ({ ...s, cover_frame: f })); setFraming(false); toast("Framing set — press Save to publish it"); }}
                    onClose={() => setFraming(false)}
                  />
                )}
              </>
            );
          })()}
        </Card>
      </div>
    </form>
  );
}
