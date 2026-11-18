# Aplikasi album "LW Album" — rencana dan status

Diperbarui 18 November 2026 · versi terpasang terbaru **0.4.8**.
Kode: `desktop/` (cara menjalankan, peta kode, daftar fitur lengkap per modul: `desktop/README.md`).
Riwayat per versi: `docs/CHANGELOG.md` (cari "Aplikasi album" / "album 0.x").

## Ringkasan status
| Fase (rencana awal) | Status | Isi yang sudah jalan |
|---|---|---|
| 0. Spesifikasi | ✅ | Desain di Figma "Editing Album LW" (halaman 01–10); sejak diterapkan, kode `desktop/src` yang jadi acuan |
| 1. Editor inti | ✅ | Folder → kurasi → susun otomatis → editor → ekspor JPG/PDF cetak + PDF pratinjau WhatsApp |
| 2. Sambung ke web | ✅ (sebagian) | **Proof online** dari aplikasi ke `/p/<kode>` + catatan klien kembali ke tab Revisi. *Belum:* menarik pilihan klien dari galeri `/g/` untuk dicocokkan dengan file asli |
| 3. Produksi | ✅ (lokal) | Papan produksi 7 tahap di Beranda (tersimpan di laptop). *Belum:* status album di server/admin web |
| 4. Poles | ✅ | Sampul (termasuk panorama), template sendiri, preset cetak bernama, pemeriksaan sebelum ekspor, installer Windows, **pembaruan otomatis** |

Dipakai harian oleh Nanta dan Yukti (Windows). Masukan pengguna dicatat sebagai versi 0.4.x.

## 1. Tujuan (tetap)
Satu aplikasi di laptop untuk **membuat, mengedit, dan mengelola produksi** album foto klien, dari pemilihan foto sampai
album diterima klien. Berhasil kalau album 20 halaman dari 60–80 foto selesai ≤ 1 jam, file cetak lolos tanpa perbaikan,
dan setiap album punya status yang jelas.
Bukan tujuan: retouch (tetap di Lightroom), toko online album, aplikasi HP, dua orang mengedit album yang sama bersamaan.

## 2. Alur kerja sekarang
```
Buka folder acara (JPG/PNG/WebP/RAW) → Kurasi (ribuan foto, pilih/bintang/burst/banding)
→ Tata letak (susun otomatis atau isi sendiri) → Sampul → Pemeriksaan
→ Kirim proof ke klien (link + PIN, pesan WhatsApp)   atau   PDF pratinjau lewat WhatsApp
→ Klien memberi catatan bertitik / menyetujui di web → catatan muncul di tab Revisi + pin di spread
→ Revisi → kirim versi baru (link sama) → Disetujui
→ Ekspor file cetak (JPG per spread / PDF cetak, sampul `_00_Sampul.jpg`) → Papan produksi: Dipesan → Dicetak → Dikirim → Diterima
```
Jalur "klien memilih di galeri `/g/` lalu aplikasi menarik pilihannya" belum ada; sementara folder pilihan klien dibuka langsung.

## 3. Fitur per modul (ringkas; rincian dan pintasan di `desktop/README.md` dan Ctrl+/ di aplikasi)
- **Beranda**: proyek baru (nama, titik awal ukuran, semua properti album), proyek terakhir, buka file `.lwalbum` lain, **papan produksi** (7 tahap, seret kartu, klien, tenggat, percetakan, biaya, harga jual, resi, catatan).
- **Kurasi**: kisi virtual ribuan foto, satu foto, zoom 100%, banding 2–4, burst, saringan jam/kamera/bintang, target jumlah, Pilih semua, RAW lewat pratinjau JPEG di dalam file.
- **Tata letak (Editor)**: susun otomatis, album kosong diisi dari baki, jumlah foto 1–4 + template per halaman (lokal, tidak menggeser halaman lain), template sendiri, acak, kunci, panorama dua halaman, bingkai bebas (geser/ubah ukuran, magnet), multi-pilih + ratakan/sebar, atur foto dalam bingkai (klik dua kali), teks 6 font, latar/garis per halaman, salin/tempel tata letak, Semua spread (seret urutan), potong/salin/tempel foto, Jadikan utama, catatan revisi per halaman, tab **Revisi** (status proof, catatan klien, pin bernomor di spread, N = tampil/sembunyi), zoom (pinch touchpad, Ctrl+roda di titik kursor, Ctrl+1/0), geser kanvas (Spasi/klik tengah), ← → pindah spread.
- **Sampul**: foto depan/belakang atau **panorama** satu foto (P), seret/pinch/pusatkan foto, judul/keterangan/punggung + font, warna, lebar punggung, lipatan papan.
- **Ekspor**: preset cetak bernama (ekspor/impor), ukuran/orientasi/bleed/zona aman/dpi/jilid, pemeriksaan (bingkai kosong, resolusi rendah, catatan terbuka, sampul), JPG per spread, PDF cetak, PDF pratinjau.
- **Proof online**: Album › Kirim proof ke klien… (Ctrl+Shift+K): login admin situs (token 8 jam), bahasa klien, masa berlaku, catatan boleh/tidak, tanda air, sampul → link + PIN + pesan WhatsApp. Versi baru di link yang sama.
- **Umum**: menu bar + pintasan yang bisa diubah (Ctrl+,), simpan otomatis + 30 versi lama, urungkan/ulangi, pembaruan otomatis dari GitHub Releases, pesan pemulihan kalau satu bagian galat (0.4.8).

## 4. Teknologi dan data
| Bagian | Pilihan |
|---|---|
| Kerangka | **Tauri 2** (Rust) + React + TypeScript + Vite; Windows saja (WebView2) |
| File proyek | `Documents\LW Album\Proyek\*.lwalbum` (JSON), 30 versi lama di `.versi`; folder foto diingat per proyek |
| Gambar | thumbnail dibuat di Rust (`src-tauri/src/photos.rs`) dan di-cache; ekspor dari file asli di kanvas |
| Pratinjau web | `npm run dev` di browser (Chrome/Edge) untuk mencoba UI; folder dipilih ulang, hanya JPG/PNG/WebP, ekspor .zip |
| API | `https://api.lintaswaktuvisual.com` (`desktop/src/lib/proofs.ts`, bisa diganti lewat localStorage `lwalbum:api`) |
| Pembaruan | `tauri-plugin-updater`, `releases/latest/download/latest.json` di repo ini, ditandatangani kunci privat (secret `TAURI_SIGNING_PRIVATE_KEY`); kunci publik di `tauri.conf.json` |

Prinsip tetap: file asli tidak pernah diunggah (proof memakai JPEG ±2.000 px), aplikasi tetap jalan tanpa internet
kecuali proof online, semua angka cetak dan tata letak bisa diatur (tidak ada spesifikasi percetakan yang dikunci di kode).

## 5. Rilis (siapa pun yang boleh push ke `main`: Nanta, Yukti)
1. Naikkan versi di `desktop/package.json`, `desktop/package-lock.json` (2 tempat), `desktop/src-tauri/tauri.conf.json`,
   `desktop/src-tauri/Cargo.toml`, dan entri `lw-album` di `desktop/src-tauri/Cargo.lock`.
2. `cd desktop && npm test && npx tsc --noEmit`; tambah entri CHANGELOG ("Aplikasi album 0.x.y: …"); commit, push ke `main`.
3. GitHub Actions → **Album app (Windows installer)** → Run workflow, centang *release*, isi catatan singkat (bahasa Indonesia).
4. ±5–15 menit kemudian terbit GitHub Release `album-v0.x.y`; aplikasi yang terpasang menawarkan pembaruan saat dibuka.
Jangan membuat GitHub Release lain di repo ini (aplikasi menganggap rilis terbaru = pembaruan). Kabari rekan sebelum merilis
supaya nomor versi tidak bentrok.

## 6. Pengujian
- `cd desktop && npm test`: tata letak (setiap foto dipakai sekali, perubahan halaman lokal, panorama), hitungan cetak (mm → px, bleed), sampul.
- Coba di pratinjau web (`npm run dev`) untuk alur UI; fitur khusus Windows (folder, RAW, ekspor ke folder, pembaruan) dicoba setelah rilis di laptop.
- Uji cetak: cocokkan preset dengan percetakan sebelum pesanan pertama; bandingkan warna dan potongan.

## 7. Masalah yang diketahui
- **Layar kosong setelah Ctrl+Z** (dilaporkan Yukti): sejak 0.4.8 muncul pesan pemulihan + "Salin detail galat"; akar masalah belum ketemu. Kalau terjadi lagi, kirim detail galatnya.
- Pinch-zoom touchpad di Tata letak bergantung pada driver touchpad (WebView2 mengirimnya sebagai Ctrl+roda); kalau tidak jalan, Ctrl+roda tetap bisa.
- Windows SmartScreen memperingatkan installer pertama (tanpa tanda tangan kode): pilih "More info → Run anyway". Pembaruan berikutnya tidak memunculkannya.

## 8. Belum dikerjakan / berikutnya (urut perkiraan manfaat)
1. Pin catatan klien untuk **sampul** di modul Sampul (sekarang pin hanya di spread).
2. Menarik **pilihan klien dari galeri `/g/`** dan mencocokkan dengan file asli (nama + waktu EXIF).
3. **Status album di server** (papan produksi tersinkron antara laptop Nanta dan Yukti, terlihat di admin web).
4. Profil warna percetakan (ICC) kalau hasil cetak meleset dari layar.
5. Desain proof mobile (kanvas artifact "Proof album mobile") disalin ke file Figma.

## 9. Keputusan pemilik
Dijawab 10 November 2026: Windows saja; A4 ukuran bawaan (lain tetap ada); album = tambahan berbayar; persetujuan klien
lewat galeri web atau PDF WhatsApp; hanya untuk Lintas Waktu (tanpa akun/lisensi/tanda tangan kode); sumber foto bisa
pilihan klien atau kurasi kami; semua angka cetak dan tata letak bisa diatur.
Ditambah kemudian: tema gelap + aksen biru `#2f6fe4` sesuai Figma (11 Nov); pintasan terpusat di `keys.ts`, pindah modul
Ctrl+Alt+1–4 (11 Nov); GitHub Releases repo ini khusus aplikasi album (12 Nov); edit jumlah/template halaman tidak boleh
menggeser halaman lain (13 Nov, masukan Yukti); Yukti boleh merilis sendiri (18 Nov).
