# LW Album (desktop)

Aplikasi Windows untuk memilih foto, menyusun album, dan mengekspor file cetak. Rencana lengkap: `docs/ALBUM_APP_PLAN.md`.

## Aplikasi Windows vs pratinjau web
Di aplikasi Windows: folder foto diingat, proyek berupa file `.lwalbum` di `Documents\LW Album\Proyek` (versi lama di
`.versi`), thumbnail di cache aplikasi, RAW didukung lewat pratinjau JPEG di dalam file RAW, ekspor langsung ke folder.
Di browser/pratinjau web: folder dipilih ulang tiap membuka proyek, proyek di penyimpanan browser, hanya JPG/PNG/WebP.
Kode yang menyentuh file ada di `src/lib/platform.ts` (sisi web) dan `src-tauri/src/` (sisi Windows).

## Yang sudah ada (fase 1, bagian pertama)
- **Beranda**: buat proyek baru (nama, titik awal seperti A4 mendatar/tegak, 25×25, 30×30, lalu semua properti album) atau
  lanjutkan proyek terakhir. Foto (JPG/PNG/WebP) tetap di laptop; tidak ada yang diunggah. Saat membuka proyek lama,
  folder fotonya dipilih lagi.
- **Kurasi**: satu foto atau kisi; `P` pilih, `X` lewati, `U` batal, `1`–`5` bintang, `←` `→` pindah, `G` kisi; target jumlah foto;
  **Pilih semua** untuk folder yang isinya memang semua masuk album.
- **Editor**: susun otomatis menurut bentuk foto, atau **album kosong** yang diisi sendiri dengan menyeret foto dari
  baki kiri (baki bisa menampilkan semua foto, bukan hanya yang dipilih); kosongkan/hapus bingkai, tambah spread kosong; per halaman pilih jumlah foto (1–4) dan template, acak, kunci;
  seret untuk menukar atau mengganti dari baki; perbesar/geser foto di bingkai; margin, jarak, latar; urungkan/ulangi.
- **Template buatan sendiri**: "Buat template sendiri…" di panel kanan. Atur kisi (kolom × baris), klik dua sudut untuk
  tiap bingkai (maksimal 12; kotak kosong jadi ruang putih), simpan. Template tersimpan di laptop dan muncul di semua album.
- **Dua halaman menyambung** (jilid layflat): "Sambung dua halaman" menjadikan satu spread sebagai satu lembar, sehingga
  foto boleh melintasi lipatan; ada template khusus spread dan template sendiri juga bisa dibuat untuk dua halaman.
  Jenis jilid dipilih di Ekspor; dengan jilid biasa aplikasi memberi peringatan.
- **Ekspor**: semua angka cetak bisa diubah (ukuran, orientasi, bleed, zona aman, dpi); JPG per spread dari file asli,
  dengan bleed dan dpi tertulis di file; peringatan foto beresolusi rendah.
- Pilihan dan desain **tersimpan otomatis** per proyek.

- **Sampul**: foto depan/belakang, judul, keterangan, judul di punggung, lebar punggung dan lipatan papan; ikut diekspor.
- **PDF pratinjau** untuk klien (WhatsApp): kecil, tanpa bleed, bernomor halaman.

- **Kurasi ribuan foto**: kisi virtual, zoom 100%, banding 2–4 foto, burst, saringan jam/kamera; RAW di aplikasi Windows.
- **Editor bebas**: geser/ubah ukuran bingkai dengan magnet, teks (6 font), latar dan garis per halaman, salin/tempel tata letak,
  tampilan semua spread dengan seret untuk mengubah urutan, catatan revisi per halaman.
- **Papan produksi** di beranda; **preset cetak bernama** (bisa diekspor/impor).

Belum ada: proof lewat galeri klien (butuh perubahan API dan situs), profil warna percetakan (ICC), pembaruan otomatis.

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
