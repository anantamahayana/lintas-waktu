# Konteks proyek — baca ini dulu

Untuk siapa pun (dan Claude siapa pun) yang baru ikut mengerjakan repo ini. Diperbarui 18 November 2026.
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
| Invoice klien | `/i/<token>`, kuitansi `/r/<token>`, verifikasi `/verify/<nomor>` | Klien melihat/cetak invoice dan kuitansi pembayaran; siapa pun bisa cek keaslian |
| Proof album klien | `/p/<slug>` (ber-PIN) | Klien melihat album sebelum cetak, memberi catatan bertitik, lalu menyetujui |

Selain website ada **aplikasi album untuk Windows** (`desktop/`, "LW Album", Tauri 2 + React): kurasi foto, tata letak album, sampul, ekspor cetak, dan kirim proof online ke klien. Terpasang di laptop pemilik dan Yukti; memperbarui diri dari GitHub Releases.

Asal-usul: backend diambil dari repo `photo-selection-platform` (milik Yukti). **Jangan pernah push ke repo itu.**

## Arsitektur
```
browser ──► Vercel (Next.js 16, web/) ──rewrite /api/*──► VPS IDCloudHost: api.lintaswaktuvisual.com ──► Google Drive
                                                             (Docker: FastAPI api/ + Caddy HTTPS; SQLite + cache di /srv/lintas-waktu/data)
aplikasi album (desktop/) ──────────────────────────────────► api.lintaswaktuvisual.com (proof online)
```
- `main` = produksi. Push ke `main` → **Vercel deploy otomatis**. **API tidak otomatis**: jalankan GitHub Actions → "Deploy API ke VPS" setelah mengubah `api/` (khusus pemilik). Tidak ada staging.
- Railway dipakai sampai 13 Nov 2026 (berhenti karena langganan); data lama di sana tidak dipindahkan.
- Browser selalu memanggil `/api/...` di domain yang sama; `web/next.config.ts` meneruskannya ke `API_URL`.
- GitHub Actions: `deploy-vps.yml` (pasang/perbarui API), `backup-vps.yml` (backup terenkripsi harian 04.17 WITA), `uptime.yml` (cek API tiap 30 menit), `album-windows.yml` (installer + rilis aplikasi album).
- Setelah admin menyimpan sesuatu, API memanggil `/api/revalidate` di Vercel → situs ter-update (cache 60 detik).
- Detail env var, domain, DNS (Cloudflare), email: `docs/DEPLOYMENT.md`.

## Peta kode
**`api/`: FastAPI + SQLAlchemy + SQLite** (tanpa Alembic: `migrate()` di `app/database.py` menambah kolom baru saat start)
- `app/main.py`: app, router, pemanasan cache saat start, pembersihan disk.
- `app/routers/admin.py`: sesi pemilihan foto (buat, sync Drive, PIN, export XMP/CSV).
- `app/routers/gallery.py`: API galeri klien (`/api/gallery/{slug}`): unlock PIN, draf pilihan tersinkron antarperangkat, kirim.
- `app/services/drive_service.py`: daftar foto Drive, thumbnail/versi besar, cache di disk dengan cadangan ruang.
- `app/content/`: semua yang untuk website: proyek (`models.py`), pengaturan situs (`settings_store.py`), teks situs (`copy_store.py`), foto halaman (`site_images.py`), invoice + pembayaran + kuitansi (`invoices.py`), proof album (`proofs.py`), aktivitas klien (`activity.py`), klien gabungan (`clients.py`), kalender (`bookings.py`), router publik & admin.
- `app/routers/system.py`: status server untuk dashboard admin (umur backup, sisa disk).
- `tests/`: pytest, DB sementara + Drive palsu (`conftest.py`).

**`web/`: Next.js 16 App Router + next-intl + Tailwind 4** (baca `web/AGENTS.md`: Next 16 berbeda dari yang umum diketahui)
- `src/app/[locale]/…`: halaman publik (home, work, work/[slug], services, about, contact).
- `src/app/admin/…`: panel admin; menu di `src/components/admin/AdminShell.tsx`.
- `src/app/g/[slug]` + `src/components/gallery/ClientGallery.tsx`: galeri klien (grid baris rata yang hanya memasang baris dekat layar, lightbox dengan gestur, pratinjau album).
- `messages/{en,id}.json`: teks bawaan situs. Admin → *Site text* menyimpan hanya bagian yang diubah; digabung saat render (`src/lib/copy.ts`, `src/i18n/request.ts`).
- `src/lib/content.ts`: mengambil proyek/pengaturan/foto dari API untuk halaman publik.
- `src/lib/admin-api.ts`, `src/lib/gallery-api.ts`: klien API untuk admin dan galeri.
- `src/lib/frame.ts` + `src/components/admin/FrameEditor.tsx`: pengaturan bingkai foto (titik fokus, zoom, tampil utuh).
- `src/app/p/[slug]` + `src/components/proof/ProofViewer.tsx`: proof album klien (desktop, HP tegak per halaman, HP miring layar penuh).
- `src/components/invoice/`: dokumen invoice (`InvoiceDoc.tsx`), teks EN/ID (`strings.ts`); kuitansi di `src/app/r/[token]`.

**`desktop/`: aplikasi album (Tauri 2 + React + Vite)**
- `src/views/`: modul Beranda, Kurasi, Tata letak (`Editor.tsx`, `Sheet.tsx`), Sampul, Ekspor, Proof.
- `src/lib/layout.ts` (model album: halaman, template, bingkai), `keys.ts` (semua pintasan + menu), `proofs.ts` (API proof online), `update.ts` (pembaruan otomatis).
- Tes: `cd desktop && npm test`. Rilis: GitHub Actions → "Album app (Windows installer)" dengan centang *release* (khusus pemilik; versi dinaikkan di `package.json`, `src-tauri/tauri.conf.json`, `Cargo.toml`).

## Mulai berkontribusi (mis. Yukti, dengan Claude sendiri)
1. Minta pemilik menambahkan akun GitHub-mu sebagai collaborator di `anantamahayana/lintas-waktu`.
2. Clone repo, lalu minta Claude-mu membaca `CLAUDE.md` dan file ini dulu. Aturan kerja (branch, pesan commit, CHANGELOG, tes) ada di `CLAUDE.md`.
3. **Yukti** boleh langsung push ke `main` dan menjalankan deploy API / rilis aplikasi sendiri (izin pemilik 18 Nov 2026); langkahnya di `CLAUDE.md` → "Setelah push ke `main`". Kolaborator lain: branch `nama/<topik>` lalu pull request.
4. Sebelum mulai, cek `docs/CHANGELOG.md` (entri teratas) dan pull request yang masih terbuka supaya tidak dobel.
5. Rahasia (password admin, key) tidak ada di repo. Untuk mencoba lokal, API jalan tanpa kredensial Google (mode mock) dengan password admin buatanmu sendiri di `api/.env`.

## Menjalankan di lokal
```bash
# API — tanpa kredensial Google, API jalan dalam mode mock (24 foto contoh)
cd api && python -m venv .venv && .venv/bin/pip install -r requirements.txt   # Windows: .venv\Scripts\
cp .env.example .env            # isi ADMIN_PASSWORD & SECRET_KEY sendiri
.venv/bin/python -m uvicorn app.main:app --reload --port 8000

# Web
cd web && npm install && npm run dev   # http://localhost:3000, admin di /admin

# Aplikasi album (perlu Rust + Node; build installer resmi lewat GitHub Actions)
cd desktop && npm install && npm test && npm run tauri dev
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
- **Desain**: acuannya kode di `web/` + `docs/BRAND.md` (classic editorial, Cormorant + Inter, aksen hanya emas logo). Figma usang. Animasi elegan tapi ringan.
- **Brand**: sebutan mengikuti `docs/BRAND.md`: duo independen, bukan "studio"; nama di situs "Lintas Waktu". Editorial & Model adalah kategori resmi (29 Sep 2026).
- **Logo** (1 Okt 2026): **Gerbang Waktu** (gerbang + jalan + matahari emas, wordmark Marcellus). Dipakai di seluruh situs, galeri klien, admin, invoice, ikon, dan kartu share. Aturan dan file: `docs/BRAND.md` → 1a. Emas Senja `#C8832F` satu momen per layar.
- **Harga** (29 Sep 2026): tingkat freelancer pemula, Rp 500 rb – 5 jt, untuk membangun portofolio dulu. Paket wedding Essential 2,5 jt · Duo 4 jt · Full Story 5 jt; layanan mulai 500 rb (Personal) s.d. 2,5 jt (Wedding). Promo peluncuran (reel 1 menit Rp 500 rb untuk klien foto, kuota 5, s.d. 31 Des 2026) **tidak** dipajang di situs, hanya ditawarkan lewat WhatsApp. Harga dinaikkan bertahap setelah 3–5 proyek masuk portofolio. Paket **Duo** ditonjolkan (label "Rekomendasi kami", baris penghematan); Full Story = Duo + sesi pre-wedding 2 jam, film upacara utuh jadi tambahan Rp 750 rb. Syarat: DP 30% mengunci tanggal, pelunasan H-7; maksimal 8 wedding per bulan (angka jujur dari pemilik, jangan dikecilkan untuk kesan langka).
- **Bahasa**: situs EN utama, ID kedua. Semua yang dibaca klien (galeri, proof, pesan WhatsApp, invoice, kuitansi) mengikuti bahasa klien (`lang` per sesi/invoice). **Admin berbahasa Indonesia** (sejak 13 Nov 2026). Dokumen baru bawaannya Bahasa Indonesia.
- **Server API di VPS IDCloudHost** (13 Nov 2026), dibayar transfer/QRIS; email juga direncanakan pindah ke IDCloudHost supaya tidak terpencar.
- **Pembayaran invoice dicatat per transaksi** (DP, cicilan, pelunasan), masing-masing dengan kuitansi `KW-…`; lunas → invoice otomatis Paid. Rekening BCA studio tercetak bawaan.
- **Kalender hanya untuk admin**: tidak ada ketersediaan publik.
- **Teks & harga situs diedit dari admin** (*Site text*), bukan di kode. Harga teks bebas.
- **Galeri klien besar (±800 foto)**: hanya baris dekat layar yang dipasang; pilihan tersimpan di server dengan versi, tergabung antarperangkat, tidak hilang saat klien keluar. Setelah dikirim, klien hanya bisa melihat (read-only).
- **Foto proyek** tampil utuh sesuai bentuknya; foto halaman bisa diatur bingkainya di admin.
- **Region**: Vercel di Singapura, API di Jakarta (IDCloudHost). Satu server saja selama memakai SQLite.
- **Yukti boleh push langsung ke produksi dan merilis aplikasi** (18 Nov 2026), dengan aturan di `CLAUDE.md`.
- **Releases GitHub repo ini khusus aplikasi album** (12 Nov 2026): aplikasi yang terpasang memperbarui diri dari `releases/latest/download/latest.json`; rilis lain di repo ini akan dianggap pembaruan aplikasi. Kunci tanda tangan dipegang pemilik (secret GitHub), tidak pernah di repo.
- **DNS di Cloudflare** (DNS only), email tetap di hosting anjas.id.
- **Aplikasi album (`desktop/`)** (11 Nov 2026): tampilan mengikuti file Figma "Editing Album LW" (tema gelap, aksen biru `#2f6fe4`, Inter); setelah diterapkan, kode di `desktop/src` yang jadi acuan. Semua pintasan keyboard didaftarkan di satu tempat (`desktop/src/lib/keys.ts`, CATALOG) dan menu, tooltip, serta daftar pintasan dibaca dari sana; pengguna bisa mengubahnya (Ctrl+,). Pindah modul memakai **Ctrl+Alt+1–4** karena angka 1–5 dipakai untuk bintang di Kurasi.

## Yang belum dikerjakan / ide berikutnya
Lihat `docs/PLAN.md`: unduh PDF invoice langsung (ditunda), gambar langsung dari API (tidak lewat Vercel), thumbnail WebP, pindah email ke IDCloudHost.
Masalah yang diketahui ada di bagian akhir `docs/DEPLOYMENT.md`.

## Jangan pernah di-commit
`api/.env`, `api/service_account.json`, `web/.env.local`, database, cache, backup, uploads, `Web Reference/`.
Rahasia (password admin, key, token, PIN) tidak ditulis di repo maupun chat. Mintalah langsung ke pemilik lewat jalur pribadi.
