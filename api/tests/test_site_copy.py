# [ID] Teks situs yang diubah admin: disimpan per bahasa, dibaca publik, hanya admin yang boleh mengubah.


def test_admin_saves_site_text_and_public_reads_it(client, admin):
    body = {"en": {"home": {"hero": {"title": "New title"}}}, "id": {"home": {"hero": {"title": "Judul baru"}}}}
    r = client.put("/api/admin/copy", headers=admin, json=body)
    assert r.status_code == 200 and r.json() == body
    assert client.get("/api/public/copy/id").json() == {"home": {"hero": {"title": "Judul baru"}}}
    assert client.get("/api/admin/copy", headers=admin).json() == body


def test_site_text_needs_admin_and_a_known_locale(client):
    assert client.put("/api/admin/copy", json={"en": {}}).status_code == 401
    assert client.get("/api/public/copy/fr").status_code == 404


def test_site_text_rejects_non_objects(client, admin):
    assert client.put("/api/admin/copy", headers=admin, json={"en": ["x"]}).status_code == 422
