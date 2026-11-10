# Rencana proyek — aplikasi desktop album foto ("Lintas Waktu Album")

Status: **usulan, belum dikerjakan.** Dibuat 2026-11-10; keputusan pemilik dicatat di bagian 9 (2026-11-10).

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

Dua jalur masuk, satu jalur keluar:

```
Jalur 1 (klien memilih):  Klien memilih di galeri → aplikasi menarik daftar pilihan → cocokkan dengan file asli
Jalur 2 (kami memilih):   Buka folder acara (ribuan foto) → kurasi cepat di aplikasi → foto terpilih
        ↓
Tata letak otomatis → edit per spread → kirim proof ke klien (galeri web ATAU PDF lewat WhatsApp)
→ revisi sampai disetujui → ekspor file cetak → percetakan → lacak: dicetak → dikirim → diterima
```

Jalur 2 dipakai untuk acara panjang dengan ribuan foto: kami yang memilih dan mendesain dulu, klien baru melihat
album jadi dan meminta revisi kalau perlu.

## 3. Fitur
### A. Membuat
- Proyek album baru dari sesi yang ada di API (nama klien, tanggal, daftar foto pilihan) atau dari folder biasa.
- Mencocokkan pilihan klien dengan **file asli resolusi penuh** di laptop lewat nama file; yang tidak ketemu ditandai.
- **Kurasi cepat** untuk jalur 2: buka folder berisi ribuan foto, lihat satu per satu atau per kisi, tandai dengan
  keyboard (pilih / lewati / bintang), filter menurut waktu pemotretan, dan penghitung "terpilih 84 dari target 80".
  Thumbnail dibuat di latar belakang supaya folder 3.000+ foto tetap lancar.
- Preset ukuran album: **A4 (21×29,7 cm) sebagai bawaan**, tegak dan mendatar, plus 20×30, 25×25, 30×30 cm dan ukuran
  bebas; jumlah halaman bisa diatur. Preset percetakan terpisah (bleed, zona aman, lipatan).
- Tata letak otomatis: titik awalnya algoritma `layoutPages` di `AlbumPreview.tsx` (1–3 foto per halaman, mengikuti
  orientasi), diperluas dengan foto satu spread penuh dan urutan mengikuti waktu pemotretan.

### Semua bisa diatur (prinsip desain)
Tidak ada angka cetak atau tata letak yang dikunci di kode. Aplikasi datang dengan nilai bawaan yang umum dipakai,
dan semuanya bisa diubah, disimpan sebagai preset, lalu dipilih per album:

| Yang diatur | Bawaan | Pilihan |
|---|---|---|
| Ukuran & orientasi | A4 mendatar | A4 tegak, 20×30, 25×25, 30×30 cm, ukuran bebas (cm) |
| Jumlah halaman | 20 | bebas; tambah/hapus spread kapan saja |
| Bleed | 3 mm tiap sisi | 0–10 mm |
| Zona aman | 5 mm dari tepi potong, 10 mm dari lipatan | bebas |
| Jilid | lipatan tengah rata (layflat) | jilid biasa (foto tidak melewati lipatan) |
| Resolusi & warna | 300 dpi, sRGB | 150–600 dpi; profil warna lain menyusul |
| Format ekspor | JPG per spread, kualitas maksimum | JPG per halaman, PDF satu file, PNG |
| Nama file | `NamaKlien_01.jpg` | pola bebas |
| Margin & jarak antar foto | 7% tepi, 2% jarak | bebas, per album atau per halaman |
| Latar halaman | putih | warna bebas (krem brand, hitam) |

Preset percetakan = satu set nilai di atas dengan nama (mis. "Percetakan X · A4 layflat"); bisa dibuat, diduplikat,
diekspor/diimpor sebagai file untuk dipakai di laptop kedua. Nilai bawaan adalah kebiasaan umum percetakan, **bukan**
spesifikasi satu percetakan tertentu: sebelum pesanan pertama, cocokkan sekali dengan percetakan yang dipakai.

**Tata letak halaman dipilih sendiri.** Tata letak otomatis hanya titik awal:
- Galeri template per halaman dan per spread, dikelompokkan menurut jumlah foto (1, 2, 3, 4, 5+) dan gaya (penuh
  sampai tepi, bermargin, kolase, satu foto melintasi spread). Klik template → halaman langsung berubah.
- "Acak ulang" untuk satu halaman, satu spread, atau seluruh album; halaman yang sudah pas bisa **dikunci**.
- Template buatan sendiri: susun bingkai bebas di halaman, simpan sebagai template, pakai lagi di album lain.
- Gaya album (set template + margin + latar) bisa disimpan, mis. "Bersih bermargin" dan "Kolase penuh".

### B. Mengedit
- Editor spread: seret untuk menukar foto, ganti template halaman, geser/perbesar foto di dalam bingkai, atur margin.
- Baki foto: yang belum dipakai, yang dipakai dua kali, filter menurut bagian acara.
- Sampul: foto, judul, nama, tanggal dalam huruf brand (Cormorant Garamond, Montserrat).
- Undo/redo, simpan otomatis, duplikat album (mis. versi orang tua).
- Pemeriksaan sebelum cetak: resolusi terlalu rendah, wajah/teks terlalu dekat lipatan atau tepi potong, halaman kosong.

### C. Mengelola produksi
- Papan status: Desain → Proof dikirim → Revisi → Disetujui → Dipesan → Dicetak → Dikirim → Diterima.
- Per album: percetakan, biaya cetak, harga jual, tenggat, nomor resi, catatan.
- Proof ke klien, **dua cara yang dipilih per album**: (a) pratinjau spread diunggah ke galeri klien, klien memberi
  komentar per spread dan menekan "Setuju"; (b) PDF pratinjau kecil bernomor halaman untuk dikirim lewat WhatsApp,
  revisi dan persetujuan dicatat manual di aplikasi. Setiap putaran revisi disimpan sebagai versi (v1, v2, ...).
- Ekspor: JPG per spread dan PDF siap cetak (300 dpi, sRGB, dengan bleed), plus PDF pratinjau kecil untuk WhatsApp.
- Daftar tenggat: album mana yang paling dekat batas waktunya.

## 4. Teknologi (usulan)
| Bagian | Pilihan | Alasan |
|---|---|---|
| Kerangka desktop | **Tauri 2** | Installer kecil (±10 MB), target **Windows** (WebView2 sudah ada di Windows 10/11), UI ditulis dengan React seperti `web/` |
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
| 0. Spesifikasi | Sketsa layar; daftar ±20 template halaman awal; bentuk file preset | Sketsa yang disetujui pemilik | 1 minggu |
| 1. Editor inti | Proyek dari folder, proxy, **kurasi cepat**, tata letak otomatis, editor spread dengan galeri template dan kunci halaman, pengaturan preset cetak, simpan/undo, ekspor JPG + PDF cetak + **PDF pratinjau WhatsApp**, catatan revisi manual | Album pertama (jalur 2) bisa dipilih, didesain, direvisi, dan dicetak | 5–6 minggu |
| 2. Sambung ke galeri | Tarik sesi + pilihan klien, cocokkan file asli, unggah proof, komentar + setuju di galeri | Klien menyetujui album tanpa kirim-kiriman file | 2 minggu |
| 3. Produksi | Papan status, biaya, tenggat, resi, halaman status di admin | Semua album terpantau di satu tempat | 1–2 minggu |
| 4. Poles | Sampul, template buatan sendiri, gaya album, pemeriksaan sebelum cetak, installer Windows, pembaruan otomatis | Siap dipakai harian oleh dua orang | 2 minggu |

Setiap fase berakhir dengan satu album sungguhan dikerjakan dari awal sampai akhir sebagai uji.

## 7. Cara menguji
- Tes unit untuk tata letak (setiap foto dipakai tepat sekali, tidak ada sel di luar halaman) dan hitungan ekspor
  (ukuran piksel = ukuran cm × 300 dpi + bleed).
- Tes API (`cd api && python -m pytest -q`) untuk endpoint album dan izin PIN.
- Uji cetak: satu album contoh ke percetakan di akhir fase 1; bandingkan warna dan potongan dengan layar.
- Uji beban: kurasi folder 3.000 foto dan proyek 150 foto asli (±25 MB per file) tetap lancar di laptop 8 GB RAM.

## 8. Risiko
| Risiko | Penanganan |
|---|---|
| Warna cetak beda dari layar | Versi 1 hanya sRGB; uji cetak di fase 1; profil percetakan menyusul kalau perlu |
| Spesifikasi tiap percetakan berbeda | Preset per percetakan yang bisa diedit, bukan angka tetap di kode |
| File besar membuat aplikasi lambat | Edit dengan proxy; file asli hanya dibuka saat ekspor, satu spread per kali |
| Nama file asli berubah setelah diunggah | Cocokkan dengan nama + waktu pemotretan (EXIF); sisanya dicocokkan manual |
| Installer diberi peringatan oleh Windows (SmartScreen) | Untuk dua pengguna internal cukup "tetap jalankan"; tanda tangan kode (berbayar) tidak diperlukan |
| Menyita waktu dari pekerjaan klien | Berhenti setelah fase 1 kalau editor inti saja sudah cukup menghemat waktu |

## 9. Keputusan
Dijawab pemilik 2026-11-10:
1. **Sistem operasi:** Windows saja.
2. **Ukuran:** biasanya A4; ukuran lain tetap disediakan.
3. **Penjualan:** album adalah tambahan berbayar, bukan isi paket.
4. **Persetujuan klien:** dua cara disediakan (galeri web dan PDF lewat WhatsApp), dipilih per album.
5. **Cakupan:** hanya untuk Lintas Waktu; tanpa akun, lisensi, atau tanda tangan kode.
6. **Sumber foto:** bukan hanya pilihan klien; untuk acara panjang kami yang memilih (jalur 2, kurasi cepat).
7. **Fleksibel di semua hal:** spesifikasi cetak, ukuran/orientasi, dan tata letak tiap halaman dipilih di dalam
   aplikasi (lihat "Semua bisa diatur"); aplikasi memakai nilai bawaan umum, tidak menunggu spesifikasi percetakan.

Tidak ada keputusan yang masih terbuka. Satu pemeriksaan sebelum pesanan cetak pertama: cocokkan preset dengan percetakan.

## 10. Langkah berikutnya
Tulis spesifikasi fase 0 (daftar template awal, sketsa layar: kurasi, editor spread, pengaturan preset) dan buat
kerangka `desktop/` dengan Tauri dan layar pertama (buka folder → kurasi → tata letak otomatis → ekspor satu spread)
sebagai bukti alur.
