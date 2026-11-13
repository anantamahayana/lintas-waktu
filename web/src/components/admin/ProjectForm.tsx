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
    if (!v.title.trim()) e.title = "Beri judul proyek.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)) e.slug = "Hanya huruf kecil, angka, dan tanda hubung, mis. ayu-marco.";
    if (v.month && !/^\d{4}-\d{2}$/.test(v.month)) e.month = "Pakai YYYY-MM, mis. 2026-06.";
    const isFilm = v.kind === "film";
    if (!isFilm && !v.drive_folder_id.trim() && v.placeholder_urls.length === 0) e.drive_folder_id = "Tempel link atau ID folder Google Drive.";
    const isVideoLink = (u: string) => /(youtu\.be\/|youtube\.com\/|vimeo\.com\/)/.test(u);
    if (v.kind !== "photo" && !v.film_url) e.film_url = "Proyek film perlu link YouTube atau Vimeo.";
    else if (v.film_url && !isVideoLink(v.film_url)) e.film_url = "Hanya link YouTube dan Vimeo yang bisa ditampilkan.";
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
        ? { title: "Terbitkan proyek ini?", body: <>“{v.title}” will appear on the website within a minute, with its cover and every photo in the folder.</>, action: "Terbitkan" }
        : { title: "Tarik proyek ini dari website?", body: <>“{v.title}” and its page will disappear from the site within a minute. Nothing is deleted; you can publish it again later.</>, action: "Tarik dari website", danger: true });
      if (!ok) return;
    } else if (!project && v.published) {
      const ok = await confirm({ title: "Buat dan terbitkan?", body: <>“{v.title}” will go live on the website right away. Untick “Published” to save it as a draft first.</>, action: "Buat & terbitkan" });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const body = { ...v, month: v.month || null, film_title: v.film_title || null, film_duration: v.film_duration || null, film_url: v.film_url || null };
      const result = project
        ? await api.patch<Project>(`/api/admin/projects/${project.id}`, body)
        : await api.post<Project>("/api/admin/projects", body);
      toast(project ? "Tersimpan" : "Proyek dibuat");
      setPhotos(result.photos ?? []);
      const next = { ...v, cover_file_id: result.cover_file_id };
      setV(next);
      setSaved(next);
      if (!project) router.replace(`/admin/projects/${result.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) { setErrors(err.fields); focusFirstInvalid(); }
      else if (err instanceof ApiError && err.status === 409) { setErrors({ slug: err.message }); focusFirstInvalid(); }
      toast(err instanceof Error ? err.message : "Gagal menyimpan", true);
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    if (!project) return;
    try { const r = await api.post<Project>(`/api/admin/projects/${project.id}/sync`); setPhotos(r.photos ?? []); toast(`Folder dibaca ulang · ${r.photo_count} foto`); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", true); }
  }

  async function remove() {
    if (!project) return;
    const ok = await confirm({ title: `Hapus “${project.title}”?`, body: "Proyek dan teksnya dihapus dari admin dan website. Foto di Google Drive tidak disentuh. Tidak bisa dibatalkan.", action: "Delete project", danger: true });
    if (!ok) return;
    try { await api.del(`/api/admin/projects/${project.id}`); setSaved(v); toast(`“${project.title}” dihapus`); router.push("/admin/projects"); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed", true); }
  }

  return (
    <form onSubmit={save} noValidate className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <Card title="Dasar">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Judul" error={errors.title}><Input invalid={!!errors.title} value={v.title} onChange={(e) => setV((s) => ({ ...s, title: e.target.value, slug: project ? s.slug : slugify(e.target.value) }))} placeholder="Ayu & Marco" /></Field>
            <Field label="Slug" hint="/work/…" error={errors.slug}><Input invalid={!!errors.slug} value={v.slug} onChange={set("slug")} /></Field>
            <Field label="Kategori">
              <Select value={v.category} onChange={set("category")}>
                <option value="wedding">Pernikahan</option><option value="prewedding">Prewedding</option><option value="editorial">Editorial / Model</option><option value="event">Acara</option><option value="personal">Personal</option>
              </Select>
            </Field>
            <Field label="Jenis" hint="isi proyek ini">
              <Select value={v.kind} onChange={set("kind")}>
                <option value="photo">Foto</option><option value="both">Foto + film</option><option value="film">Film saja</option>
              </Select>
            </Field>
            <Field label="Lokasi"><Input value={v.location} onChange={set("location")} placeholder="Uluwatu" /></Field>
            <Field label="Label tanggal" hint="tampil di website"><Input value={v.date_label} onChange={set("date_label")} placeholder="Juni 2026" /></Field>
            <Field label="Bulan" hint="YYYY-MM, untuk urutan" error={errors.month}><Input invalid={!!errors.month} value={v.month ?? ""} onChange={set("month")} placeholder="2026-06" /></Field>
          </div>
          <Field label={v.kind === "film" ? "Folder Google Drive berisi foto" : "Folder Google Drive"} hint={v.kind === "film" ? "opsional — beberapa frame; yang pertama jadi poster" : "link atau ID — JPEG ukuran web"} error={errors.drive_folder_id}>
            <Input invalid={!!errors.drive_folder_id} value={v.drive_folder_id} onChange={set("drive_folder_id")} placeholder="https://drive.google.com/drive/folders/…" />
          </Field>
          {v.placeholder_urls.length > 0 && !v.drive_folder_id && (
            <p className="t-small text-mute">
              Sample project: the site shows {v.placeholder_urls.length} placeholder photographs (Unsplash) until a Drive folder is set here.
            </p>
          )}
        </Card>

        <Card title="Cerita">
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

        <Card title="Fakta">
          <div className="flex flex-col gap-2">
            {facts.map((f, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input value={f.label} onChange={(e) => setFact(i, { label: e.target.value })} placeholder="Lokasi" />
                <Input value={f.value} onChange={(e) => setFact(i, { value: e.target.value })} placeholder="Uluwatu, Bali" />
                <Btn type="button" onClick={() => setV((s) => ({ ...s, facts: s.facts.filter((_, j) => j !== i) }))}>×</Btn>
              </div>
            ))}
            <Btn type="button" className="self-start" onClick={() => setV((s) => ({ ...s, facts: [...s.facts, { label: "", value: "" }] }))}>+ Tambah fakta</Btn>
          </div>
        </Card>

        {v.kind !== "photo" && (
          <Card title={v.kind === "film" ? "Film" : "Film · tampil setelah kutipan, sebelum foto"}>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Judul"><Input value={v.film_title ?? ""} onChange={set("film_title")} placeholder="Film highlight" /></Field>
              <Field label="Durasi"><Input value={v.film_duration ?? ""} onChange={set("film_duration")} placeholder="5:12" /></Field>
              <Field label="Link" hint="YouTube atau Vimeo" error={errors.film_url}><Input invalid={!!errors.film_url} value={v.film_url ?? ""} onChange={set("film_url")} placeholder="https://vimeo.com/…" /></Field>
            </div>
            <p className="t-small text-mute">
              Nothing loads from YouTube/Vimeo until a visitor presses play. {v.kind === "film" && "Tanpa folder foto, poster diambil dari link video (tekan Sinkronkan kalau Vimeo tidak terjangkau saat menyimpan)."}
            </p>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <Card title="Terbitkan">
          <label className="flex items-center gap-3 t-small"><input type="checkbox" checked={v.published} onChange={(e) => setV((s) => ({ ...s, published: e.target.checked }))} /> Terbit di website</label>
          <label className="flex items-center gap-3 t-small"><input type="checkbox" checked={v.featured} onChange={(e) => setV((s) => ({ ...s, featured: e.target.checked }))} /> Tampil di beranda</label>
          <div className="flex flex-wrap gap-2 pt-2">
            <Btn kind="ink" type="submit" disabled={busy || (!!project && !dirty)}>{busy ? "Menyimpan…" : project ? (dirty ? "Simpan perubahan" : "Tersimpan") : "Buat proyek"}</Btn>
            {project && <Btn type="button" onClick={sync}>Sinkronkan folder</Btn>}
            {project && v.published && <a className="link t-mono self-center" href={`/work/${v.slug}`} target="_blank" rel="noreferrer">Lihat ↗</a>}
          </div>
          {project && <Btn type="button" kind="danger" className="self-start" onClick={remove}>Hapus proyek</Btn>}
        </Card>

        <Card title={`Sampul · ${photos.length} ${v.drive_folder_id ? "foto di folder" : v.placeholder_urls.length ? "foto contoh" : "frame"}`}>
          {photos.length === 0 && v.kind === "film" ? (
            project?.film_poster_url
              ? <div className="flex flex-col gap-2"><div className="aspect-video bg-line overflow-hidden"><img src={project.film_poster_url} alt="" className="w-full h-full object-cover" /></div><p className="t-small text-mute">Poster dari link video. Tambahkan folder foto untuk memakai frame sendiri.</p></div>
              : <p className="t-small text-faint">{project ? "Belum ada poster — website menampilkan latar gelap dengan judul. Tekan Sinkronkan untuk mencoba thumbnail video lagi, atau tambahkan folder foto." : "Simpan proyek; poster diambil dari link video."}</p>
          ) : photos.length === 0 ? (
            <p className="t-small text-faint">{project ? "Tidak ada foto — periksa folder lalu tekan Sinkronkan." : "Simpan proyek untuk membaca folder, lalu pilih sampul."}</p>
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
                  <span className="t-small text-mute">{v.cover_frame ? `Komposisi diatur · fokus ${Math.round(v.cover_frame.x)}% / ${Math.round(v.cover_frame.y)}%${v.cover_frame.zoom > 1 ? ` · ${Math.round(v.cover_frame.zoom * 100)}%` : ""}` : "Sampul di tengah bingkai"}</span>
                  <Btn type="button" onClick={() => setFraming(true)}>Atur komposisi</Btn>
                </div>
                {framing && (
                  <FrameEditor
                    src={api.img(cover.full_url)}
                    title={`${v.title || "Proyek"} · sampul`}
                    value={v.cover_frame}
                    previews={[{ label: "Grid portofolio", ratio: 4 / 5 }, { label: "Halaman proyek · komputer", ratio: 1.9 }, { label: "Halaman proyek · HP", ratio: 0.66 }]}
                    onSave={(f) => { setV((s) => ({ ...s, cover_frame: f })); setFraming(false); toast("Komposisi diatur — tekan Simpan untuk menerbitkan"); }}
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
