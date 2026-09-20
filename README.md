# Lintas Waktu — website

Photography & film studio in Bali. Public site (Next.js) + API (FastAPI, from
photo-selection-platform) with admin and client proofing.

```
web/   Next.js 16 · public site (EN at /, ID at /id) · /admin
api/   FastAPI · sessions & client gallery · projects · inquiries · settings
docs/  BRIEF.md (plan) · BRAND.md (design system)
```

## Run locally

```bash
# API (first time: python -m venv .venv && .venv/Scripts/pip install -r requirements.txt; copy .env.example .env)
cd api && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

```bash
# Web (first time: npm install; copy .env.example .env.local)
cd web && npm run dev
```

- Site: http://localhost:3000 · Admin: http://localhost:3000/admin (password = `ADMIN_PASSWORD` in `api/.env`)
- Sample portfolio (12 projects with Unsplash placeholder photos, editable in /admin/projects):
  `cd api && .venv/Scripts/python -m app.content.seed` — set a Drive folder on a project to replace its placeholders.
  The public site shows only what the API has published; nothing is hard-coded.
- Page photographs (hero, About, Services, Contact…) are chosen in /admin/site-images from one Drive folder;
  until a slot is set the site shows a placeholder for it (`web/src/lib/dummy-photos.ts`).
- Without Google credentials the API runs in **mock mode** (24 placeholder photos) so every flow can be tried.
- Google Drive setup (API key or service account): see the upstream README in photo-selection-platform.
