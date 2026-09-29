# Lintas Waktu — aturan kerja

Repo ini dikerjakan oleh pemilik (NantaPakeAI) dan kolaborator, masing-masing dengan Claude sendiri.
Baru di sini? Baca `docs/CONTEXT.md` dulu.

## Setiap memulai sesi
1. `git pull` (atau fetch) `main`, lalu baca entri teratas `docs/CHANGELOG.md` dan `git log --since="2 weeks ago" --stat main`
   untuk tahu apa yang diubah orang lain sejak terakhir. Kalau ada perubahan di area yang akan disentuh, baca commit-nya dulu.
2. Cek juga pull request yang masih terbuka, supaya tidak mengerjakan hal yang sama.

## Siapa push ke mana
- **Pemilik** boleh commit dan push langsung ke `main` (= deploy produksi Vercel + Railway).
- **Kolaborator** kerja di branch sendiri (`nama/topik`, mis. `rina/halaman-harga`), lalu buka pull request ke `main`.
  Pemilik yang menggabungkan. Jangan push langsung ke `main` kecuali pemilik mengizinkan.
- Push hanya ke `anantamahayana/lintas-waktu`, tidak pernah ke repo photo-selection-platform asli.
- Beri tahu orang yang sedang bekerja kalau ada langkah manual (env var, dashboard, DNS). Detail deploy: `docs/DEPLOYMENT.md`. Rencana berjalan: `docs/PLAN.md`.

## Setiap commit wajib menjelaskan isinya
Tujuannya: siapa pun (dan Claude siapa pun) bisa tahu apa yang berubah hanya dari repo.
- **Judul** (≤ 72 karakter): area + apa yang berubah bagi pengguna, mis. `Client gallery: photos keep their own shape`.
- **Isi** (wajib, kecuali typo/perubahan satu baris), dipisah satu baris kosong dari judul:
  ```
  Apa: perubahan yang terlihat/dirasakan (situs, admin, galeri klien, API).
  Kenapa: masalah atau permintaan yang dijawab.
  File utama: path yang paling penting untuk dibaca.
  Dicek: tes/typecheck yang dijalankan, halaman yang dilihat.
  Manual: langkah di dashboard/env/DNS, atau "tidak ada".
  ```
- Dalam commit yang sama, tambahkan entri di atas `docs/CHANGELOG.md` (tanggal · nama, poin singkat, **Manual:** kalau ada).
  Tanggal yang sama & orang yang sama → tambah poin di entri yang sudah ada.
- Satu commit = satu perubahan yang utuh. Jangan campur fitur yang tidak berhubungan.
- Pull request: isi template di `.github/pull_request_template.md`.

## Umum
- **Jangan pernah menambahkan atribusi Claude** di commit atau PR: tanpa `Co-Authored-By: Claude`, tanpa "Generated with Claude Code", tanpa link sesi. Commit atas nama orang yang mengerjakan (pemilik: NantaPakeAI).
- Sebelum commit: tes API (`cd api && python -m pytest -q`) dan `cd web && npx tsc --noEmit && npm run lint` harus bersih.
- Tanya dulu sebelum perubahan besar. Kalau diminta "jangan lakukan apa-apa", cukup jawab.
- Jangan menulis rahasia (password, key, token, PIN) di repo atau chat.
- Desain: kode di `web/` adalah acuan (lihat `docs/BRAND.md`); Figma sudah usang. Animasi elegan tapi ringan.
- **Performa dulu, hiasan kemudian** (pengunjung banyak memakai HP biasa):
  - Tanpa library baru untuk efek visual. CSS dulu; JS hanya untuk pulau kecil (`"use client"` sekecil mungkin, ±2 KB per fitur).
  - Animasi hanya `transform` dan `opacity`. Jangan menganimasikan `filter`/blur, bayangan, atau ukuran/posisi layout.
  - Tanpa loop terus-menerus (`requestAnimationFrame`, `setInterval` per detik). Timer paling sering sekali per menit dan berhenti saat tab tersembunyi.
  - Konten di atas lipatan (hero, judul, foto `priority`) tidak boleh ditunda animasi. Ruang disiapkan sebelum isi muncul (tanpa pergeseran/CLS).
  - Hormati `prefers-reduced-motion`.
  - Ukur sebelum dan sesudah dengan Lighthouse mobile di build produksi (cara dan angka patokan: `docs/PLAN.md` → "Detail visual"). Jangan push kalau skor turun atau TBT/CLS naik berarti.
- Konten untuk klien (galeri, invoice) dalam bahasa klien, EN/ID. Kalender hanya untuk admin.
- Next.js 16: baca `web/AGENTS.md` sebelum mengubah kode khusus Next.
- Keputusan besar yang baru → catat di `docs/CONTEXT.md` (bagian "Keputusan yang sudah diambil").
