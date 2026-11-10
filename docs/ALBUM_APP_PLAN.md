# Rencana proyek — aplikasi desktop album foto ("Lintas Waktu Album")

Status: **usulan, belum dikerjakan.** Dibuat 2026-11-10. Keputusan di bagian 9 perlu dijawab pemilik sebelum fase 1 mulai.

## 1. Tujuan
Satu aplikasi di laptop untuk **membuat, mengedit, dan mengelola produksi** album foto klien, dari pilihan klien di galeri
sampai album sampai di tangan mereka. Sekarang album hanya ada sebagai pratinjau kasar di galeri klien
(`web/src/components/gallery/AlbumPreview.tsx`); desain akhirnya dikerjakan manual di luar sistem.

Berhasil kalau:
- Album 20 halaman dari 60–80 foto pilihan selesai didesain dalam **≤ 1 jam** (sekarang perkiraan 3–5 jam manual).
- File cetak keluar sesuai spesifikasi percetakan tanpa diperbaiki ulang (ukuran, bleed, 300 dpi, sRGB).
- Setiap album punya status yang jelas, jadi tidak ada yang terlupa atau terlambat.

Bukan tujuan versi pertama: retouch foto (tetap di Lightroom), toko online album, aplikasi HP, kolaborasi dua orang
mengedit bersamaan.

## 2. Pengguna dan alur kerja
Pengguna: Nanta dan Yukti (2 orang, laptop masing-masing). Klien tidak memasang apa pun; mereka melihat proof di galeri web.

```
Klien memilih foto di galeri  →  Aplikasi menarik daftar pilihan  →  Cocokkan dengan file asli di laptop
→  Tata letak otomatis  →  Edit per spread  →  Kirim proof ke galeri klien  →  Klien komentar / setuju
→  Ekspor file cetak  →  Pesan ke percetakan  →  Lacak: dicetak → dikirim → diterima
```

## 3. Fitur
### A. Membuat
- Proyek album baru dari sesi yang ada di API (nama klien, tanggal, daftar foto pilihan) atau dari folder biasa.
- Mencocokkan pilihan klien dengan **file asli resolusi penuh** di laptop lewat nama file; yang tidak ketemu ditandai.
- Preset ukuran album (mis. 20×30, 25×25, 30×30 cm; jumlah halaman) dan preset percetakan (bleed, zona aman, lipatan).
- Tata letak otomatis: titik awalnya algoritma `layoutPages` di `AlbumPreview.tsx` (1–3 foto per halaman, mengikuti
  orientasi), diperluas dengan foto satu spread penuh dan urutan mengikuti waktu pemotretan.

### B. Mengedit
- Editor spread: seret untuk menukar foto, ganti template halaman, geser/perbesar foto di dalam bingkai, atur margin.
- Baki foto: yang belum dipakai, yang dipakai dua kali, filter menurut bagian acara.
- Sampul: foto, judul, nama, tanggal dalam huruf brand (Cormorant Garamond, Montserrat).
- Undo/redo, simpan otomatis, duplikat album (mis. versi orang tua).
- Pemeriksaan sebelum cetak: resolusi terlalu rendah, wajah/teks terlalu dekat lipatan atau tepi potong, halaman kosong.

### C. Mengelola produksi
- Papan status: Desain → Proof dikirim → Revisi → Disetujui → Dipesan → Dicetak → Dikirim → Diterima.
- Per album: percetakan, biaya cetak, harga jual, tenggat, nomor resi, catatan.
- Proof ke klien: pratinjau spread diunggah ke galeri klien; klien memberi komentar per spread dan menekan "Setuju".
- Ekspor: JPG per spread dan PDF siap cetak (300 dpi, sRGB, dengan bleed), plus PDF pratinjau kecil untuk WhatsApp.
- Daftar tenggat: album mana yang paling dekat batas waktunya.

## 4. Teknologi (usulan)
| Bagian | Pilihan | Alasan |
|---|---|---|
| Kerangka desktop | **Tauri 2** | Installer kecil (±10 MB), jalan di Windows dan macOS, UI ditulis dengan React seperti `web/` |
| UI | React + TypeScript + Tailwind | Sama dengan situs; komponen logo dan warna brand bisa dipakai ulang |
| Pengolahan gambar | Rust (`image`, `fast_image_resize`) | Membuat proxy dan mengekspor file besar tanpa membuat UI macet |
| Data lokal | SQLite + file proyek `.lwalbum` (JSON) | Bekerja tanpa internet; file proyek bisa dicadangkan/dipindah |
| Sinkron | API FastAPI yang ada (`api/`) | Menarik sesi dan pilihan klien, mengunggah proof, menyimpan status |
| Lokasi kode | folder `desktop/` di repo ini | Satu repo, satu aturan commit; tidak ikut ter-deploy ke Vercel/Railway |

Prinsip:
- **File asli tidak pernah diunggah.** Aplikasi mengedit dengan proxy kecil (±2000 px) dan hanya membuka file asli saat ekspor.
- **Tetap bisa dipakai tanpa internet**; sinkron saat tersambung.
- Token admin disimpan di keychain sistem operasi, tidak di file.

Alternatif yang ditolak: Electron (installer ±150 MB, boros memori untuk foto besar); aplikasi web saja (tidak bisa
membaca folder foto asli 20–40 GB di laptop dengan nyaman).

## 5. Perubahan di API dan web
- API: tabel `albums` (sesi, status, ukuran, percetakan, biaya, tenggat, resi) dan `album_spreads` (urutan, gambar
  proof, komentar klien, disetujui); endpoint admin untuk CRUD dan unggah proof; endpoint galeri untuk komentar dan
  persetujuan (dilindungi PIN galeri yang ada).
- Web: tab "Album" di galeri klien (lihat proof, komentar, tombol Setuju; EN/ID); halaman admin ringkas untuk melihat
  status semua album dari HP.

## 6. Tahapan
Perkiraan kasar untuk pengerjaan paruh waktu; dikoreksi setelah fase 0.

| Fase | Isi | Hasil yang bisa dipakai | Perkiraan |
|---|---|---|---|
| 0. Spesifikasi | Jawab keputusan bagian 9; kumpulkan spesifikasi 1–2 percetakan; sketsa layar | Dokumen spesifikasi + ukuran album pasti | 1 minggu |
| 1. Editor inti | Proyek dari folder, proxy, tata letak otomatis, editor spread, simpan/undo, ekspor JPG + PDF | Album pertama bisa didesain dan dicetak | 3–4 minggu |
| 2. Sambung ke galeri | Tarik sesi + pilihan klien, cocokkan file asli, unggah proof, komentar + setuju di galeri | Klien menyetujui album tanpa kirim-kiriman file | 2 minggu |
| 3. Produksi | Papan status, biaya, tenggat, resi, halaman status di admin | Semua album terpantau di satu tempat | 1–2 minggu |
| 4. Poles | Sampul, pemeriksaan sebelum cetak, installer Windows/macOS, pembaruan otomatis | Siap dipakai harian oleh dua orang | 2 minggu |

Setiap fase berakhir dengan satu album sungguhan dikerjakan dari awal sampai akhir sebagai uji.

## 7. Cara menguji
- Tes unit untuk tata letak (setiap foto dipakai tepat sekali, tidak ada sel di luar halaman) dan hitungan ekspor
  (ukuran piksel = ukuran cm × 300 dpi + bleed).
- Tes API (`cd api && python -m pytest -q`) untuk endpoint album dan izin PIN.
- Uji cetak: satu album contoh ke percetakan di akhir fase 1; bandingkan warna dan potongan dengan layar.
- Uji beban: proyek 150 foto asli (±25 MB per file) tetap lancar di laptop 8 GB RAM.

## 8. Risiko
| Risiko | Penanganan |
|---|---|
| Warna cetak beda dari layar | Versi 1 hanya sRGB; uji cetak di fase 1; profil percetakan menyusul kalau perlu |
| Spesifikasi tiap percetakan berbeda | Preset per percetakan yang bisa diedit, bukan angka tetap di kode |
| File besar membuat aplikasi lambat | Edit dengan proxy; file asli hanya dibuka saat ekspor, satu spread per kali |
| Nama file asli berubah setelah diunggah | Cocokkan dengan nama + waktu pemotretan (EXIF); sisanya dicocokkan manual |
| Installer diberi peringatan oleh Windows/macOS | Untuk dua pengguna internal cukup "tetap jalankan"; tanda tangan kode (berbayar) hanya kalau dibagikan ke luar |
| Menyita waktu dari pekerjaan klien | Berhenti setelah fase 1 kalau editor inti saja sudah cukup menghemat waktu |

## 9. Keputusan yang perlu dijawab
1. **Sistem operasi** laptop Nanta dan Yukti (Windows, macOS, atau keduanya)?
2. **Percetakan** yang dipakai sekarang dan ukuran album yang dijual (ini menentukan preset pertama)?
3. **Album dijual sebagai apa**: tambahan berbayar seperti di ratecard (album kolase 20 hlm + box Rp 1 jt), atau masuk paket?
4. **Persetujuan klien** lewat galeri web (usulan) atau cukup PDF lewat WhatsApp untuk versi pertama? Yang kedua memangkas fase 2.
5. **Hanya untuk Lintas Waktu**, atau suatu saat dijual ke fotografer lain? Kalau dijual, butuh akun, lisensi, dan tanda tangan kode sejak awal.

## 10. Langkah berikutnya
Setelah lima hal di atas dijawab: tulis spesifikasi fase 0 (ukuran, preset, sketsa layar), lalu buat kerangka `desktop/`
dengan Tauri dan layar pertama (buka folder → tata letak otomatis → ekspor satu spread) sebagai bukti alur.
