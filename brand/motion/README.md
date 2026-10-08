# Gerak logo — Golden Hour · Terbit · Melintas

Sumber animasi logo Gerbang Waktu. Setiap animasi adalah halaman HTML/SVG yang digerakkan waktu
(`render(t)`), dirender per frame di Chromium lalu dijadikan video dengan ffmpeg. Hasilnya sama setiap kali.
Video **tidak** disimpan di repo (terlalu besar); render ulang dengan langkah di bawah. Aturan logo: `docs/BRAND.md` → 1a/1b.

| File | Durasi | Untuk | Pilihan (`?…`) |
|---|---|---|---|
| `golden.tmpl.html` | 3,2 dtk | Penutup Reels/Story/film: senja → keemasan → krem | — |
| `terbit.tmpl.html` | 4,6 dtk | Pembuka film; overlay di atas footage | `bg=cream\|none`, `tone=ink\|cream` |
| `melintas.tmpl.html` | 3,6 dtk | Transisi masuk ke shot pertama (jalan setapak transparan) | `tone=light\|dark`, `u=` titik zoom |

Versi web Terbit (kartu pembuka galeri klien) ada di `web/src/components/brand/GateIntro.tsx`, terpisah dari ini.

## Render
Butuh Python 3, Node 18+, Playwright (Chromium), ffmpeg.

```bash
cd brand/motion
python build.py                      # isi path logo dari web/src/components/brand/Logo.tsx -> *.html
npm i -D playwright && npx playwright install chromium   # sekali (atau PLAYWRIGHT=/path/ke/playwright/index.mjs)

# frame PNG: node render.mjs <html> <lebar> <tinggi> <folder> [fps] [- atau t1,t2 untuk still] [query]
node render.mjs terbit.html 1920 1080 frames 30 - "bg=none&tone=cream"

# MP4 (latar penuh)
ffmpeg -framerate 30 -i frames/f%04d.png -vf "noise=alls=1.5:allf=t,format=yuv420p" \
  -c:v libx264 -preset slow -crf 19 -tune grain -movflags +faststart out/terbit-1920x1080.mp4
# Overlay transparan (bg=none): ProRes 4444 + alpha untuk Premiere/DaVinci/Final Cut
ffmpeg -framerate 30 -i frames/f%04d.png -c:v prores_ks -profile:v 4444 \
  -pix_fmt yuva444p10le -vendor apl0 -alpha_bits 16 out/terbit-overlay-cream-1920x1080.mov
```
Ukuran yang dipakai: 1080×1920 (Reels/Story), 1920×1080 (film), 1080×1080 (feed); 3840×2160 juga bisa.
Hapus `frames/` sebelum render berikutnya. Untuk cek cepat: `node render.mjs terbit.html 1080 1080 cek 30 0.5,2,4.6`.

## Mengubah
- Teks deskriptor: `PHOTOGRAPHY &amp; FILM · BALI` di tiap template.
- Waktu: fungsi `render(t)` (komentar bernomor per tahap); `DUR` = panjang total.
- Bentuk logo ikut otomatis dari `Logo.tsx`. Tulisan per huruf (`tools/letters.json`) dibuat dari Marcellus
  dengan `tools/letters.py` (fonttools); jalankan ulang hanya kalau wordmark berubah.
- Font: Marcellus dan Montserrat, lisensi SIL Open Font License (boleh dibundel).
