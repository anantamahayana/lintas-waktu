# [ID] Bingkai foto (titik fokus, zoom, utuh/potong) untuk slot Site images dan sampul proyek.


def test_site_image_frame_is_saved_and_public(client, admin):
    f = {"x": 30, "y": 20, "zoom": 1.4, "fit": "whole", "ratio": 0.8}
    r = client.put("/api/admin/site-images", headers=admin, json={"frames": {"card-wedding": f, "nope": f}})
    assert r.status_code == 200
    slot = next(s for s in r.json()["slots"] if s["slot"] == "card-wedding")
    assert slot["frame"]["x"] == 30 and slot["frame"]["fit"] == "whole"
    assert client.get("/api/public/site-images/frames").json() == {"card-wedding": f}
    client.put("/api/admin/site-images", headers=admin, json={"frames": {"card-wedding": None}})
    assert client.get("/api/public/site-images/frames").json() == {}


def test_frame_values_are_validated(client, admin):
    bad = {"x": 150, "y": 20, "zoom": 1, "fit": "cover"}
    assert client.put("/api/admin/site-images", headers=admin, json={"frames": {"hero": bad}}).status_code == 422


def test_project_cover_frame_round_trip(client, admin):
    body = {"slug": "tes-frame", "title": "Tes", "category": "wedding", "published": True, "placeholder_urls": ["https://example.com/a.jpg"], "cover_frame": {"x": 40, "y": 25, "zoom": 1.2, "fit": "cover"}}
    r = client.post("/api/admin/projects", headers=admin, json=body)
    assert r.status_code == 201, r.text
    assert r.json()["cover_frame"]["y"] == 25
    pid = r.json()["id"]
    r = client.patch(f"/api/admin/projects/{pid}", headers=admin, json={"cover_frame": {"x": 60, "y": 60, "zoom": 1, "fit": "cover"}})
    assert r.json()["cover_frame"]["x"] == 60
    pub = client.get("/api/public/projects/tes-frame").json()
    assert pub["cover_frame"]["x"] == 60
    client.delete(f"/api/admin/projects/{pid}", headers=admin)
