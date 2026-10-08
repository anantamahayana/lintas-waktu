# Lintas Waktu — Brand & Design System

Versi 1.0 · 19 September 2026 · Arah: **Classic editorial** (arah ketiga, dipilih setelah dua prototipe)
Sumber kebenaran: **kode di `web/`** (`src/app/globals.css`, komponen). File Figma masih menggambarkan arah pertama dan **belum diperbarui** — jangan dijadikan acuan sampai disinkronkan.

> Riwayat arah: (1) krem/serif/kartu — `c46f177`; (2) "light table" putih + garis waktu — `fb8c95f`; (3) classic editorial — `494d794` dan seterusnya. Fondasi teknis sama untuk ketiganya.

---

## 1. Identitas

| | |
|---|---|
| Nama | **Lintas Waktu** di situs dan wordmark. **Lintas Waktu Visual** boleh untuk domain (`lintaswaktuvisual.com`), handle (`@lintaswaktuvisual`), dokumen resmi, dan saat perlu dibedakan dari nama lain. *Studio* / *Creative* adalah visi masa depan: jangan menyebut diri "studio" |
| Deskriptor | *Photography & Film · Bali* (ID: *Fotografi & Film · Bali*) |
| Makna | "melintasi waktu" — momen yang bisa dikunjungi kembali, bukan sekadar disimpan |
| Skala | **Duo** independen: satu fotografer + satu videografer (belum studio, belum tim). Di teks: "kami berdua", "two of us". Klien berhadapan langsung dengan dua orang yang datang di hari-H; ini bagian dari cerita, bukan kekurangan |
| Spesialisasi | Wedding · Pre-wedding · **Editorial & Model** (portofolio model, lookbook, konsep editorial) · Event · Personal (personal branding, graduation, keluarga) |
| Target | Lokal (Bali/Indonesia) + internasional (destination wedding & pre-wedding di Bali) |
| Bahasa | Inggris utama, Indonesia kedua (`/id/*`) |
| Nada | Tenang, editorial, hangat, tidak berlebihan. Kalimat pendek. Satu frasa dihighlight italic. |
| Logo | **Gerbang Waktu** (1 Okt 2026): gerbang melengkung, jalan setapak yang melintas, matahari emas. Lihat bagian **1a**. |

---

## 1a. Logo — Gerbang Waktu

Gerbang (lengkung) = pintu ke sebuah momen. Jalan yang meliuk menembusnya = waktu yang dilintasi. Matahari emas = cahaya golden hour, satu momen yang dijaga.
Panduan lengkap (ruang kosong, ukuran minimum, larangan, contoh pakai): Figma, file *Branding*, halaman **"Brand Guidelines — Gerbang Waktu"**
(`figma.com/design/Hgt0vZobid64UHcl8P8CHu`). Halaman "L Memeluk Cahaya" adalah kandidat yang tidak dipilih.

| | |
|---|---|
| Komponen kode | `web/src/components/brand/Logo.tsx`: `Logo` (berdampingan / `stacked`), `GateMark`, `Wordmark`, `BrandSprite` |
| Wordmark | **Marcellus** Regular, KAPITAL, tracking 30%. Sudah diubah jadi path SVG, jadi situs tidak memuat font Marcellus. Path-nya ada satu kali per halaman (`BrandSprite` di setiap root layout) dan dipakai lewat `<use>` |
| Versi | Warna (gerbang tinta/krem + matahari emas) · **Mono** satu warna (`mono`: matahari jadi lubang, untuk foil, cap, emboss) |
| Ukuran minimum | Gerbang 20 px tinggi di layar; di bawah itu pakai favicon |
| Di atas foto/gelap | Gerbang `Krem #F3EFE7`, matahari tetap emas |
| Jangan | Bayangan, transparansi, gradien, memutar, mengganti font wordmark, mewarnai gerbang dengan emas |
| File siap pakai | `web/public/brand/`: `logo-horizontal(-light).svg`, `logo-stacked(-light).svg`, `mark(-light,-mono).svg`, `avatar-1080(-dark).png` (Instagram/WhatsApp). Juga tersedia di `https://lintaswaktuvisual.com/brand/…` |
| Ikon | `web/src/app/icon.svg` (ikut mode gelap), `apple-icon.png`, `favicon.ico`; kartu share `opengraph-image.tsx` |

**Gerak logo (1b).** Sumber di `brand/motion/` (cara render: `brand/motion/README.md`), HTML/SVG yang dirender per frame (tanpa audio):
- *Golden Hour* (3,2 dtk): langit senja → keemasan → krem, matahari terbit, tulisan tertulis kiri ke kanan. Untuk penutup Reels/Story/film.
- *Terbit* (4,6 dtk): gerbang muncul, jalan setapak terbentuk dari bawah ke cakrawala, matahari terbit di ujungnya, tulisan muncul per huruf. Ada versi overlay transparan (ProRes 4444, logo tinta untuk footage terang, krem untuk footage gelap).
- *Melintas* (3,6 dtk): kamera menyusuri jalan setapak masuk ke gerbang; jalan transparan sehingga shot pertama tampil menembusnya lalu memenuhi layar. ProRes 4444, versi light/dark.
- Di situs, *Terbit* versi CSS (`components/brand/GateIntro.tsx`, kelas `.ti-*`) membuka kartu judul galeri klien, ±2,2 dtk; hanya `transform`/`opacity`, dilewati untuk reduced motion.

Galeri klien: logo tampil kalau nama studio di Admin → Settings kosong atau "Lintas Waktu". Logo yang diunggah di sana (`logo_url`) tetap didahulukan.

---

## 2. Warna — `@theme` di `web/src/app/globals.css`

Hampir tanpa warna aksen: warna datang dari foto. Satu-satunya aksen adalah **Emas Senja** (`gold`), dan hanya untuk satu momen per layar (matahari di logo, tombol pilih di galeri klien). Bukan hiasan.

| Token | Hex | Dipakai untuk |
|---|---|---|
| `white` | `#FBFAF7` | Latar halaman (putih pecah, bukan krem) |
| `ink` | `#1F1E1C` | Teks utama, tombol isi |
| `mute` | `#66645F` | Body text, label (5,7:1, WCAG AA; dulu `#77756F`) |
| `faint` | `#75736D` | Teks tersier: nomor langkah, hak cipta, label nonaktif, placeholder (4,5:1, WCAG AA; dulu `#AEACA5`) |
| `line` | `#E6E4DE` | Garis tipis: pemisah section, bingkai field/form, kolom paket |
| `dark` | `#2A2926` | **Satu** section gelap hangat per halaman (Behind the camera, Values), lightbox, blok film |
| `on-dark` / `on-dark-mute` | `#F3F1EC` / `#B9B6AE` | Teks di atas `dark` |
| `error` | `#A3402F` | Hanya validasi form |
| `gold` | `#C8832F` | Emas Senja: matahari logo, aksen galeri klien. Satu momen per layar |
| (brand) | Krem `#F3EFE7` · Pasir `#DCD2C1` · Sawah `#6B7355` · foil `#B8862F` | Materi cetak/sosial (album, kartu, kemasan), bukan situs |

Nav saat scroll memakai kelas `.glass`: `white` 72% + `backdrop-filter: blur(18px) saturate(140%)`.

---

## 3. Tipografi

| Peran | Font | Kelas | Ukuran |
|---|---|---|---|
| Judul hero | **Cormorant Garamond** Regular, UPPERCASE, tracking 0.06em | `.t-display` | clamp 32–64px |
| Judul section | Cormorant Regular, sentence case, kata penekanan `<em>` italic | `.t-display-sm` | clamp 30–46px |
| Kutipan / pernyataan | Cormorant Italic | `.t-statement` | clamp 22–32px |
| Caption kartu | Cormorant Regular | `.t-caption` | 18–20px |
| Logo | Komponen `<Logo>` (Marcellus sebagai path). `.t-wordmark` (Cormorant Italic) hanya untuk nama studio lain di galeri klien | — | nav: tersusun dalam satu poros tengah (gerbang 24px, wordmark 10px, deskriptor); footer: tersusun, gerbang 64px |
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
