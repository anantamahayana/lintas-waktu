# [ID] Draf pilihan tersinkron antar perangkat: nomor versi, tolak penimpaan dari versi lama.
from tests.test_alur_inti import _buka


def test_draft_saved_is_visible_to_another_device(client, sesi):
    slug = sesi["slug"]
    laptop, hp = _buka(client, slug), _buka(client, slug)
    r = client.put(f"/api/gallery/{slug}/draft", headers=laptop, json={"file_ids": ["f1", "f2"], "base_version": 0})
    assert r.status_code == 200 and r.json()["version"] == 1
    d = client.get(f"/api/gallery/{slug}/draft", headers=hp).json()
    assert d["file_ids"] == ["f1", "f2"] and d["version"] == 1
    assert client.get(f"/api/gallery/{slug}", headers=hp).json()["draft_version"] == 1


def test_stale_device_cannot_overwrite_newer_picks(client, sesi):
    slug = sesi["slug"]
    laptop, hp = _buka(client, slug), _buka(client, slug)
    client.put(f"/api/gallery/{slug}/draft", headers=laptop, json={"file_ids": ["f1", "f2"], "base_version": 0})
    r = client.put(f"/api/gallery/{slug}/draft", headers=hp, json={"file_ids": ["f3"], "base_version": 0})
    assert r.status_code == 412
    assert r.json()["detail"]["file_ids"] == ["f1", "f2"] and r.json()["detail"]["version"] == 1
    # after merging, the phone saves on top of version 1
    r = client.put(f"/api/gallery/{slug}/draft", headers=hp, json={"file_ids": ["f1", "f2", "f3"], "base_version": 1})
    assert r.status_code == 200 and r.json()["version"] == 2


def test_draft_without_base_version_still_saves(client, sesi):
    """Clients from before versioning keep working (last write wins)."""
    slug = sesi["slug"]
    h = _buka(client, slug)
    assert client.put(f"/api/gallery/{slug}/draft", headers=h, json={"file_ids": ["f1"]}).status_code == 200


def test_reset_bumps_version_and_clears_picks(client, admin, sesi):
    slug = sesi["slug"]
    h = _buka(client, slug)
    client.put(f"/api/gallery/{slug}/draft", headers=h, json={"file_ids": ["f1"], "base_version": 0})
    client.post(f"/api/admin/sessions/{sesi['id']}/reset", headers=admin)
    d = client.get(f"/api/gallery/{slug}/draft", headers=h).json()
    assert d["file_ids"] == [] and d["version"] == 2 and d["rev"] == 1
