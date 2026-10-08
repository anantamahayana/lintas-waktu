# Rencana perbaikan — galeri klien besar (±800 foto)

25 September 2026 · Masalah: galeri klien dengan 784 foto terasa berat, terutama di iPhone/Safari.
Dugaan penyebab dari sesi desktop sudah dicek terhadap kode; hasilnya di kolom "Status di kode".

## Penyebab

| # | Dugaan | Status di kode |
|---|---|---|
| 1 | Foto kecil baru dibuat saat klien pertama membuka | **Sebagian sudah ditangani.** Saat sesi dibuat/di-sync, `warm_cache` langsung memproses semua thumbnail lalu versi besar (`api/app/services/drive_service.py`), dan admin menampilkan *Preparing gallery… x / y* (`web/src/app/admin/sessions/[id]/page.tsx`). Celah: lihat 1a–1c di bawah. |
| 2 | Jalur gambar memutar: HP → Vercel → Railway → Drive | **Benar.** `NEXT_PUBLIC_API_URL` kosong → `gapi.img()` memakai origin yang sama → lewat rewrite `/api/*` di `web/next.config.ts`. |
| 3 | 784 kotak foto dipasang sekaligus | **Benar, ini celah terbesar.** `ClientGallery.tsx` me-render `visible.map(...)` untuk semua foto; hanya `<img loading="lazy">`, tanpa virtualisasi. |
| 4 | Server Railway kecil | Relevan: warming memakai 6 thread per galeri, dan setelah thumbnail juga membuat versi 2560 px untuk semua foto. |

## Langkah

### 1. Pastikan foto sudah siap sebelum link dikirim — 1b & 1c ✅, 1a menunggu cek Railway
- **1a. Cache harus di volume Railway.** `cache_dir` default-nya `api/cache` di dalam container. Kalau `CACHE_DIR` tidak diarahkan ke volume, setiap deploy/restart menghapus semua foto kecil dan galeri kembali dingin. → Set `CACHE_DIR` ke path volume dan catat di `api/.env.example`. *Cek dulu di dashboard Railway.*
- **1b. Warming lanjut setelah restart.** ✅ `resume_warming` di `api/app/main.py`: saat API start, galeri yang masih *pending* dan belum lengkap diproses lagi, satu folder per waktu; foto yang sudah ada di disk dilewati.
- **1c. Peringatan saat membagikan.** ✅ *Copy link* dan *Send via WhatsApp* menampilkan dialog "Gallery still preparing" selama thumbnail belum 100%; fotografer tetap bisa memilih *Share anyway*.

### 2. Hanya foto yang terlihat yang dipasang (prioritas utama) — ✅ selesai
- `WindowedGrid` di `web/src/components/gallery/ClientGallery.tsx`, tanpa library tambahan: hanya baris di sekitar layar yang dipasang (satu layar di atas, dua di bawah), sisanya jadi padding setinggi baris aslinya. Kolom dan jarak dibaca dari CSS Tailwind yang sama.
- Diuji di Chromium ukuran iPhone 13 dan desktop dengan galeri mock 800 foto: 10–32 kotak terpasang (dulu 800), tinggi halaman tetap, lightbox membuka foto yang benar.
- Masih perlu dicoba di iPhone sungguhan (Safari).

### 3. Gambar langsung dari Railway, tidak lewat Vercel
- Hanya untuk endpoint gambar: `gapi.img()` memakai URL publik API, request data tetap lewat rewrite.
- Cek dulu: apakah URL gambar membawa token/PIN di query (bukan cookie), dan CORS tidak dibutuhkan untuk `<img>`.

### 4. Thumbnail WebP, ukuran pas layar HP
- `_resize` sekarang JPEG q88, 640 px. → WebP (±30–50% lebih kecil); sesuaikan `media_type` dan nama file cache (ekstensi baru agar cache JPEG lama tidak tertukar).
- Pertimbangkan `srcset` 320/640 px untuk grid 2 kolom di HP.

### 5. CDN (opsional, nanti)
- Cloudflare di depan domain setelah domain terdaftar. Header `Cache-Control` gambar galeri sekarang `private` → tidak di-cache CDN; perlu dipikirkan karena galeri dilindungi PIN.

## Urutan kerja
1. **1a** (cek konfigurasi, hampir tanpa kode) dan **2** — paling terasa bagi klien, tanpa biaya.
2. **1b, 1c**, lalu **3** dan **4**.
3. **5** setelah domain ada.

## Terkait: pilihan klien tersimpan dan tersinkron di semua perangkat — ✅ selesai
- Draf punya nomor versi di server (`draft_version`). Setiap simpan menyebut versi yang jadi dasarnya; kalau perangkat lain sudah menyimpan lebih dulu, server menjawab 412 berisi draf terbaru, lalu galeri menggabungkan: pilihan perangkat lain dipertahankan, perubahan perangkat ini (tambah/hapus pilihan, tanda, catatan) diterapkan di atasnya.
- Galeri yang sedang terbuka mengambil draf terbaru (`GET /api/gallery/{slug}/draft`) saat tab kembali aktif, saat fokus, dan tiap 12 detik — tanpa reload.
- Perubahan yang belum terkirim disimpan di perangkat (`localDraft`) dan dipulihkan hanya kalau server masih di versi yang sama; kalau perangkat lain sudah menyimpan, server yang dipakai — pilihan yang sudah dihapus tidak muncul lagi.
- Dikirim seketika saat halaman ditinggalkan (`keepalive`), dikirim ulang saat online kembali.
- Diuji: laptop memilih → HP yang tab-nya terbuka ikut berubah dalam ±12 detik; dua perangkat memilih bersamaan → digabung; perangkat ketiga melihat hasil yang sama. Tes API: `api/tests/test_draft_sync.py`.

## UI galeri klien (25 Sep 2026) — ✅ tahap 1
- Grid mengikuti bentuk foto: baris rata (justified), portrait sempit, landscape lebar; urutan foto tetap. Bentuk dibaca dari thumbnail yang sudah diputar sesuai EXIF (`display_size`), cadangan dari metadata Drive + `rotation`.
- Filter (Semua / Pilihan / Ditandai) pindah ke bilah atas yang menempel; tombol album muncul setelah beberapa pilihan.
- Bilah bawah jadi satu baris ramping (cincin progres, status, Kirim), selalu tampil (sticky).
- Tombol di foto: area sentuh 44 px, tampilan kecil transparan; di desktop muncul saat hover.
- Lightbox: geser kiri/kanan dengan foto berikutnya ikut masuk, geser ke bawah untuk menutup, ketuk dua kali / cubit untuk zoom (geser untuk melihat sekitar), ketuk sekali untuk menyembunyikan tombol; thumbnail tampil dulu, foto besar menyusul.
- Umpan balik kecil: centang "pop", angka mengangguk, getar singkat (Android) saat memilih.

## Teks situs bisa diedit di admin (25 Sep 2026) — ✅
- Admin → **Site text**: semua teks halaman publik (Home, Packages, Services, About, Contact, Work, menu & footer, SEO) dalam EN dan ID berdampingan; daftar (paket, FAQ, nilai, fakta) bisa ditambah, dihapus, diurutkan.
- Teks bawaan tetap di `web/messages/{en,id}.json`; yang diubah admin disimpan di API (`settings`: `copy.en`, `copy.id`) hanya bagian yang berbeda, lalu digabung saat render (`web/src/lib/copy.ts`, `web/src/i18n/request.ts`). Situs ter-update lewat revalidasi yang sama dengan proyek.
- Paket & harga pindah dari kode (`Packages.tsx`) ke teks situs; harga teks bebas per mata uang (IDR/USD).
- 41 teks sisa desain lama yang tidak dipakai halaman mana pun dihapus dari `messages`.
- Belum: menambah/menyembunyikan bagian halaman (tahap berikutnya kalau perlu).

## Bingkai foto situs (27 Sep 2026) — ✅
- Galeri proyek (Work → proyek): setiap foto tampil utuh sesuai bentuk aslinya; baris rata (flex-grow = rasio), HP maks 2 per baris.
- Admin → Site images → "framing" per slot, dan Project → Cover → "Adjust framing": titik fokus (ketuk/geser), zoom 100–250%, pratinjau bentuk kotak nyata (komputer/HP); "Show whole photo" untuk slot yang tata letaknya mengizinkan (kartu Home, Behind, CTA, About, Services, Contact). Hero & banner selalu mengisi bingkai.
- Disimpan: `site.images_frames` (settings) dan `projects.cover_frame`; ganti foto di slot = bingkai kembali ke tengah.

## Detail visual (29 Sep 2026) — tahap 1 ✅ · tahap 2 ✅ · tahap 3 ditunda (belum penting, kata pemilik)
Detail kecil yang bercerita soal waktu, cahaya, dan cetakan, dengan syarat performa di `CLAUDE.md` ("Performa dulu").

| Tahap | Isi |
|---|---|
| 1 | Jam Bali + golden hour hari ini (footer, Contact) · foto "dicetak" saat muncul · baris teks rapi (tanpa kata yatim, judul seimbang) · penanda waktu (garis + titik) · penutup footer "Dibuat pelan-pelan di Bali" + "Kembali ke awal" |
| 2 | Cap pos saat form Contact terkirim · halaman 404 "Momen ini sudah lewat" · huruf awal besar & kutipan besar di cerita proyek · hero bergerak sangat pelan · garis progres baca |
| 3 | Data kamera (lensa, f, rana, ISO) dari Drive di foto proyek · kursor "Lihat" di desktop · butiran & bingkai sinema di kartu film · nomor bingkai ala lembar kontak di Work |

Garis bawah link yang tergambar dari kiri sudah ada (`.link`).

### Cara mengukur
```bash
cd web && npx next build && npx next start -p 3000        # API lokal di :8000
CHROME_PATH=<chromium> npx -y lighthouse@12 http://localhost:3000/id \
  --only-categories=performance --form-factor=mobile --chrome-flags="--headless=new" --output=json
```
Jalankan 2–3 kali per halaman (run pertama setelah start selalu lebih lambat). Foto contoh tidak termuat di lingkungan tes,
jadi angka LCP lokal lebih rendah dari aslinya; yang dibandingkan terutama skor, TBT, CLS, dan ukuran JS.

### Patokan sebelum tahap 1 (Lighthouse mobile, build produksi lokal)
| Halaman | Skor | TBT | CLS | JS |
|---|---|---|---|---|
| /id | 91–98 | 60–140 ms | 0 | 188 KB |
| /id/about | 94–97 | 50–70 ms | 0 | 188 KB |
| /id/services | 93–97 | 70–120 ms | 0 | 188 KB |
| /id/work | 90–95 | 50–230 ms | 0 | 188 KB |
| /id/contact | 94–98 | 60–70 ms | 0 | 196 KB |

### Setelah tahap 1
| Halaman | Skor | TBT | CLS | JS |
|---|---|---|---|---|
| /id | 93–94 | 60–90 ms | 0 | 189 KB |
| /id/about | 95 | 50 ms | 0 | 189 KB |
| /id/services | 93–96 | 120 ms | 0 | 189 KB |
| /id/work | 94–95 | 50–60 ms | 0 | 189 KB |
| /id/contact | 93 | 80 ms | 0 | 197 KB |

Tambahan JS ±1 KB (jam Bali, tombol ke atas). Pergeseran kecil di Contact (CLS 0,006) sempat muncul lalu diperbaiki:
blok jam dirender tak terlihat dengan ukuran akhirnya sejak awal.

### Tahap 2 (dengan 12 proyek contoh di database lokal, jadi angka beranda tidak bisa dibandingkan dengan tabel di atas)
| Halaman | Sebelum tahap 2 | Sesudah | CLS | JS |
|---|---|---|---|---|
| /id | 74*–89, TBT 200–400 ms | 91–96, TBT 120–170 ms | 0 | 189 KB (sama) |
| /id/work/ayu-marco | 83–89, TBT 150–380 ms | 93–94, TBT 140 ms | 0 | 198 KB (sama) |
| /id/contact | 93–97, TBT 80–120 ms | 93–94, TBT 60–100 ms | 0 | 197 KB (sama) |

\* run pertama setelah server menyala. Semua efek tahap 2 CSS/SVG; garis progres baca memakai scroll timeline bawaan browser (tanpa JS).
Halaman 404 tidak bisa diukur Lighthouse (status 404), dicek visual.

## Logo baru: Gerbang Waktu (1 Okt 2026) — ✅
Logo dipasang di nav, menu HP, footer (tersusun), galeri klien (intro, PIN, terima kasih), admin, login admin, cek invoice, kop invoice;
favicon/ikon/apple-icon, kartu share, dan file unduhan di `web/public/brand/`. Wordmark berupa path SVG (tanpa font baru), satu kali per halaman.

| Halaman | Sebelum | Sesudah | CLS | JS |
|---|---|---|---|---|
| /id | 94–96, TBT 60–180 ms | 94–96, TBT 20–30 ms | 0 | 178 → 180 KB |
| /id/work/ayu-marco | 93–96, TBT 70–80 ms | 96, TBT 40–80 ms | 0 | 184 → 185 KB |
| /id/contact | 94–95, TBT 20–90 ms | 93–96, TBT 10–70 ms | 0 | 183 → 184 KB |

Diukur dengan `next build --webpack` (lingkungan tes tidak bisa mengunduh Google Fonts untuk Turbopack), jadi angka JS tidak bisa
dibandingkan langsung dengan tabel di atas. Yang dibandingkan: sebelum vs sesudah pada build yang sama. Tambahan ±1–2 KB = bentuk gerbang di nav.

## Beranda lebih lengkap (5 Okt 2026) — ✅
Urutan: Hero · Pengantar + 3 kartu · Di balik kamera · Karya terbaru (hanya jika ada proyek) · **Cara kami bekerja** · **Paket & harga** ·
Testimoni · **FAQ (4)** · Ajakan + **cek tanggal** (form GET tanpa JS → `/contact?kind=wedding&date=YYYY-MM-DD`).
Lighthouse mobile /id: 96, TBT 40–60 ms, CLS 0, JS 180 → 182 KB (akordeon FAQ). Ide berikutnya kalau perlu: testimoni lebih dari satu, kalender ketersediaan per bulan.

## Pemeriksaan keamanan (8 Okt 2026) — ✅
**Diperbaiki:** Next.js 16.3.8 (RCE `next/og`, cache poisoning, SSRF image optimizer), sharp, source-map-js; API: Pillow 12.3,
FastAPI 0.142/Starlette 1.7, python-multipart 0.0.32, uvicorn 0.54, lxml 6.1, python-dotenv 1.2, pytest 9; python-jose → PyJWT.
Logo SVG unggahan disajikan dengan CSP `sandbox` + nosniff. Peringatan saat start kalau `SECRET_KEY` < 32 karakter.
**Sudah aman (dicek):** password admin PBKDF2 200k; slug galeri 72 bit acak, token invoice 144 bit, kode verifikasi HMAC;
cache foto bernama hash (tanpa path traversal); proxy foto publik hanya folder proyek terbit + folder situs (ada tesnya);
batas PIN per galeri 10/15 mnt dan login 20/15 mnt total, tersimpan di DB.
**Catatan (risiko rendah, belum diubah):**
- Alamat pengunjung untuk batas PIN/login dibaca dari X-Forwarded-For (`--proxy-headers`); siapa pun yang memanggil URL Railway
  langsung bisa memalsukannya. Hanya batas per-pengunjung yang lolos; batas per-galeri/total tetap berlaku. Perbaikan penuh:
  Railway hanya menerima dari Vercel (shared secret header), atau batasi `--forwarded-allow-ips`.
- `/verify` membedakan "nomor tidak dikenal" dan "kode tidak cocok", jadi nomor invoice bisa ditebak ada/tidak (nomornya memang berurutan).
- 20 peringatan lint lama di web (bukan error).
