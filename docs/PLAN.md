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

### 1. Pastikan foto sudah siap sebelum link dikirim (sebagian sudah ada)
- **1a. Cache harus di volume Railway.** `cache_dir` default-nya `api/cache` di dalam container. Kalau `CACHE_DIR` tidak diarahkan ke volume, setiap deploy/restart menghapus semua foto kecil dan galeri kembali dingin. → Set `CACHE_DIR` ke path volume dan catat di `api/.env.example`. *Cek dulu di dashboard Railway.*
- **1b. Warming lanjut setelah restart.** Status `_warming` hanya di memori; restart di tengah proses menghentikannya. → Saat API start, lanjutkan warming untuk sesi aktif yang belum lengkap.
- **1c. Tombol "Salin link / WhatsApp" di admin diberi peringatan** selama thumbnail belum 100%.

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
