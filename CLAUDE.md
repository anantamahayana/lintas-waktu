# Lintas Waktu — aturan kerja

- **Jangan pernah menambahkan atribusi Claude** di commit atau PR: tanpa `Co-Authored-By: Claude`, tanpa "Generated with Claude Code", tanpa link sesi. Commit atas nama pemilik repo (NantaPakeAI).
- Push hanya ke `anantamahayana/lintas-waktu`, tidak pernah ke repo photo-selection-platform asli.
- Boleh commit dan push langsung ke `main` (= deploy produksi Vercel + Railway); beri tahu pemilik kalau ada langkah manual (env var, dashboard, DNS). Detail deploy: `docs/DEPLOYMENT.md`. Rencana berjalan: `docs/PLAN.md`.
- Tanya dulu sebelum perubahan besar. Kalau diminta "jangan lakukan apa-apa", cukup jawab.
- Jangan menulis rahasia (password, key, token, PIN) di repo atau chat.
- Desain: kode di `web/` adalah acuan (lihat `docs/BRAND.md`); Figma sudah usang. Animasi elegan tapi ringan.
- Konten untuk klien (galeri, invoice) dalam bahasa klien, EN/ID. Kalender hanya untuk admin.
- Next.js 16: baca `web/AGENTS.md` sebelum mengubah kode khusus Next.
