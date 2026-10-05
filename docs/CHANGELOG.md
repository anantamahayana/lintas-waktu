# Catatan perubahan

Yang terbaru di atas. Setiap perubahan yang di-push menambah satu entri di sini (aturannya di `CLAUDE.md`).
Format: `### YYYY-MM-DD · nama` lalu poin singkat. Isinya: apa yang berubah bagi pengguna, file/area utama,
dan **langkah manual** kalau ada. Detail teknis lengkap ada di pesan commit (`git log`).

---

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
