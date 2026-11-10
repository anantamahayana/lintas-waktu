# LW Album (desktop)

Aplikasi Windows untuk memilih foto, menyusun album, dan mengekspor file cetak. Rencana lengkap: `docs/ALBUM_APP_PLAN.md`.

## Yang sudah ada (fase 1, bagian pertama)
- **Buka folder** foto (JPG/PNG/WebP). Foto tetap di laptop; tidak ada yang diunggah.
- **Kurasi**: satu foto atau kisi; `P` pilih, `X` lewati, `U` batal, `1`–`5` bintang, `←` `→` pindah, `G` kisi; target jumlah foto.
- **Editor**: susun otomatis menurut bentuk foto; per halaman pilih jumlah foto (1–4) dan template, acak, kunci;
  seret untuk menukar atau mengganti dari baki; perbesar/geser foto di bingkai; margin, jarak, latar; urungkan/ulangi.
- **Template buatan sendiri**: "Buat template sendiri…" di panel kanan. Atur kisi (kolom × baris), klik dua sudut untuk
  tiap bingkai (maksimal 12; kotak kosong jadi ruang putih), simpan. Template tersimpan di laptop dan muncul di semua album.
- **Dua halaman menyambung** (jilid layflat): "Sambung dua halaman" menjadikan satu spread sebagai satu lembar, sehingga
  foto boleh melintasi lipatan; ada template khusus spread dan template sendiri juga bisa dibuat untuk dua halaman.
  Jenis jilid dipilih di Ekspor; dengan jilid biasa aplikasi memberi peringatan.
- **Ekspor**: semua angka cetak bisa diubah (ukuran, orientasi, bleed, zona aman, dpi); JPG per spread dari file asli,
  dengan bleed dan dpi tertulis di file; peringatan foto beresolusi rendah.
- Pilihan dan desain **tersimpan otomatis** per nama folder (buka folder yang sama untuk melanjutkan).

Belum ada: sampul, PDF pratinjau, proof ke galeri klien, papan status produksi, preset bernama.

## Menjalankan
```
cd desktop
npm install
npm run dev        # di browser: http://localhost:1420 (Chrome/Edge)
npm test           # tes tata letak dan hitungan cetak
npm run build      # typecheck + build
```
Installer Windows: jalankan workflow **Album app (Windows installer)** di tab Actions GitHub, lalu unduh dari Artifacts.
Di Windows dengan Rust terpasang: `npx tauri dev` / `npx tauri build`.

## Peta kode
- `src/lib/print.ts`: ukuran cetak (mm → px), bleed, posisi bingkai, crop, dpi.
- `src/lib/layout.ts`: template halaman, susun otomatis, ubah jumlah foto, tukar, acak.
- `src/lib/photos.ts`: membaca folder, thumbnail, ukuran foto.
- `src/lib/export.ts`: menggambar spread ukuran cetak dan menyimpannya.
- `src/views/`: Kurasi, Editor, Ekspor. `src-tauri/`: bungkus jendela Windows (belum memakai API native).
