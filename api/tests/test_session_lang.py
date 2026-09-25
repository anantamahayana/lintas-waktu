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
