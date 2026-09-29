# Catatan perubahan

Yang terbaru di atas. Setiap perubahan yang di-push menambah satu entri di sini (aturannya di `CLAUDE.md`).
Format: `### YYYY-MM-DD · nama` lalu poin singkat. Isinya: apa yang berubah bagi pengguna, file/area utama,
dan **langkah manual** kalau ada. Detail teknis lengkap ada di pesan commit (`git log`).

---

### 2026-09-29 · NantaPakeAI
- Kategori baru **Editorial & Model**: filter di Work, kartu di Services, pilihan di form Contact, kategori proyek/kalender di admin, slot foto "Services · Editorial & Model" di Site images.
- Teks situs sebagai duo (fotografer + videografer), bukan satu orang atau "studio": About, "Di balik kamera", pengantar Services, menu "Tentang kami". `docs/BRAND.md` diperbarui (nama, skala duo, spesialisasi).
  **Manual:** kalau teks About/Services pernah diedit di Admin → Site text, versi admin yang tampil. Cek dan sesuaikan di sana. Pilih foto untuk slot Editorial di Admin → Site images.

### 2026-09-28 · Yukti
- Galeri klien: intro (tagline), judul pratinjau link (WhatsApp) dan bahasa halaman kini mengikuti bahasa klien yang dipilih di sesi; sebelumnya tetap Inggris.

### 2026-09-28 · NantaPakeAI
- Repo siap dikerjakan bersama: `docs/CONTEXT.md` (konteks lengkap untuk kolaborator dan Claude-nya), catatan perubahan ini, aturan commit & branch di `CLAUDE.md`, template pull request.

### 2026-09-26 · NantaPakeAI
- Footer & halaman Contact: logo WhatsApp, Email, Instagram, YouTube. Kolom YouTube baru di Admin → Site settings.
  **Manual:** isi link/@handle YouTube di Admin → Site settings.
- Foto proyek tampil utuh sesuai bentuknya. Admin bisa mengatur bingkai foto halaman dan cover proyek (titik fokus, zoom, tampil utuh).
- Dokumentasi: DNS pindah ke Cloudflare.

### 2026-09-25 · NantaPakeAI
- Galeri klien: setelah mengirim, "View my selection" hanya bisa dilihat. Pesan WhatsApp dan galeri memakai bahasa klien (EN/ID per sesi).
- Admin → Site text: semua teks situs publik (EN/ID) bisa diedit, termasuk paket & harga.
- Menu situs: link Home.
- Galeri klien: foto tampil sesuai bentuknya (baris rata), tombol lebih besar, gestur lightbox (geser, cubit, geser-bawah tutup), tombol back menutup overlay, panduan harus ditutup dulu, bilah pilihan menempel di bawah.
- Galeri besar (±800 foto): hanya baris dekat layar yang dipasang; pilihan tersimpan & tersinkron antarperangkat; pemanasan cache lanjut setelah restart; peringatan saat membagikan galeri yang belum siap.
- Railway: API tetap bisa start saat volume penuh; cache foto menyisakan ruang disk. Railway & Vercel pindah ke Singapura.
- Drive: daftar folder kosong tidak lagi di-cache.

### 2026-09-24 · NantaPakeAI
- Galeri klien tidak lagi error 500 kalau pencatatan kunjungan gagal.

### 2026-09-23 · NantaPakeAI
- Siap produksi: API di Railway (volume, `$PORT`, service account dari env), web di Vercel memanggil API lewat domain yang sama. Situs live.
- `ADMIN_PASSWORD_RESET` untuk memulihkan password admin yang lupa.

### 2026-09-19 s.d. 2026-09-22 · NantaPakeAI
- Situs publik (Home, Work, Services, About, Contact), arah desain *classic editorial*, SEO.
- Backend dari photo-selection-platform: admin sesi pemilihan foto, galeri klien ber-PIN `/g/<slug>`, pratinjau album.
- Proyek portofolio & film dari API; foto halaman dipilih dari folder Drive di admin.
- Invoice (tulis, bagikan, cetak, tandai lunas, kode verifikasi + QR) dalam bahasa klien.
- Kalender & booking khusus admin.
