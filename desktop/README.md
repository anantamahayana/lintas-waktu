# LW Album (desktop)

Aplikasi Windows untuk memilih foto, menyusun album, mengirim proof ke klien, dan mengekspor file cetak.
Versi terbaru: lihat `package.json` (0.4.8 per 18 Nov 2026). Rencana, status, rilis, dan backlog: `docs/ALBUM_APP_PLAN.md`.

## Menjalankan
```
cd desktop
npm install
npm run dev        # pratinjau di browser: http://localhost:1420 (Chrome/Edge)
npm test           # tes tata letak, hitungan cetak, sampul
npx tsc --noEmit   # typecheck (wajib sebelum commit)
npm run build      # typecheck + build web
```
Installer Windows dan pembaruan: GitHub Actions → **Album app (Windows installer)** (centang *release* untuk menerbitkan
pembaruan; langkah lengkap di `docs/ALBUM_APP_PLAN.md` → Rilis). Di Windows dengan Rust: `npx tauri dev` / `npx tauri build`.

## Aplikasi Windows vs pratinjau web
| | Aplikasi Windows | Pratinjau web (`npm run dev`) |
|---|---|---|
| Folder foto | dibaca dari disk, diingat per proyek | dipilih ulang tiap buka proyek |
| Format | JPG/PNG/WebP + RAW (CR2, CR3, NEF, ARW, RAF, ORF, RW2, DNG, … lewat pratinjau JPEG di file RAW) | JPG/PNG/WebP |
| Proyek | `Documents\LW Album\Proyek\*.lwalbum` + 30 versi di `.versi` | penyimpanan browser |
| Ekspor | langsung ke folder pilihan | satu file .zip |
| Pembaruan otomatis | ya | tidak |
Kode yang menyentuh file: `src/lib/platform.ts` (sisi web) dan `src-tauri/src/` (sisi Windows).

## Fitur per modul
Semua pintasan bisa dilihat di aplikasi (**Ctrl+/**) dan diubah (**Ctrl+,**). Pindah modul: **Ctrl+Alt+1–4**.

**Beranda**
- Proyek baru (nama, titik awal ukuran A4 mendatar/tegak, 25×25, 30×30, semua properti album), proyek terakhir, buka file proyek lain.
- **Papan produksi**: Desain → Proof ke klien → Revisi → Disetujui → Dipesan → Dicetak → Dikirim → Diterima; seret kartu; klien, tenggat (peringatan ≤ 3 hari), percetakan, biaya, harga jual, resi, catatan.

**Kurasi**
- Kisi virtual (ribuan foto lancar), satu foto, zoom 100% (Spasi/Z), banding 2–4 (C / Shift+klik), burst (B = ambil ini saja).
- `P` pilih, `X` lewati, `U` batal, `1`–`5` bintang, `G` kisi; saringan jam (histogram), kamera, bintang, dilewati; target jumlah; Pilih semua.

**Tata letak (Editor)**
- Susun otomatis menurut bentuk foto, atau album kosong yang diisi dengan menyeret dari baki (baki: dipilih / semua foto).
- Per halaman: jumlah foto 1–4 dan template (perubahan **hanya** halaman itu; foto lebih kembali ke baki), acak, kunci, template buatan sendiri (kisi, sampai 12 bingkai, juga untuk dua halaman).
- **Panorama** (sambung dua halaman, jilid layflat), pisahkan lagi.
- Bingkai bebas: geser, ubah ukuran (Shift menjaga bentuk), magnet ke tepi/tengah/margin/zona aman/bingkai lain (Alt tanpa magnet), panah 0,5 mm (Shift 5 mm).
- Multi-pilih (Shift+klik, seret kotak, Ctrl+A) → ratakan (Alt+Shift+A/H/D/W/V/S), sebar rata, samakan jarak/lebar/tinggi.
- Atur foto dalam bingkai: klik dua kali / Enter → seret, roda/pegangan untuk perbesar, Enter/Esc selesai.
- Foto: Ctrl+X/C/V (tempel ke bingkai atau halaman), Del = kosongkan, Shift+Del = hapus bingkai, Shift+H = jadikan foto utama; seret foto ke thumbnail spread (tahan 0,6 detik membuka spread itu).
- Halaman: klik kertas untuk memilih; bingkai kosong (F), halaman baru, kosongkan, hapus halaman; warna latar dan garis per halaman; salin/tempel tata letak; teks (6 font, mm, warna, rata, jarak huruf).
- **Semua spread**: baca alur dan seret urutan spread.
- Kanvas: zoom pinch touchpad / Ctrl+roda (di titik kursor), Ctrl+1 = 100%, Ctrl+0 / klik dua kali area kosong = pas layar, geser dengan Spasi atau klik tengah, usap dua jari ke samping = ganti spread, ← → = spread sebelumnya/berikutnya saat tidak ada yang dipilih.
- Catatan revisi per halaman; tab **Revisi**: status proof online (dibuka berapa kali, disetujui), catatan klien dengan nomor, centang Selesai (tersimpan di server), Buka (catatan sampul membuka modul Sampul), **pin bernomor di spread** (klik = buka catatannya, N = tampil/sembunyi).

**Sampul**
- Foto depan/belakang (penuh atau berbingkai) atau **panorama** satu foto belakang–punggung–depan (P).
- Seret foto untuk menggeser, pinch / Ctrl+roda / `=` `-` untuk perbesar, klik dua kali / `0` pusatkan, panah geser, Shift+S tukar depan↔belakang, Del lepas foto, S tukar sisi.
- Judul, keterangan, judul di punggung, font, warna, lebar punggung, lipatan papan; ikut ke ekspor dan proof.

**Ekspor**
- Preset cetak bernama (simpan, pakai, hapus, ekspor/impor); ukuran, orientasi, bleed, zona aman, dpi, jilid.
- Pemeriksaan sebelum ekspor (bingkai kosong, resolusi rendah, catatan revisi terbuka, sampul) dengan tombol ke halamannya.
- JPG per spread dari file asli (bleed dan dpi tertulis di file), sampul `_00_Sampul.jpg`, PDF cetak, PDF pratinjau kecil bernomor untuk WhatsApp.

**Proof online** (Album › Kirim proof ke klien…, Ctrl+Shift+K)
- Masuk sekali dengan password admin situs (yang disimpan hanya token 8 jam), nama klien, bahasa EN/ID, masa berlaku, catatan boleh/tidak, tanda air PROOF, sertakan sampul.
- Aplikasi membuat JPEG ±2.000 px per spread, mengunggah, lalu memberi link `/p/<kode>` + PIN + pesan WhatsApp. Kirim lagi = versi baru di link yang sama; tahap proyek jadi "Proof ke klien".

**Umum**
- Simpan otomatis, urungkan/ulangi, judul jendela memuat nama proyek, Tab sembunyikan panel, F11 layar penuh.
- Pembaruan otomatis (5 detik setelah dibuka, sekali; Bantuan › Periksa pembaruan…; bisa dimatikan).
- Kalau satu bagian galat, muncul pesan pemulihan (Ulangi / Urungkan / Tampilkan ulang / Beranda / Salin detail galat).

## Peta kode
| File | Isi |
|---|---|
| `src/App.tsx` | proyek, modul, simpan otomatis, urungkan/ulangi |
| `src/views/Shell.tsx` | bilah menu, bilah modul, status, komponen UI dasar |
| `src/views/Beranda.tsx`, `Papan.tsx`, `PresetForm.tsx` | beranda, papan produksi, properti album |
| `src/views/Kurasi.tsx` | kurasi |
| `src/views/Editor.tsx`, `Sheet.tsx`, `Overview.tsx`, `TemplateEditor.tsx` | tata letak, kertas spread (bingkai, teks, crop), semua spread, template sendiri |
| `src/views/Sampul.tsx` | sampul |
| `src/views/Ekspor.tsx` | ekspor dan pemeriksaan |
| `src/views/Proof.tsx` | kirim proof dan panel Revisi (`RevisionPanel`, `pinNumbers`) |
| `src/views/Update.tsx` | pemberitahuan pembaruan |
| `src/lib/layout.ts` | model album: halaman, template, susun otomatis, ubah jumlah, panorama, hapus/tempel |
| `src/lib/print.ts`, `frames.ts`, `align.ts` | ukuran cetak (mm → px), bleed, crop; posisi bingkai; ratakan/sebar |
| `src/lib/export.ts`, `pdf.ts`, `zip.ts`, `cover.ts`, `paint.ts` | menggambar spread/sampul ukuran cetak, PDF, zip |
| `src/lib/photos.ts`, `cull.ts`, `platform.ts` | membaca folder, thumbnail, EXIF, burst; jembatan web/Windows |
| `src/lib/keys.ts` | **semua pintasan** (CATALOG) + menu; tambah pintasan baru di sini |
| `src/lib/proofs.ts`, `update.ts`, `projects.ts` | API proof online, pembaruan otomatis, file proyek |
| `src/lib/lib.test.ts` | tes (`npm test`) |
| `src-tauri/src/main.rs`, `photos.rs` | perintah Windows (folder, thumbnail, RAW, simpan file), plugin updater/dialog |
| `src-tauri/tauri.conf.json` | versi, jendela, kunci publik pembaruan |

## Aturan saat mengubah
- Pintasan baru → daftarkan di `src/lib/keys.ts` (jangan menangkap keydown sendiri), supaya muncul di menu, tooltip, dan Ctrl+/.
- Perubahan tata letak harus **lokal**: mengubah satu halaman tidak boleh menggeser foto di halaman lain (ada tesnya).
- Rilis = naikkan versi di 5 tempat + Actions (lihat `docs/ALBUM_APP_PLAN.md`).
