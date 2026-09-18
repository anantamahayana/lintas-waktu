# Lintas Waktu — Brief Perencanaan Website & Brand

Versi 0.2 · 18 September 2026 · Status: draft — konteks brand diperbarui

---

## 1. Ringkasan

**Lintas Waktu** adalah brand jasa fotografi & videografi berbasis di Bali yang sedang dibangun. Proyek ini membuat **satu website** dengan dua sisi:

| Sisi | Untuk siapa | Tujuan |
|---|---|---|
| **Publik** (portofolio) | Calon klien | Menampilkan karya, layanan, harga, dan mengubah pengunjung menjadi *inquiry* (WhatsApp / form) |
| **Admin** (privat) | Tim Lintas Waktu | Mengelola konten portofolio **dan** menjalankan *client proofing* — fitur pilih foto dari Google Drive yang sudah ada di `photo-selection-platform` |

Aset yang sudah ada dan akan dipakai ulang: `D:\TEST YUKTI\photo-selection-platform` (FastAPI + React) — alur sesi, galeri klien ber-PIN, proxy & cache gambar Drive, export XMP/CSV, branding studio.

---

## 2. Brand

### 2.1 Nama & makna
*Lintas Waktu* = "melintasi waktu". Ini modal besar: brand ini bukan tentang "foto bagus", tapi tentang **momen yang tetap hidup setelah waktunya lewat**. Semua bahasa brand harus berangkat dari sini.

### 2.2 Positioning (usulan)
> Studio foto & video di Bali yang bekerja pelan, dengan intensi — merekam momen agar bisa dikunjungi kembali, bukan sekadar disimpan.

Nada: **tenang, editorial, hangat, tidak berlebihan**. Bukan "wedding vendor" yang ramai, bukan agensi korporat yang dingin. Referensi *16th Hole* di folder Web Reference menangkap nada ini dengan tepat: kalimat pendek, jeda, satu frasa dihighlight italic.

### 2.3 Skala saat ini vs. visi
**Saat ini:** Lintas Waktu berjalan **independen sebagai fotografer & videografer freelance**. Bukan studio, bukan agensi — dan itu justru jadi cerita: klien berhadapan langsung dengan orang yang memotret, dari obrolan pertama sampai file diterima.

**Visi (tidak ditampilkan dulu):** *Studio* dan *Creative* adalah lini masa depan. Website dirancang agar keduanya bisa ditambahkan nanti tanpa mengubah struktur (navigasi & data model sudah mengakomodasi "lini layanan"), tapi **tidak muncul di situs** sampai ada karya dan kapasitasnya.

Nama yang dipakai di situs: **Lintas Waktu** saja (tanpa suffix). Deskriptor di bawahnya: *Photography & Film · Bali*.

### 2.4 Spesialisasi (sekarang)
| Kategori | Cakupan | Catatan |
|---|---|---|
| **Wedding** | Foto + video hari-H, intimate/elopement, resepsi | Produk utama; pasar destination wedding Bali besar & internasional |
| **Pre-wedding** | Sesi foto/video sebelum hari-H, lokasi Bali | Sering jadi pintu masuk klien luar negeri |
| **Event** | Dokumentasi acara: korporat, komunitas, perayaan | |
| **Personal** | Personal branding, graduation, keluarga, portrait | Pasar lokal & mahasiswa/profesional |

Di situs, empat kategori ini menjadi filter portofolio dan empat halaman/section layanan. Video dan foto **tidak dipisah** sebagai kategori — keduanya melekat di tiap kategori (contoh: "Wedding — photo, film, atau keduanya").

### 2.5 Target klien
- **Lokal (Bali & Indonesia):** wedding, event, personal.
- **Internasional (visi, disiapkan dari awal):** destination wedding, elopement, dan pre-wedding di Bali dari klien luar negeri (Australia, Eropa, Asia Timur adalah pasar terbesar Bali).

Konsekuensi langsung untuk website:
- **Dwibahasa: Inggris sebagai bahasa utama, Indonesia sebagai kedua.** Klien luar negeri mencari dalam bahasa Inggris; klien lokal mengerti keduanya.
- Harga ditampilkan dengan pilihan **IDR / USD** (kurs ditulis sebagai kisaran, bukan konversi real-time).
- Halaman khusus *"Getting married in Bali"* (fase berikut) sebagai landing SEO untuk pencarian internasional.
- Kontak: WhatsApp tetap utama (dipakai luas oleh turis), ditambah email dan form dengan pilihan zona waktu / tanggal fleksibel.

### 2.6 Arah visual (dari Web Reference)
Benang merah dari 11 gambar referensi:

| Elemen | Arahan |
|---|---|
| **Warna** | Kertas hangat (*bone/cream* `#F5F2EA`–`#EFEBE0`), tinta gelap (*charcoal* `#1C1B18`), aksen **hijau tua** (`#2F4A3A`, dari 16th Hole & WS/) dan **olive pudar** untuk highlight teks (`#DCD9C6`). Latar luar kartu abu-sage lembut (`#C9CAB9`). Hindari pink/pastel wedding-template (referensi Golden Memories dipakai untuk **struktur halaman**, bukan warnanya). |
| **Tipografi** | Display **serif** dengan italic ekspresif (kandidat gratis: *Instrument Serif*, *Fraunces*, *Cormorant Garamond*) + body **sans netral** (*Inter* / *Geist*). Eyebrow kecil uppercase dengan tracking lebar. |
| **Wordmark** | Belum ada logo → identitas dimulai dari **wordmark tipografi**: "Lintas Waktu" dalam serif display, dua kata dipisah spasi lebar atau ditumpuk dua baris, dengan deskriptor kecil *Photography & Film · Bali*. Dipakai di header, footer, galeri klien, dan watermark ringan. Logo simbolik menyusul saat brand sudah punya bentuk. |
| **Tata letak** | Halaman terasa seperti **kartu kertas** di atas latar sage (lihat 16th Hole). Banyak ruang kosong. Grid foto tidak rata: tinggi berbeda, sedikit miring/berjenjang, sudut membulat kecil. |
| **Gambar** | Foto adalah kontennya; UI harus mundur. Rasio campur (portrait dominan). Hover halus, tanpa efek berlebihan. |
| **Gerak** | Scroll-reveal lembut, marquee/ticker teks tipis, kurva garis halus sebagai pemisah section (ref. "The Pace"). |
| **Suara teks** | Headline dua baris: pernyataan + frasa italic yang dihighlight. Contoh: *"Momen berlalu. **Fotonya tidak.**"* |

Sudah ada fondasi ini di `photo-selection-platform/frontend/src/index.css` (token `paper`, `ink`, `line`, `mute`, `eyebrow`, tombol pill). Sistem desain web publik akan **memperluas** token ini, bukan mengganti — supaya galeri klien dan web publik terasa satu brand.

---

## 3. Website Publik

### 3.1 Sitemap (MVP)
```
/                 Beranda — hero, karya pilihan, layanan, proses, testimoni, CTA
/work             Portofolio — filter: wedding, pre-wedding, event, personal
/work/[slug]      Detail proyek — cerita singkat, galeri, film (embed), lokasi
/services         Empat kategori + paket & harga "starting from" (IDR/USD)
/about            Cerita Lintas Waktu, siapa di balik kamera, cara kerja
/contact          Form inquiry + WhatsApp + Instagram
/id/*             Versi Bahasa Indonesia dari semua halaman di atas
/g/[slug]         Galeri klien (proofing) — sudah ada, dipindahkan
/admin/*          Panel admin — sudah ada, diperluas
```
Fase berikut: `/journal` (blog/SEO), `/faq`, `/bali-wedding` (landing internasional), dan halaman lini *Studio* / *Creative* saat sudah ada.

### 3.2 Struktur beranda
1. **Hero** — wordmark, headline serif 2 baris + eyebrow "Photography & Film · Bali" + satu CTA "Start a conversation". Di bawahnya strip foto berjenjang (ref. 16th Hole hero).
2. **Karya pilihan** — 6–8 proyek, grid tak rata, campuran empat kategori.
3. **Layanan** — 4 kartu (Wedding / Pre-wedding / Event / Personal) di atas foto gelap (ref. strip hijau "Dawn tee times").
4. **Siapa di balik kamera** — section pendek: klien bekerja langsung dengan orang yang memotret, bukan tim vendor. Ini pembeda dari studio besar.
5. **Cara kerja** — 4 langkah di sepanjang garis kurva: *Conversation → The day → Choose your photos (proofing) → Delivery*. Ini sekaligus menjual fitur proofing sebagai keunggulan.
6. **Testimoni** — sedikit, ditulis besar.
7. **Paket** — "starting from" per kategori, toggle IDR/USD, tanpa kesan menu restoran.
8. **CTA penutup + footer** — email, WA, IG, lokasi, pilih bahasa EN/ID.

### 3.3 Konversi
- Tombol WhatsApp melekat (mobile) dengan pesan pra-isi (EN/ID mengikuti bahasa halaman).
- Form inquiry: nama, asal negara/kota, kategori, tanggal, lokasi di Bali, kisaran budget (IDR/USD), pesan → tersimpan di admin + notifikasi email/Telegram.
- Semua CTA satu nada: "Start a conversation" / "Mulai obrolan", bukan "Book now".

### 3.4 SEO & performa (penting untuk portofolio)
- Render di server (bukan SPA murni) agar Google & preview link WhatsApp/IG membaca konten.
- Gambar via `next/image`, format WebP/AVIF, lazy, ukuran responsif.
- Meta OG per proyek, sitemap.xml, schema `LocalBusiness` + `Photograph`.
- Target Lighthouse ≥ 90 mobile.

---

## 4. Admin

Panel yang sudah ada (Dashboard, Sesi, Settings) diperluas menjadi:

| Modul | Status | Keterangan |
|---|---|---|
| Login | ada | Password tunggal → JWT. Cukup untuk sekarang; multi-user nanti. |
| Sesi proofing | ada | Buat sesi dari folder Drive, PIN, kuota, export XMP/CSV, reopen, sync. |
| Branding studio | ada | Diperluas jadi **Pengaturan Situs**: tagline, kontak, sosial, SEO default. |
| **Proyek portofolio** | baru | Judul, slug, kategori, cover, cerita, kredit, urutan, publish/draft. Galeri diambil **dari folder Google Drive** memakai proxy+cache yang sudah ada → tidak perlu upload manual. |
| **Layanan & paket** | baru | Kategori, deskripsi, harga "starting from" IDR + USD, poin-poin, urutan. Data model punya kolom `line` (visual/studio/creative) yang sekarang selalu `visual` — disiapkan untuk visi nanti. |
| **Inquiry** | baru | Masuk dari form kontak; status (baru / dibalas / deal / tutup), catatan. |
| **Testimoni** | baru | Nama, kutipan, proyek terkait. |

---

## 5. Arsitektur & Teknologi

### 5.1 Keputusan utama: satu repo, frontend Next.js, backend FastAPI tetap

```
lintas-waktu/
  web/        Next.js 15 (App Router) + Tailwind + next-intl (EN/ID) — publik, /g/[slug], /admin
  api/        FastAPI (dari photo-selection-platform, diperluas) — Postgres
  docs/       brief, keputusan desain, changelog
```

**Kenapa Next.js, bukan lanjut Vite SPA?** Web publik butuh SSR/SSG untuk SEO dan preview link; Vite SPA tidak memberi itu tanpa kerja ekstra. Halaman admin & galeri klien yang ada adalah komponen React biasa (`react-router` → `app/` routes), jadi **dipindahkan, bukan ditulis ulang**. Yang berubah hanya routing dan cara panggil API.

**Kenapa FastAPI tetap?** Semua logika berat (Drive API, cache thumbnail Pillow, XMP) sudah jadi dan teruji. Menulis ulang ke Node tidak menambah nilai. Cukup tambah model & router baru.

### 5.2 Data (tambahan pada `models.py`)
`Project`, `ProjectImage` (file_id Drive + urutan), `Service`, `Package`, `Inquiry`, `Testimonial`, `SiteSettings` (perluasan `Branding`). Semua teks tampil punya kolom `_en` dan `_id`.

### 5.3 Gambar publik
Pakai ulang `drive_service` + cache: tambah ukuran `hero` (2560px) dan `card` (1200px), plus endpoint publik `/api/public/img/{file_id}?size=` dengan cache header panjang. Untuk produksi, cache di disk persisten (volume) atau di depan diberi CDN (Cloudflare). Alternatif jika Drive terasa lambat: Cloudflare R2 (gratis 10GB) — diputuskan setelah uji beban.

### 5.4 Deploy (biaya ~nol di awal)
- `web` → Vercel (gratis).
- `api` → Railway / Fly.io (tier kecil) + Postgres; volume untuk cache.
- Domain: `lintaswaktu.id` / `.com` / `.studio` — cek ketersediaan.
- Email transaksional: Resend (gratis 3k/bulan) untuk notifikasi inquiry.

---

## 6. Fase Pengerjaan

| Fase | Isi | Hasil |
|---|---|---|
| **0 · Fondasi brand** (1 minggu) | Finalisasi positioning, palet & font final, **wordmark tipografi**, moodboard, 5–10 kalimat copy inti dalam EN & ID | `docs/BRAND.md` + token desain + wordmark SVG |
| **1 · Web publik MVP** (2–3 minggu) | Setup repo Next.js + i18n EN/ID, sistem desain, halaman: home, work, work detail, services, about, contact. Konten sementara dari data statis (JSON) | Situs bisa dilihat & dishare |
| **2 · Backend & admin konten** (1–2 minggu) | Model & router baru di FastAPI, pindahkan admin ke Next.js, modul proyek/layanan/inquiry/testimoni | Konten dikelola tanpa sentuh kode |
| **3 · Integrasi proofing** (1 minggu) | Pindahkan `/g/[slug]` + sesi admin, satukan branding dengan pengaturan situs | Satu domain, satu login, satu brand |
| **4 · Poles & rilis** (1 minggu) | SEO, OG, performa, aksesibilitas, analitik (Umami/Plausible), deploy, domain | Live |

Fase 1 bisa dimulai **paralel** dengan fase 0 selama palet & font sudah disepakati.

---

## 7. Keputusan yang sudah diambil

| Topik | Keputusan |
|---|---|
| Nama di situs | **Lintas Waktu** (tanpa suffix). *Studio* / *Creative* = visi masa depan, tidak ditampilkan. |
| Skala | Fotografer & videografer **freelance independen**; ini bagian dari cerita brand. |
| Spesialisasi | Wedding · Pre-wedding · Event · Personal (personal branding, graduation, dll.) |
| Target | Lokal + internasional (destination wedding / pre-wedding di Bali). |
| Bahasa | Dwibahasa, **Inggris utama, Indonesia kedua**. |
| Logo | Belum ada → **wordmark tipografi**. |

## 7b. Masih perlu dari kamu

1. **Paket & harga** nyata per kategori (kisaran "starting from" dalam IDR cukup; USD aku turunkan).
2. **Karya awal:** minimal 6 proyek dengan foto siap (folder Drive per proyek sudah cukup).
3. **Kontak utama:** nomor WA, email, IG, area layanan (Bali saja, atau bersedia ke luar Bali?).
4. **Domain** yang diinginkan (`lintaswaktu.com` paling aman untuk klien internasional).
5. **Nama orang di balik kamera** untuk halaman About — ditampilkan sebagai individu, atau tetap "Lintas Waktu"?

---

## 8. Langkah berikutnya

Menunggu lampu hijau. Saat dimulai, urutannya:
1. `docs/BRAND.md` — palet, font, wordmark, copy inti EN/ID, contoh headline.
2. Inisialisasi `web/` (Next.js + Tailwind + i18n) dengan token desain, lalu **home** sebagai halaman pertama untuk direview visual.
