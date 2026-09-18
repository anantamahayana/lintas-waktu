# Lintas Waktu — Brand & Design System

Versi 0.1 · 18 September 2026 · Sumber kebenaran: file Figma [PROJECT LTS-WKT](https://www.figma.com/design/EvV2Sx1fGok8wpLDXQ9mPh/PROJECT-LTS-WKT), page *Lintas Waktu — Website*

Dokumen ini merangkum keputusan desain yang ada di Figma agar (1) kode memakai nama token yang sama persis, dan (2) saat palet/logo brand final tersedia, jelas apa yang diganti di mana.

---

## 1. Identitas

| | |
|---|---|
| Nama | **Lintas Waktu** (tanpa suffix; *Studio* / *Creative* adalah visi masa depan) |
| Deskriptor | *Photography & Film · Bali* (ID: *Fotografi & Film · Bali*) |
| Makna | "melintasi waktu" — momen yang bisa dikunjungi kembali, bukan sekadar disimpan |
| Skala | Fotografer & videografer freelance independen; ini bagian dari cerita, bukan kekurangan |
| Spesialisasi | Wedding · Pre-wedding · Event · Personal (personal branding, graduation, keluarga) |
| Target | Lokal (Bali/Indonesia) + internasional (destination wedding & pre-wedding di Bali) |
| Bahasa | Inggris utama, Indonesia kedua (`/id/*`) |
| Nada | Tenang, editorial, hangat, tidak berlebihan. Kalimat pendek. Satu frasa dihighlight italic. |
| Logo | Belum ada → **wordmark tipografi** (Instrument Serif Regular, "Lintas Waktu"). Logo simbolik menyusul. |

---

## 2. Warna — koleksi Figma `LW / Color`

Semua fill, stroke, dan teks di Figma terikat ke token ini. **Ganti nilai token → seluruh desain ikut.** Nama token di kode (Tailwind/CSS) harus sama.

| Token | Hex | Dipakai untuk |
|---|---|---|
| `bg/canvas` | `#C9CAB9` | Latar di luar "kartu kertas" (sage abu) |
| `bg/paper` | `#F6F3EB` | Latar utama halaman, kartu |
| `bg/paper-deep` | `#EDE9DD` | Section bergantian, kartu admin, panel form |
| `bg/green` | `#2F4A3A` | Strip gelap (Services, Values), video frame, hover tombol Ink |
| `bg/green-deep` | `#22362B` | Band judul di atas strip hijau |
| `bg/highlight` | `#DCD9C6` | Latar frasa italic di headline, ikon panduan |
| `text/ink` | `#1C1B18` | Teks utama, tombol primer, layar gelap (intro, menu mobile, bar pilihan) |
| `text/mute` | `#6F6D64` | Teks sekunder, eyebrow, label |
| `text/faint` | `#A3A196` | Placeholder, copyright, teks tersier |
| `text/on-dark` | `#F6F3EB` | Teks di atas ink/green |
| `text/on-dark-mute` | `#B9C4B8` | Teks sekunder di atas ink/green |
| `line/default` | `#DAD6C8` | Garis pemisah, border tombol ghost, underline field |
| `line/on-dark` | `#4A6455` | Garis pemisah di atas green |
| `accent/olive` | `#7C8A5A` | Status "deadline soon" / "replied" di admin |
| `accent/gold` | `#C9A84C` | **Hanya di galeri klien & admin proofing**: state terpilih, progress bar, tombol Send, status "choosing" |

Di luar token, satu warna khusus: **error** `#A3402F` (merah bata redup) — untuk pesan validasi form dan toast error saja. Sengaja tidak dimasukkan ke palet brand.

Placeholder foto memakai gradasi `#8E9A7A → #4F6250`; ini bukan warna brand dan hilang saat foto asli masuk.

### Saat palet final tersedia
Yang paling mungkin berubah: `bg/canvas`, `bg/green`, `bg/green-deep`, `accent/gold`. Yang sebaiknya dipertahankan mendekati sekarang: `bg/paper` dan `text/ink` — kontras dan nuansa "kertas" adalah inti dari tampilan editorial ini.

---

## 3. Tipografi — text style Figma

| Keluarga | Font | Peran |
|---|---|---|
| Display | **Instrument Serif** Regular + Italic | Headline, wordmark, angka besar (counter, statistik), kutipan |
| Body | **Inter** Regular / Medium / Semi Bold | Paragraf, label, tombol, navigasi |

Keduanya Google Fonts (gratis). Kandidat pengganti display bila brand final butuh karakter lain: *Fraunces*, *Cormorant Garamond*, *Newsreader* — semua tersedia di Figma & Google Fonts, cukup ganti font family di text style.

| Style | Desktop | Mobile (`· M`) | Catatan |
|---|---|---|---|
| Display/Hero | 88 / 0.98 / −2 | 40 / 1.0 / −1 | Hero, CTA penutup, 404 |
| Display/H2 | 56 / 1.05 / −1 | 34 / 1.08 / −0.5 | Judul section |
| Display/H3 | 32 / 1.15 / −0.5 | 24 / 1.2 / 0 | Judul kartu, FAQ, judul karya |
| Display/Wordmark | 24 | — | "Lintas Waktu" di nav/footer |
| Body/Lead | 18 / 1.55 | 16 / 1.55 | Paragraf pembuka |
| Body/Default | 15 / 1.6 | sama | Paragraf |
| Body/Medium | 15 / 1.4 | sama | Label tombol |
| Body/Small | 13 / 1.5 | sama | Meta, catatan, footer |
| Label/Eyebrow | 11 / 1.2 / +1.6, UPPERCASE | sama | Label di atas judul, kategori |
| Label/Nav | 14 | sama | Tautan navigasi |

Format: ukuran px / line-height (rasio) / letter-spacing px. Setiap Display punya pasangan *Italic*.

### Pola headline
Dua baris. Baris 1 Regular, baris 2 **Italic di dalam kotak `bg/highlight`** (padding 10–14px horizontal, radius 4). Baris 2 adalah kalimat yang "mengubah makna" baris 1.

> Moments pass. **The photographs don't.**
> Nothing here is rushed. **Including the photographs.**
> No team. No vendor desk. **Just the person who was there.**

---

## 4. Layout

| Prinsip | Nilai |
|---|---|
| Kanvas | Desktop 1440, mobile 390. Konten di dalam "kartu kertas" (`bg/paper`, radius 6) di atas `bg/canvas`, margin 24 (desktop) / 12 (mobile) |
| Gutter dalam | 40px desktop, 20px mobile |
| Jarak antar-section | 96–128px desktop, 56–72px mobile |
| Grid foto | Baris rata atas-bawah, gap 20–24px desktop / 6–12px mobile. Ritme dari **pola per baris** (2:1 → 3 sejajar → 1:2 → 2 sejajar), bukan dari masonry acak |
| Sudut | Foto 8px, kartu 10–12px, tombol/chip pill (999), dialog 20–24px |
| Tombol | Pill. Ink = primer, Ghost = sekunder, Gold = hanya galeri klien. Satu CTA utama per layar |
| Field | Underline saja (tanpa kotak), label eyebrow di atas |
| Section gelap | Strip `bg/green` dengan band judul `bg/green-deep` — maksimal satu per halaman |
| Gerak (untuk kode) | Scroll-reveal lembut, hover foto scale 1.05 dalam 500ms, tanpa parallax berat |

---

## 5. Komponen (Figma → kode)

| Komponen Figma | Property | Padanan kode |
|---|---|---|
| `Site / Nav`, `Site / Nav · M` | — | `<SiteNav>` |
| `Site / Footer`, `Site / Footer · M` | — | `<SiteFooter>` |
| `Photo / Placeholder` | — | `<Photo>` (next/image), ganti fill dengan gambar |
| `Package Card` | Name, Tagline, Price, Includes | `<PackageCard>` |
| `Form / Field` | Label, Placeholder | `<Field>` |
| `Button` | Kind: Ink/Ghost/Gold · State: Default/Hover/Focus/Disabled | `<Button kind>` |
| `Filter Chip` | State: Default/Hover/Active | `<Chip>` |
| `Form Field / States` | Default/Focus/Filled/Error/Disabled | state CSS `<Field>` |
| `Gallery / Tile` | Selected, Has note, Maybe, Extra, Dimmed (boolean) | `PhotoTile.jsx` di photo-selection-platform |
| `Admin / Sidebar` | — | `AdminShell.jsx` |

---

## 6. Peta layar di Figma

Satu page, lima section:

1. **Screens — Desktop 1440**: Home, Work, Work Detail, Services, About, Contact
2. **Screens — Mobile 390**: keenam halaman yang sama
3. **Client Gallery — /g/[slug]**: G1 Intro · G2 PIN · G3 Gallery (mobile + desktop) · G4 Guide · G5 Lightbox + Note · G6 Over Package · G7 Confirm & Extras · G8 Sent
4. **Admin — /admin**: A1 Login · A2 Sessions · A3 Session Detail · A4 New Session · A5 Projects · A6 Inquiries · A7 Site Settings
5. **States & Details**: variant set Button/Chip/Field, hover kartu, FAQ, toggle, toast, form terkirim, menu mobile, 404

Plus section **Components** di kiri kanvas.

---

## 7. Copy inti (EN — sumber untuk terjemahan ID)

| Tempat | Teks |
|---|---|
| Eyebrow hero | Independent wedding & film photographer · Bali |
| Hero | Moments pass. / The photographs don't. |
| Lead hero | Wedding, pre-wedding, events and personal stories — photographed and filmed slowly, with intention, so they can be revisited long after the day is gone. |
| CTA utama | Start a conversation |
| Selected work | Some days are worth / returning to. |
| Services | Not packages. Not deliverables. / Days, kept with care. |
| Behind the camera | No team. No vendor desk. / Just the person who was there. |
| Process | Nothing here is rushed. / Including the photographs. — Conversation → The day → Choose your photos → Delivery |
| Packages | Three ways to keep the day. / Pick the pace. |
| CTA penutup | Tell us about / your day. |
| Work | Days worth / returning to. |
| Services page | Four kinds of days. / One way of working. |
| About | Lintas Waktu means / across time. |
| 404 | This moment has passed. / The page didn't. |
| Galeri: intro | A gallery for {client} · Tap to enter |
| Galeri: panduan | Choosing your photos |
| Galeri: kirim | Send selection → · Thank you, {client}. |

Semua **harga, nama klien, testimoni, FAQ, gear, dan kontak** di desain adalah placeholder — ganti sebelum publikasi.

---

## 8. Yang belum ada / keputusan tertunda

- Palet final & logo (token siap diganti, lihat §2).
- Copy Bahasa Indonesia (terjemahkan dari §7).
- Foto asli untuk semua placeholder.
- Editor admin untuk *Services & packages* dan *Testimonials* (polanya sama dengan A5/A6).
- Halaman `/bali-wedding` (landing internasional) dan `/journal` — fase berikut.
