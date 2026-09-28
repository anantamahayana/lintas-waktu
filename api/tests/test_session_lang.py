# [ID] Bahasa klien per sesi: dipakai galeri (meta) dan pesan WhatsApp.


def test_session_language_is_saved_shown_and_editable(client, admin):
    r = client.post("/api/admin/sessions", headers=admin, json={"client_name": "Bu Sari", "drive_folder_id": "folder-tes", "photo_limit": 3, "lang": "id"})
    assert r.status_code == 201 and r.json()["lang"] == "id"
    s = r.json()
    assert client.get(f"/api/gallery/{s['slug']}/meta").json()["lang"] == "id"
    r = client.patch(f"/api/admin/sessions/{s['id']}", headers=admin, json={"lang": "en"})
    assert r.status_code == 200 and r.json()["lang"] == "en"
    assert client.patch(f"/api/admin/sessions/{s['id']}", headers=admin, json={"lang": "fr"}).status_code == 422


def test_indonesian_whatsapp_template_has_a_default(client, admin):
    st = client.get("/api/admin/site-settings", headers=admin).json()
    assert "{link}" in st["whatsapp_template_id"] and "Halo" in st["whatsapp_template_id"]


def test_gallery_intro_tagline_follows_client_language(client, admin):
    client.put("/api/admin/branding", headers=admin, json={"studio_name": "Lintas Waktu", "tagline": "Photography & Film · Bali", "contact": ""})
    r = client.post("/api/admin/sessions", headers=admin, json={"client_name": "Bu Sari", "drive_folder_id": "folder-tes", "photo_limit": 3, "lang": "id"})
    slug = r.json()["slug"]
    assert client.get(f"/api/gallery/{slug}/meta").json()["branding"]["tagline"] == "Fotografi & Film · Bali"
    client.patch(f"/api/admin/sessions/{r.json()['id']}", headers=admin, json={"lang": "en"})
    assert client.get(f"/api/gallery/{slug}/meta").json()["branding"]["tagline"] == "Photography & Film · Bali"
