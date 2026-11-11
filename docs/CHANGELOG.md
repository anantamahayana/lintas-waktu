# Catatan perubahan

Yang terbaru di atas. Setiap perubahan yang di-push menambah satu entri di sini (aturannya di `CLAUDE.md`).
Format: `### YYYY-MM-DD · nama` lalu poin singkat. Isinya: apa yang berubah bagi pengguna, file/area utama,
dan **langkah manual** kalau ada. Detail teknis lengkap ada di pesan commit (`git log`).

---

### 2026-11-11 · NantaPakeAI
- Aplikasi album, tahap 3 "editor bebas": bingkai bisa **digeser dan diubah ukurannya** langsung di halaman (lingkaran biru untuk menggeser, 8 kotak putih untuk ukuran, Shift menjaga bentuk, magnet ke tepi, tengah, margin, zona aman, dan bingkai lain; Alt tanpa magnet; panah menggeser 0,5 mm, Shift+panah 5 mm); **teks** di halaman dengan 6 font bawaan (Cormorant Garamond, Playfair Display, Lora, Marcellus, Montserrat, Great Vibes), ukuran dalam mm, warna, rata, tebal/miring, jarak huruf, ikut tercetak; **gaya halaman** (warna latar per halaman, garis di sekeliling foto); **salin/tempel tata letak** antarhalaman; tampilan **Semua spread** untuk membaca alur cerita dan menyeret spread ke urutan baru (foto, teks, dan tata letaknya ikut).
- Aplikasi album, tahap 2 "kurasi ribuan foto": kisi yang hanya menggambar baris yang terlihat (lancar untuk ribuan foto, panah atas/bawah per baris); **zoom 100%** (Spasi/Z atau klik di titik yang ingin dicek, seret untuk menggeser); **banding** 2–4 foto berdampingan (C atau Shift+klik); **burst** (foto beruntun < 1,5 detik, kamera sama) dengan saringan "satu foto per burst" dan B untuk "ambil ini saja"; saringan jam pemotretan, kamera, dan "dilewati"; bintang tampil di foto; shortcut tetap bekerja setelah klik kotak centang.
- Aplikasi album (Windows, tahap 1 "pondasi"): folder foto dibaca langsung dari disk dan diingat (membuka proyek lama tidak perlu memilih folder lagi; kalau folder pindah, aplikasi minta lokasi barunya); proyek disimpan sebagai file `.lwalbum` di Documents\LW Album\Proyek dengan 30 versi lama di `.versi` (bisa disalin ke laptop lain, "Buka file proyek lain…"); thumbnail dibuat aplikasi secara paralel dan disimpan di cache; **RAW didukung** (CR2, CR3, NEF, ARW, RAF, ORF, RW2, DNG, dan lainnya, lewat pratinjau JPEG di dalam file RAW; RAW+JPEG dihitung satu foto); foto diurutkan menurut waktu pemotretan (EXIF); ekspor langsung ke folder pilihan dan simpan PDF lewat dialog Windows. Pratinjau web tetap seperti sebelumnya.
- Aplikasi album: tab **Sampul** (foto depan dan belakang, penuh atau berbingkai, judul dan keterangan, judul di punggung, warna, lebar punggung dan lipatan papan hardcover) yang ikut diekspor sebagai `_00_Sampul.jpg`; tombol **PDF pratinjau untuk klien** di Ekspor (kecil, tanpa bleed, nomor halaman di bawah tiap spread, sampul di halaman pertama) untuk dikirim lewat WhatsApp, dan **PDF cetak** resolusi penuh (sampul + semua spread, bleed termasuk, ukuran halaman sesuai cetak) untuk percetakan yang meminta PDF. Proof lewat galeri klien belum (butuh perubahan API dan situs).
- Aplikasi album: **beranda** saat dibuka (proyek baru dengan nama, titik awal ukuran, dan semua properti album yang tetap bisa diubah nanti; daftar proyek terakhir, buka dan hapus). **Pilih semua** di Kurasi. **Album kosong diisi sendiri**: tanpa memilih foto pun editor menampilkan semua foto di kiri untuk diseret ke bingkai; ada kosongkan/hapus bingkai dan tambah spread kosong. Tombol **Properti album** di bilah alat editor untuk mengubah ukuran, orientasi, jumlah halaman, jilid, bleed, dpi, margin, dan latar tanpa pindah ke tab Ekspor. Diperbaiki: tombol Susun otomatis, Susun ulang, Batalkan semua, dan Hapus proyek tidak bereaksi di pratinjau web (kotak konfirmasi bawaan browser diblokir di sana; kini memakai kotak konfirmasi aplikasi sendiri); Acak ulang tidak mengubah apa pun di halaman berisi 1 foto (kini ada 4 variasi 1 foto dengan ruang putih, dan pesan penjelasan kalau tetap tidak ada yang bisa diacak). Ekspor di pratinjau web (yang tidak boleh memilih folder) kini menyimpan semua spread dalam satu file .zip lewat dialog simpan claude.ai; di aplikasi Windows tetap ke folder pilihan. Pratinjau foto tegak di Kurasi tidak lagi mendorong deret thumbnail keluar layar.

### 2026-11-10 · NantaPakeAI
- Aplikasi album (`desktop/`, baru): versi pertama yang bisa dipakai. Buka folder foto → kurasi dengan keyboard (P pilih, X lewati, 1–5 bintang, target jumlah) → album disusun otomatis → edit per halaman (jumlah foto 1–4, pilih template, acak, kunci, seret untuk menukar, perbesar/geser foto, margin, jarak, latar, urungkan) → ekspor JPG per spread dari file asli (A4 mendatar bawaan: 7.087 × 2.551 px, 300 dpi, bleed 3 mm; semua angka bisa diubah) dengan peringatan resolusi rendah. Pekerjaan tersimpan otomatis per nama folder. Belum ada: sampul, PDF pratinjau, proof ke galeri, papan produksi. Situs, admin, dan API tidak berubah.
- Aplikasi album: **template buatan sendiri** (atur kisi, tandai bingkai dengan klik dua sudut, sampai 12 foto per halaman, tersimpan untuk semua album) dan **dua halaman menyambung** untuk jilid layflat (satu spread jadi satu lembar, foto boleh melintasi lipatan; 7 template spread bawaan; jenis jilid dipilih di Ekspor, jilid biasa diberi peringatan).
  **Manual:** untuk installer Windows, buka GitHub → Actions → "Album app (Windows installer)" → Run workflow, lalu unduh dari Artifacts (build Windows belum pernah dijalankan; kabari kalau gagal). Untuk mencoba tanpa installer: `cd desktop && npm install && npm run dev`, buka di Chrome/Edge.
- Rencana proyek aplikasi desktop album foto (membuat, mengedit, mengelola produksi album): `docs/ALBUM_APP_PLAN.md`. Baru usulan; situs, admin, dan API tidak berubah. Keputusan pemilik sudah dicatat di bagian 9: Windows, A4 sebagai ukuran bawaan, album sebagai tambahan berbayar, proof lewat galeri atau PDF WhatsApp, hanya untuk Lintas Waktu, dan jalur "kami yang memilih" dengan kurasi cepat untuk acara ribuan foto.
Semua pengaturan cetak (ukuran, orientasi, bleed, zona aman, jilid, format ekspor) dan tata letak tiap halaman dipilih di aplikasi, dengan nilai bawaan umum dan preset yang bisa disimpan.
  **Manual:** sebelum pesanan cetak pertama, cocokkan preset dengan percetakan yang dipakai.

### 2026-10-11 · NantaPakeAI
- Pemasaran: folder `marketing/` berisi riset pasar fotografi wedding Bali (harga pasar lokal vs asing, pesaing, saluran klien), rencana pemasaran 90 hari (13 Okt 2026 – 10 Jan 2027), daftar 45 calon mitra (kontak masih perlu dicek), dan template pesan EN/ID. Situs tidak berubah.

### 2026-10-08 · NantaPakeAI
- Keamanan: Next.js 16.3.5 → 16.3.8 (menambal celah kritis di gambar share `next/og` dan beberapa celah cache/SSRF), sharp diperbarui; API: Pillow, FastAPI/Starlette, python-multipart, uvicorn, lxml dkk. diperbarui, token admin pindah dari python-jose ke PyJWT (sesi admin yang sedang login tetap berlaku). Audit npm (produksi) dan pip: 0 celah. Logo SVG unggahan kini disajikan tanpa izin skrip. 6 tes keamanan baru (47 tes total). Detail: `docs/PLAN.md` → "Pemeriksaan keamanan".
  **Manual:** setelah deploy, cek Railway hijau dan `/api/health` = ok. Disarankan `SECRET_KEY` di Railway ≥ 32 karakter (log API akan memberi peringatan kalau lebih pendek; menggantinya membuat PIN galeri yang sedang aktif perlu dibagikan ulang, jadi lakukan saat tidak ada galeri berjalan).
- SEO: data terstruktur (schema.org) di semua halaman: profil bisnis foto & film di Bali dengan kontak, Instagram/YouTube, area layanan, rentang harga, dan 7 harga paket/layanan yang diambil dari teks admin (selalu sinkron); FAQ di Layanan (bisa tampil di hasil Google); data karya di halaman proyek. Judul & deskripsi Google baru: "Fotografer & Videografer Wedding di Bali", menyebut Editorial & Model dan duo; halaman Layanan berjudul "Layanan & Harga". Lighthouse SEO 100.
- Aksesibilitas: menu HP yang tertutup tidak lagi bisa dijangkau dengan Tab/pembaca layar; abu-abu teks (`mute`) sedikit digelapkan (#77756F → #74726C) agar lolos kontras WCAG AA. Skor aksesibilitas 92 → 96.
- Judul beranda di Google/tab: "Lintas Waktu Visual — Fotografer & Videografer Wedding di Bali"; nama situs untuk Google "Lintas Waktu Visual" (sama dengan kata yang dicari orang). Tampilan situs tetap "Lintas Waktu". Isi Google Business Profile siap salin: `docs/GOOGLE_BUSINESS.md`.
  **Manual:** buat Google Business Profile di business.google.com (panduan di file itu). Kalau judul Meta pernah diedit di Admin → Site text, versi admin yang tampil.
- Teks abu-abu dibuat lebih mudah dibaca: abu-abu isi (`mute`) #66645F dan abu-abu tersier (`faint`, mis. nomor langkah, hak cipta, Bali time) #75736D; keduanya lolos kontras WCAG AA, tingkatannya tetap. Aksesibilitas 100 di beranda, Layanan, Kontak.
  **Manual:** kalau judul/deskripsi pernah diedit di Admin → Site text (bagian Meta), versi admin yang tampil; samakan atau kosongkan. Cek hasilnya di search.google.com/test/rich-results dengan alamat beranda dan /services.
- Sumber animasi logo (Golden Hour, Terbit, Melintas) disimpan di `brand/motion/` beserta cara render ke MP4 dan overlay ProRes transparan (`brand/motion/README.md`). Video tidak disimpan di repo.

### 2026-10-05 · NantaPakeAI
- Domain: alamat situs diseragamkan ke `www.lintaswaktuvisual.com` (env `NEXT_PUBLIC_SITE_URL`, apex dialihkan 308). Sitemap dan link share kini memakai www, supaya Google tidak memegang dua alamat (ikon lama di hasil pencarian ikut diperbarui).
  **Manual:** kirim ulang sitemap `https://www.lintaswaktuvisual.com/sitemap.xml` di Search Console dan minta pengindeksan `https://www.lintaswaktuvisual.com/`.
- Beranda lebih lengkap: **Cara kami bekerja** (4 langkah: ngobrol → kunci tanggal → hari-H → galeri privat), **Paket & harga** (paket wedding dengan IDR/USD + harga mulai Pre-wedding, Acara, Editorial, Personal), **FAQ** (4 pertanyaan teratas, sisanya di Layanan), dan **Cek tanggal** di ajakan penutup: pilih tanggal → form Contact terbuka dengan jenis Wedding dan tanggal sudah terisi. Lighthouse beranda tetap 96, CLS 0.
  **Manual:** teks baru bisa diedit di Admin → Site text → Home (Cara kami bekerja, catatan harga); harga tetap dari tab Packages dan Services.

### 2026-10-01 · NantaPakeAI
- Logo baru **Gerbang Waktu** (gerbang, jalan yang melintas, matahari emas; tulisan LINTAS WAKTU dalam Marcellus) di seluruh situs: nav, menu HP, footer; galeri klien (layar pembuka, PIN, terima kasih); admin dan login admin; halaman cek invoice dan kop invoice. Favicon, ikon iPhone, dan gambar share (WhatsApp/Instagram) ikut baru. Emas Senja `#C8832F` jadi satu-satunya warna aksen (juga tombol pilih di galeri klien, dulu emas pucat). Aturan logo: `docs/BRAND.md` → 1a. Skor Lighthouse dan CLS tidak berubah.
  **Manual:** ganti foto profil Instagram/WhatsApp dengan `web/public/brand/avatar-1080.png` (atau `-dark`). Kalau di Admin → Settings pernah diunggah logo galeri atau nama studio diisi selain "Lintas Waktu", itu yang tampil di galeri klien, bukan logo baru. Pratinjau link lama di WhatsApp bisa masih menampilkan gambar lama sampai cache-nya habis.
- Nav: logo kini tersusun (gerbang di atas, LINTAS WAKTU, deskriptor) dalam satu poros tengah, simetris dengan menu kiri-kanan; garis bawah huruf wordmark di HP tidak lagi terpotong. Ikon di hasil Google sebelumnya adalah favicon bawaan Next/Vercel; file sudah diganti, Google memperbaruinya sendiri.
  **Manual:** di Google Search Console, minta indeks ulang beranda (Inspeksi URL → Minta pengindeksan) agar ikon baru lebih cepat muncul.
- Galeri klien: kartu pembuka memainkan animasi logo **Terbit** (gerbang muncul, jalan setapak terbentuk, matahari terbit, nama muncul per huruf), lalu "Galeri untuk …" menyusul; kartu tampil ±1 detik lebih lama. Hanya untuk sesi bernama Lintas Waktu tanpa logo unggahan. CSS saja (transform/opacity), tidak tampil untuk pengunjung yang mematikan animasi.

### 2026-09-29 · Yukti
- Admin → sesi: peringatan merah kalau paket lebih besar dari jumlah foto di folder (klien tidak akan pernah bisa memenuhinya). Login admin salah password kini "Wrong password" (admin berbahasa Inggris).
- Galeri klien (ID): sapaan seragam "kamu" (sebelumnya campur "Anda" di dialog kirim dan pratinjau album).
- Beranda (EN & ID) kembali punya judul halaman (tab browser, Google, bookmark); sebelumnya kosong.
- Header keamanan (seperti photo-selection-platform): situs tidak bisa dibingkai situs lain; galeri klien, invoice, dan admin tidak diindeks mesin pencari dan alamatnya tidak bocor ke situs lain lewat referrer.
- Form Contact: pesan tidak lagi hilang diam-diam (kalau API gagal, pengunjung diarahkan ke WhatsApp/email, bukan "terkirim"); batas 5 pesan/10 menit kini per pengunjung, bukan untuk seluruh situs; tombol "Lanjutkan di WhatsApp" menyiapkan pesan dalam bahasa pengunjung.
  **Manual:** pastikan `REVALIDATE_SECRET` terisi sama di Vercel dan Railway (sudah dipakai untuk revalidasi).

### 2026-09-29 · NantaPakeAI
- Kategori baru **Editorial & Model**: filter di Work, kartu di Services, pilihan di form Contact, kategori proyek/kalender di admin, slot foto "Services · Editorial & Model" di Site images.
- Teks situs sebagai duo (fotografer + videografer), bukan satu orang atau "studio": About, "Di balik kamera", pengantar Services, menu "Tentang kami". `docs/BRAND.md` diperbarui (nama, skala duo, spesialisasi).
  **Manual:** kalau teks About/Services pernah diedit di Admin → Site text, versi admin yang tampil. Cek dan sesuaikan di sana. Pilih foto untuk slot Editorial di Admin → Site images.
- Harga baru (tingkat freelancer pemula): paket wedding Essential Rp 2,5 jt · **Duo** (dulu Signature) Rp 4 jt · Full Story Rp 5 jt; layanan mulai Rp 500 rb (Personal), 750 rb (Editorial), 1,5 jt (Pre-wedding, Acara), 2,5 jt (Wedding); film saja di catatan paket. Pilihan budget di form Contact jadi < 1 jt · 1–3 jt · 3–5 jt · > 5 jt (inquiry lama tetap terbaca). "Pajak 11%" dihapus dari catatan harga.
  **Manual:** kalau paket/harga pernah diedit di Admin → Site text, versi admin yang tampil. Kosongkan atau samakan di sana.
- Paket: **Duo** diberi label "Rekomendasi kami", baris "Hemat Rp 2 jt dibanding foto + film terpisah", latar sedikit terang, dan tombol terisi. Full Story dirampingkan (Duo + pre-wedding 2 jam); film upacara utuh jadi tambahan Rp 750 rb. Catatan harga + FAQ baru: maksimal 8 wedding per bulan, DP 30% mengunci tanggal, pelunasan H-7. Label dan baris hemat bisa diubah atau dikosongkan per paket di Admin → Site text (kolom Badge, Note).
- Detail visual tahap 1: jam Bali + golden hour hari ini di footer dan Contact (dihitung di browser, diperbarui per menit); foto muncul dari warna kertas hangat saat termuat (kecuali hero/banner); penanda waktu (garis + titik) di footer dan Services; teks tanpa kata yatim dan judul seimbang; footer "Kembali ke awal" + "Dibuat pelan-pelan di Bali". Aturan performa baru di `CLAUDE.md`; patokan Lighthouse sebelum/sesudah di `docs/PLAN.md`.
- Detail visual tahap 2: cap pos "Diterima" bertanggal saat form Contact terkirim; halaman 404 dengan satu foto seperti cetakan lepas + "Lihat karya kami", kini juga untuk alamat salah di bawah /id/… (sebelumnya jatuh ke 404 bawaan berbahasa Inggris tanpa menu); huruf awal besar dan paragraf di cerita proyek; tanda kutip besar di testimoni; foto hero bergerak sangat pelan saat dibuka; garis progres baca tipis di halaman proyek (tanpa JS). JS tidak bertambah, CLS 0.

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
