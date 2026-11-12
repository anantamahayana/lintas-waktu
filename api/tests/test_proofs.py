"""Album proofs: the album app uploads spreads, the client unlocks with a PIN, writes notes, approves."""
import pytest

from app.content.proofs import AlbumProof
from app.database import SessionLocal

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 200


@pytest.fixture(autouse=True)
def _proofs_bersih(tmp_path, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "upload_dir", str(tmp_path))
    with SessionLocal() as db:
        db.query(AlbumProof).delete()
        db.commit()
    yield


def _publish(client, admin, n=3, key="proj-1"):
    p = client.post("/api/admin/proofs", headers=admin, json={"project_key": key, "client_name": "Ayu & Made", "lang": "en"}).json()
    for i in range(n):
        r = client.put(f"/api/admin/proofs/{p['id']}/draft/{i}", headers={**admin, "content-type": "image/jpeg"}, content=JPEG)
        assert r.status_code == 204, r.text
    r = client.post(f"/api/admin/proofs/{p['id']}/publish", headers=admin, json={"spreads": [{"label": f"{i * 2}–{i * 2 + 1}", "w": 2000, "h": 1000} for i in range(n)]})
    assert r.status_code == 200, r.text
    return r.json()


def _unlock(client, slug, pin):
    r = client.post(f"/api/proof/{slug}/unlock", json={"pin": pin})
    assert r.status_code == 200, r.text
    return {"X-Proof-Token": r.json()["token"]}


def test_upload_publish_and_view_with_pin(client, admin):
    p = _publish(client, admin)
    assert p["version"] == 1 and p["spread_count"] == 3 and len(p["pin"]) == 4 and p["url"].endswith(f"/p/{p['slug']}")
    assert client.get(f"/api/proof/{p['slug']}").status_code == 401  # PIN first
    assert client.post(f"/api/proof/{p['slug']}/unlock", json={"pin": "x"}).status_code == 401
    h = _unlock(client, p["slug"], p["pin"])
    v = client.get(f"/api/proof/{p['slug']}", headers=h).json()
    assert [s["label"] for s in v["spreads"]] == ["0–1", "2–3", "4–5"]
    img = client.get(v["spreads"][1]["url"])
    assert img.status_code == 200 and img.content == JPEG
    assert client.get(v["spreads"][1]["url"].split("?")[0]).status_code == 401  # image links are signed
    assert client.get(f"/api/admin/proofs/{p['id']}", headers=admin).json()["open_count"] == 1


def test_sending_again_keeps_link_and_pin(client, admin):
    a = _publish(client, admin)
    b = _publish(client, admin, n=2)
    assert (b["slug"], b["pin"], b["version"], b["spread_count"]) == (a["slug"], a["pin"], 2, 2)
    h = _unlock(client, b["slug"], b["pin"])
    v = client.get(f"/api/proof/{b['slug']}", headers=h).json()
    assert client.get(v["spreads"][0]["url"]).status_code == 200
    old = v["spreads"][0]["url"].replace("/img/2/", "/img/1/")
    assert client.get(old).status_code == 404  # only the newest version is kept


def test_publish_needs_every_spread(client, admin):
    p = client.post("/api/admin/proofs", headers=admin, json={"project_key": "k", "client_name": "X"}).json()
    client.put(f"/api/admin/proofs/{p['id']}/draft/0", headers=admin, content=JPEG)
    r = client.post(f"/api/admin/proofs/{p['id']}/publish", headers=admin, json={"spreads": [{"label": "1", "w": 10, "h": 5}] * 2})
    assert r.status_code == 400
    assert client.put(f"/api/admin/proofs/{p['id']}/draft/1", headers=admin, content=b"not a jpeg").status_code == 415
    assert client.get(f"/api/proof/{p['slug']}/meta").status_code == 404  # nothing published yet


def test_notes_and_approval(client, admin):
    p = _publish(client, admin)
    h = _unlock(client, p["slug"], p["pin"])
    r = client.post(f"/api/proof/{p['slug']}/notes", headers=h, json={"spread": 1, "x": 0.8, "y": 0.2, "author": "Ayu", "text": "Laughing photo here please"})
    assert r.status_code == 201, r.text
    note = r.json()
    assert client.post(f"/api/proof/{p['slug']}/notes", headers=h, json={"spread": 9, "author": "Ayu", "text": "x"}).status_code == 400
    # The photographer sees it and ticks it off
    d = client.get(f"/api/admin/proofs/{p['id']}", headers=admin).json()
    assert [(n["spread"], n["text"]) for n in d["notes"]] == [(1, "Laughing photo here please")]
    assert client.patch(f"/api/admin/proofs/{p['id']}/notes/{note['id']}", headers=admin, json={"done": True}).json()["done"] is True
    # A done note can no longer be removed by the client; a wrong key never
    assert client.delete(f"/api/proof/{p['slug']}/notes/{note['id']}?key=wrong", headers=h).status_code == 404
    assert client.delete(f"/api/proof/{p['slug']}/notes/{note['id']}?key={note['key']}", headers=h).status_code == 409
    r = client.post(f"/api/proof/{p['slug']}/approve", headers=h, json={"name": "Ayu"})
    assert r.json()["status"] == "approved" and r.json()["approved_by"] == "Ayu"
    assert client.post(f"/api/proof/{p['slug']}/notes", headers=h, json={"spread": 0, "author": "Ayu", "text": "late"}).status_code == 409
    # Sending a new version re-opens it
    assert _publish(client, admin)["status"] == "open"


def test_admin_preview_does_not_count_or_approve(client, admin):
    p = _publish(client, admin)
    assert client.get(f"/api/proof/{p['slug']}", headers=admin).json()["preview"] is True
    assert client.post(f"/api/proof/{p['slug']}/approve", headers=admin, json={"name": "me"}).status_code == 403
    assert client.get(f"/api/admin/proofs/{p['id']}", headers=admin).json()["open_count"] == 0


def test_pin_guess_limit(client, admin):
    p = _publish(client, admin)
    for _ in range(5):
        client.post(f"/api/proof/{p['slug']}/unlock", json={"pin": "0000" if p["pin"] != "0000" else "1111"})
    assert client.post(f"/api/proof/{p['slug']}/unlock", json={"pin": p["pin"]}).status_code == 429


def test_admin_endpoints_need_login(client):
    assert client.post("/api/admin/proofs", json={"project_key": "k", "client_name": "X"}).status_code == 401
