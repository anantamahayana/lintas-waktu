# Deploy & operasional — Lintas Waktu

Per 25 September 2026 · live sejak 23 September 2026. Tidak ada rahasia di file ini — hanya nama variabel.
"?" = belum dipastikan; cek di dashboard.

## Alur
`main` → deploy otomatis ke **Vercel** (web) dan **Railway** (API). Push ke `main` = produksi; tidak ada staging.
Kerja lain di branch terpisah, gabung ke `main` lewat pull request.

## Vercel — web
| | |
|---|---|
| Proyek | `lintas-waktu` (team "Lintas Waktu", plan Hobby) |
| Root Directory | `web` · Framework Preset **Next.js** (dengan "Other" situs 404) |
| Function Region | **Singapore (sin1)** — sejak 25 Sep 2026, sama dengan Railway (sebelumnya default Washington) |
| Domain | **https://www.lintaswaktuvisual.com** (utama) · `lintaswaktuvisual.com` → 308 ke www · `lintas-waktu-omega.vercel.app` |
| Env | `API_URL` = https://api.lintaswaktuvisual.com (tujuan rewrite `/api/*`) · `REVALIDATE_SECRET` (sama dengan Railway) · `NEXT_PUBLIC_SITE_URL` = https://www.lintaswaktuvisual.com (dicek 5 Okt 2026: sitemap memakai www; apex `lintaswaktuvisual.com` → 308 ke www di Vercel → Domains) |
| Sengaja tidak diset | `NEXT_PUBLIC_API_URL` — browser memanggil `/api/{gallery,admin,public}/*` di origin yang sama, `web/next.config.ts` meneruskannya ke `API_URL` |

Catatan: plan Hobby resminya untuk non-komersial — pertimbangkan Pro.

## Railway — API
| | |
|---|---|
| Proyek / service | "incredible-enjoyment" / `lintas-waktu` · plan trial (? upgrade ke Hobby sebelum kredit habis) |
| Domain | https://api.lintaswaktuvisual.com (VPS IDCloudHost 103.217.144.86, sejak 13 Nov 2026; pasang/perbarui: Actions → "Deploy API ke VPS", file `deploy/vps/`) |
| Build | Root Directory `api`, Dockerfile (`api/railway.json`, healthcheck `/api/health`). Build dari root repo (Railpack) gagal. |
| Region | **Southeast Asia (Singapore)**, 1 replica — sejak 25 Sep 2026 (sebelumnya US West). Klien di Bali/Indonesia; jangan tambah replica selama database SQLite di volume. |
| Volume | `lintas-waktu-volume` di `/data`, ±454 MB (plan trial) |
| Env | `PORT=8080` · `DATABASE_URL=sqlite:////data/photo_platform.db` · `CACHE_DIR`, `UPLOAD_DIR` di bawah `/data` (? path persisnya) · `FRONTEND_URL` (? pastikan = https://www.lintaswaktuvisual.com — dipakai untuk link galeri/invoice) · `GOOGLE_SERVICE_ACCOUNT_JSON` · `ADMIN_PASSWORD` · `REVALIDATE_SECRET` · `SECRET_KEY` (?) |
| `ADMIN_PASSWORD_RESET` | sudah dihapus. Hanya untuk lupa password panel: set `1` + `ADMIN_PASSWORD` baru, deploy, login, hapus lagi. |

Ruang disk: volume menyimpan database **dan** cache foto. Cache tidak pernah memakan sisa ruang di bawah `CACHE_MIN_FREE_MB` (default 150): foto besar lama dihapus lebih dulu atau tidak di-cache. Saat start, API membersihkan cache kalau disk hampir penuh dan menulis satu baris `storage: disk …` di log (isi volume: cache, db, backups, uploads). Kejadian 25 Sep 2026: volume penuh → SQLite gagal → API crash berulang.

Database: SQLite di volume. Tanpa Alembic — `migrate()` jalan saat start. Data produksi diisi lewat /admin.
Revalidasi: API memanggil `/api/revalidate` di Vercel dengan `REVALIDATE_SECRET`.

## Backup API (VPS)
- Otomatis setiap hari 04.17 WITA: Actions → "Backup API (VPS)" (bisa juga Run workflow manual). Isi: database + `uploads/`, terenkripsi, disimpan 30 hari sebagai artifact di run tersebut.
- Di server juga ada salinan harian database 14 hari: `/srv/lintas-waktu/data/backups/`.
- Memulihkan: unduh artifact → `gpg -d lw-backup-TANGGAL.tgz.gpg > b.tgz` (passphrase = nilai secret `SECRET_KEY`) → `tar -xzf b.tgz` → salin `photo_platform.db` dan `uploads/` ke `/srv/lintas-waktu/data/` di server (hentikan API dulu: `cd /srv/lintas-waktu/repo/deploy/vps && sudo docker compose stop api`, lalu `start api`).

## Pemantau
- Actions → "Pemantau API" (`.github/workflows/uptime.yml`) mengecek API dan situs tiap 30 menit. Kalau mati, run merah dan GitHub mengirim email ke pemilik.
- Dashboard admin (Sessions) menampilkan status server: backup di server, backup di luar server (GitHub), sisa disk; merah kalau ada yang telat.
- Catatan: GitHub menghentikan jadwal otomatis kalau repo tidak ada aktivitas 60 hari; aktifkan lagi di tab Actions.

## Domain — lintaswaktuvisual.com
- Registrar **Hostinger**, berakhir 2027-09-23 (? auto-renew aktif).
- **DNS di Cloudflare** (plan Free, akun komangant25) sejak 27 Sep 2026 — nameserver dipindah dari `ns1/ns2.anjas.id` karena nameserver anjas hilang-timbul (SERVFAIL dari Google DNS & DNS kampus ISI, 26 Sep; DNSViz bersih, tanpa DNSSEC). Record Vercel sebaiknya **DNS only** (awan abu-abu); kalau diproksikan, SSL/TLS harus **Full (strict)**.
- Email tetap di hosting **anjas.id** (cPanel) — hanya DNS yang pindah; record mail/MX/SPF/DKIM disalin ke Cloudflare. Hosting anjas tidak bisa menjalankan Node/Python.
- Record: `A @ 216.198.79.1` (Vercel) · `CNAME www → e8ec0a7edf72d52f.vercel-dns-017.com` · `MX → mail.lintaswaktuvisual.com` · `A mail → 194.15.36.113` · SPF `v=spf1 +a +mx +ip4:194.15.36.113 ~all`.
- Email klien (iPhone): host **wh.anjas.id** (sertifikatnya untuk nama itu) — IMAP 993 SSL, SMTP 465 SSL.


## Google Drive
Mode service account (`GOOGLE_SERVICE_ACCOUNT_JSON` di produksi; lokal `api/service_account.json`, di-gitignore).
Folder Drive harus di-share ke email service account.

## Aplikasi album (Windows) — installer dan pembaruan otomatis
- Installer dibuat oleh GitHub Actions: **Actions → "Album app (Windows installer)" → Run workflow**. Hasilnya di bagian *Artifacts* run itu.
- **Pembaruan otomatis** (mulai 0.4.0): aplikasi yang terpasang memeriksa `releases/latest/download/latest.json` di repo ini 5 detik setelah dibuka (tidak berulang), mengunduh di latar, lalu memasang saat pengguna menekan "Mulai ulang sekarang" atau saat jendela ditutup. Karena itu **Releases repo ini khusus untuk aplikasi album** (rilis lain akan dianggap pembaruan).
- **Menerbitkan pembaruan**: naikkan versi di `desktop/package.json`, `desktop/src-tauri/tauri.conf.json`, `desktop/src-tauri/Cargo.toml` (+ entri `lw-album` di `Cargo.lock`), push, lalu Run workflow dengan centang **"Terbitkan sebagai pembaruan"** dan isi catatan rilis (satu poin per baris).
- **Kunci tanda tangan.** Pembaruan hanya dipasang kalau ditandatangani kunci ini. Kunci **publik** ada di `desktop/src-tauri/tauri.conf.json` (`plugins.updater.pubkey`) dan `src-tauri/src/main.rs` (boleh di repo). Kunci **privat** (dibuat 12 Nov 2026, tanpa kata sandi) hanya ada di secret GitHub `TAURI_SIGNING_PRIVATE_KEY` dan cadangan pemilik. Tanpa secret itu, build tetap jalan tetapi tidak bisa menjadi pembaruan.
  - **Kalau kunci privat hilang**, aplikasi yang sudah terpasang tidak bisa diperbarui lagi: buat kunci baru (`npx @tauri-apps/cli@2 signer generate -w lw-album.key`), ganti kunci publik di dua file di atas dan secret-nya, lalu pasang installer baru secara manual sekali di setiap laptop.

## Masalah yang diketahui
- **Link galeri klien pernah HTTP 500** (preview fotografer normal). Pencatatan kunjungan kini dibungkus try/except (commit `147a0cc`) dan endpoint kembali 200. Akar masalah belum diketahui — cari log `could not record gallery visit` di Railway.
- **Galeri besar (±784 foto) berat di Safari** — lihat `docs/PLAN.md` (grid virtual, penyimpanan pilihan, warm-up; sudah di `main`).
- **Sebagian pengguna Biznet/XL tidak bisa membuka situs tanpa VPN.** Dugaan: DNS ISP (cache negatif sejak sebelum domain terdaftar / filter DNS) atau blokir IP. Tes: DNS 1.1.1.1 / 8.8.8.8; kalau tetap gagal, pertimbangkan Cloudflare sebagai proxy. Hasil tes: ?

## Jangan di-commit
`api/.env`, `api/service_account.json`, `web/.env.local`, database, cache, backup, uploads, `Web Reference/`.
