# Konteks proyek — baca ini dulu

Untuk siapa pun (dan Claude siapa pun) yang baru ikut mengerjakan repo ini. Per 28 September 2026.
Aturan kerja ada di `CLAUDE.md`; apa yang berubah belakangan ada di `docs/CHANGELOG.md`.

## Apa ini
**Lintas Waktu** (domain/handle: Lintas Waktu Visual): duo independen di Bali, satu fotografer + satu videografer, bukan studio.
Layanan: wedding, pre-wedding, editorial & model, event, personal.
Satu website dengan tiga sisi:

| Sisi | Alamat | Untuk |
|---|---|---|
| Situs publik | https://www.lintaswaktuvisual.com (EN di `/`, ID di `/id`) | Calon klien: portofolio, layanan, paket, kontak |
| Admin | `/admin` | Pemilik: sesi pemilihan foto, kalender, invoice, proyek, semua teks & foto situs |
| Galeri klien | `/g/<slug>` (ber-PIN) | Klien memilih foto dari Google Drive, lalu mengirim pilihannya |
| Invoice klien | `/i/<token>`, verifikasi `/verify/<nomor>` | Klien melihat/cetak invoice; siapa pun bisa cek keaslian |

Asal-usul: backend diambil dari repo `photo-selection-platform` (milik Yukti). **Jangan pernah push ke repo itu.**

## Arsitektur
```
browser ──► Vercel (Next.js 16, web/) ──rewrite /api/*──► Railway (FastAPI, api/) ──► Google Drive
                                                             └─ SQLite + cache foto di volume /data
```
- `main` = produksi. Push ke `main` → Vercel dan Railway deploy otomatis. Tidak ada staging.
- Browser selalu memanggil `/api/...` di domain yang sama; `web/next.config.ts` meneruskannya ke Railway (`API_URL`).
- Setelah admin menyimpan sesuatu, API memanggil `/api/revalidate` di Vercel → situs ter-update (cache 60 detik).
- Detail env var, domain, DNS (Cloudflare), email: `docs/DEPLOYMENT.md`.

## Peta kode
**`api/`: FastAPI + SQLAlchemy + SQLite** (tanpa Alembic: `migrate()` di `app/database.py` menambah kolom baru saat start)
- `app/main.py`: app, router, pemanasan cache saat start, pembersihan disk.
- `app/routers/admin.py`: sesi pemilihan foto (buat, sync Drive, PIN, export XMP/CSV).
- `app/routers/gallery.py`: API galeri klien (`/api/gallery/{slug}`): unlock PIN, draf pilihan tersinkron antarperangkat, kirim.
- `app/services/drive_service.py`: daftar foto Drive, thumbnail/versi besar, cache di disk dengan cadangan ruang.
- `app/content/`: semua yang untuk website: proyek (`models.py`), pengaturan situs (`settings_store.py`), teks situs (`copy_store.py`), foto halaman (`site_images.py`), invoice, kalender (`bookings.py`), router publik & admin.
- `tests/`: pytest, DB sementara + Drive palsu (`conftest.py`).

**`web/`: Next.js 16 App Router + next-intl + Tailwind 4** (baca `web/AGENTS.md`: Next 16 berbeda dari yang umum diketahui)
- `src/app/[locale]/…`: halaman publik (home, work, work/[slug], services, about, contact).
- `src/app/admin/…`: panel admin; menu di `src/components/admin/AdminShell.tsx`.
- `src/app/g/[slug]` + `src/components/gallery/ClientGallery.tsx`: galeri klien (grid baris rata yang hanya memasang baris dekat layar, lightbox dengan gestur, pratinjau album).
- `messages/{en,id}.json`: teks bawaan situs. Admin → *Site text* menyimpan hanya bagian yang diubah; digabung saat render (`src/lib/copy.ts`, `src/i18n/request.ts`).
- `src/lib/content.ts`: mengambil proyek/pengaturan/foto dari API untuk halaman publik.
- `src/lib/admin-api.ts`, `src/lib/gallery-api.ts`: klien API untuk admin dan galeri.
- `src/lib/frame.ts` + `src/components/admin/FrameEditor.tsx`: pengaturan bingkai foto (titik fokus, zoom, tampil utuh).

## Menjalankan di lokal
```bash
# API — tanpa kredensial Google, API jalan dalam mode mock (24 foto contoh)
cd api && python -m venv .venv && .venv/bin/pip install -r requirements.txt   # Windows: .venv\Scripts\
cp .env.example .env            # isi ADMIN_PASSWORD & SECRET_KEY sendiri
.venv/bin/python -m uvicorn app.main:app --reload --port 8000

# Web
cd web && npm install && npm run dev   # http://localhost:3000, admin di /admin
```
Web lokal tidak butuh `.env.local`: tanpa `API_URL` ia memakai `http://localhost:8000`.
Opsional: `REVALIDATE_SECRET` (sama dengan `api/.env`) agar edit admin langsung tampil, bukan setelah 60 detik.
Data contoh portofolio: `cd api && .venv/bin/python -m app.content.seed`.

## Cek sebelum commit
```bash
cd api && .venv/bin/python -m pytest -q      # semua harus lulus
cd web && npx tsc --noEmit && npm run lint   # 1 warning <img> lama boleh diabaikan
```
Untuk perubahan tampilan, buka halamannya dan lihat sendiri (lebar HP ±390 px dan desktop).

## Keputusan yang sudah diambil (jangan diubah tanpa tanya pemilik)
- **Desain**: acuannya kode di `web/` + `docs/BRAND.md` (classic editorial, tanpa warna aksen, Instrument Serif). Figma usang. Animasi elegan tapi ringan.
- **Brand**: sebutan mengikuti `docs/BRAND.md`: duo independen, bukan "studio"; nama di situs "Lintas Waktu". Editorial & Model adalah kategori resmi (29 Sep 2026).
- **Harga** (29 Sep 2026): tingkat freelancer pemula, Rp 500 rb – 5 jt, untuk membangun portofolio dulu. Paket wedding Essential 2,5 jt · Duo 4 jt · Full Story 5 jt; layanan mulai 500 rb (Personal) s.d. 2,5 jt (Wedding). Promo peluncuran (reel 1 menit Rp 500 rb untuk klien foto, kuota 5, s.d. 31 Des 2026) **tidak** dipajang di situs, hanya ditawarkan lewat WhatsApp. Harga dinaikkan bertahap setelah 3–5 proyek masuk portofolio. Paket **Duo** ditonjolkan (label "Rekomendasi kami", baris penghematan); Full Story = Duo + sesi pre-wedding 2 jam, film upacara utuh jadi tambahan Rp 750 rb. Syarat: DP 30% mengunci tanggal, pelunasan H-7; maksimal 8 wedding per bulan (angka jujur dari pemilik, jangan dikecilkan untuk kesan langka).
- **Bahasa**: situs EN utama, ID kedua. Semua yang dibaca klien (galeri, pesan WhatsApp, invoice) mengikuti bahasa klien (`lang` per sesi/invoice). Admin berbahasa Inggris.
- **Kalender hanya untuk admin**: tidak ada ketersediaan publik.
- **Teks & harga situs diedit dari admin** (*Site text*), bukan di kode. Harga teks bebas.
- **Galeri klien besar (±800 foto)**: hanya baris dekat layar yang dipasang; pilihan tersimpan di server dengan versi, tergabung antarperangkat, tidak hilang saat klien keluar. Setelah dikirim, klien hanya bisa melihat (read-only).
- **Foto proyek** tampil utuh sesuai bentuknya; foto halaman bisa diatur bingkainya di admin.
- **Region**: Vercel dan Railway sama-sama di Singapura. Railway 1 replica saja selama memakai SQLite.
- **DNS di Cloudflare** (DNS only), email tetap di hosting anjas.id.

## Yang belum dikerjakan / ide berikutnya
Lihat `docs/PLAN.md`: gambar langsung dari Railway (tidak lewat Vercel), thumbnail WebP, upgrade Railway dengan volume lebih besar.
Masalah yang diketahui ada di bagian akhir `docs/DEPLOYMENT.md`.

## Jangan pernah di-commit
`api/.env`, `api/service_account.json`, `web/.env.local`, database, cache, backup, uploads, `Web Reference/`.
Rahasia (password admin, key, token, PIN) tidak ditulis di repo maupun chat. Mintalah langsung ke pemilik lewat jalur pribadi.
