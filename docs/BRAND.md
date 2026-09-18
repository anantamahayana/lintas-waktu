# Lintas Waktu — Brand & Design System

Versi 1.0 · 19 September 2026 · Arah: **Classic editorial** (arah ketiga, dipilih setelah dua prototipe)
Sumber kebenaran: **kode di `web/`** (`src/app/globals.css`, komponen). File Figma masih menggambarkan arah pertama dan **belum diperbarui** — jangan dijadikan acuan sampai disinkronkan.

> Riwayat arah: (1) krem/serif/kartu — `c46f177`; (2) "light table" putih + garis waktu — `fb8c95f`; (3) classic editorial — `494d794` dan seterusnya. Fondasi teknis sama untuk ketiganya.

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

## 2. Warna — `@theme` di `web/src/app/globals.css`

Sengaja **tanpa warna aksen**. Warna datang dari foto.

| Token | Hex | Dipakai untuk |
|---|---|---|
| `white` | `#FBFAF7` | Latar halaman (putih pecah, bukan krem) |
| `ink` | `#1F1E1C` | Teks utama, tombol isi |
| `mute` | `#77756F` | Body text, label |
| `faint` | `#AEACA5` | Placeholder, teks tersier, tautan nonaktif |
| `line` | `#E6E4DE` | Garis tipis: pemisah section, bingkai field/form, kolom paket |
| `dark` | `#2A2926` | **Satu** section gelap hangat per halaman (Behind the camera, Values), lightbox, blok film |
| `on-dark` / `on-dark-mute` | `#F3F1EC` / `#B9B6AE` | Teks di atas `dark` |
| `error` | `#A3402F` | Hanya validasi form |

Nav saat scroll memakai kelas `.glass`: `white` 72% + `backdrop-filter: blur(18px) saturate(140%)`.

---

## 3. Tipografi

| Peran | Font | Kelas | Ukuran |
|---|---|---|---|
| Judul hero | **Cormorant Garamond** Regular, UPPERCASE, tracking 0.06em | `.t-display` | clamp 32–64px |
| Judul section | Cormorant Regular, sentence case, kata penekanan `<em>` italic | `.t-display-sm` | clamp 30–46px |
| Kutipan / pernyataan | Cormorant Italic | `.t-statement` | clamp 22–32px |
| Caption kartu | Cormorant Regular | `.t-caption` | 18–20px |
| Wordmark | Cormorant Italic (seperti tanda tangan) | `.t-wordmark` | 22px (footer 28px) |
| Label kecil | **Inter** 11px UPPERCASE tracking 0.18em | `.t-mono` | 11px |
| Body | Inter 14–15px, warna `mute` | `.t-body` | 14–15px |

Pola judul: eyebrow kecil di atas → judul serif → satu kalimat italic atau body. Selalu **rata tengah** kecuali di split section (Behind, Services, About intro).

---

## 4. Layout & komponen

| Prinsip | Nilai |
|---|---|
| Kolom | `.wrap` maks 1200px, gutter 20px / 40px |
| Komposisi | Simetris, rata tengah. Grid 3 kolom untuk kartu portrait (rasio 4:5 / 3:4), kartu tengah boleh turun 40px |
| Foto | Tanpa radius, tanpa bayangan. Hover: zoom 1.03 dalam 1,2 s |
| Section | Dipisah garis `line` 1px atau ruang 80–112px; **satu** section `dark` per halaman |
| Tombol | `.action` = kotak bergaris tipis, label `.t-mono` (isi ink saat hover); `.action-light` di atas foto/gelap; `.ink-btn` = isi arang untuk aksi utama form |
| Field | `.field` kotak 48px, garis `line`, fokus garis `ink` 2px; select dengan chevron sendiri; form dibingkai |
| Nav | Sticky. Tiga bagian: tautan · wordmark · tautan + EN/ID. Setelah 80px: 84→64px, garis tipis, latar `.glass`. Tidak pernah menghilang |
| Gerak | Reveal on-scroll (opacity + 14px, 900ms) lewat skrip pra-hidrasi; morph foto→hero halaman (React `ViewTransition`, 600ms); lightbox gelap fade 500ms; semua hormat `prefers-reduced-motion` |

Komponen kode: `SiteNav`, `SiteFooter`, `Photo` (next/image + dummy), `Reveal`, `Faq`, `Packages`, `ContactForm`, `ContactSheet` (grid Work), `Gallery` (galeri + darkroom), section Home: `Hero`, `Intro`, `Behind`, `RecentWork`, `KindWords`, `Invite`.

---

## 5. Peta halaman (kode)

1. **Home** — hero foto + judul tengah dan catatan samping → intro + 3 kartu → section gelap "behind the camera" → 3 karya terbaru → testimoni → foto lebar + undangan
2. **Work** — filter teks, grid 3 kolom portrait, caption serif
3. **Project** — hero (morph target), caption + fakta di tengah, galeri (2·3·1·2) + lightbox gelap, cerita, film, **3 karya terkait**
4. **Services** — banner, indeks 01–04, 4 blok berselang, "investment" 3 kolom, FAQ
5. **About** — potret + pernyataan, values (gelap), strip foto, fakta, CTA
6. **Contact** — kanal di tengah, foto kiri + form berbingkai
7. **404** (per-locale dan root), sitemap, robots, OG image

## 6. Peta layar di Figma (arah pertama — usang)

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
