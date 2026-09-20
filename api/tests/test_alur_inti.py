# [ID] Tes alur inti: PIN, pembatas percobaan, kuota foto, pengiriman pilihan, penanda "baru".
from app.database import SessionLocal
from app.models import PhotoSession
from app.services import ratelimit


def _buka(client, slug, pin="1234"):
    r = client.post(f"/api/gallery/{slug}/unlock", json={"pin": pin})
    assert r.status_code == 200, r.text
    return {"X-Gallery-Token": r.json()["token"]}


# ---------------------------------------------------------------- PIN
def test_pin_salah_ditolak_dan_pin_benar_diterima(client, sesi):
    r = client.post(f"/api/gallery/{sesi['slug']}/unlock", json={"pin": "9999"})
    assert r.status_code == 401
    assert "Sisa" in r.json()["detail"]
    assert _buka(client, sesi["slug"])


def test_pin_salah_berkali_kali_diblokir_15_menit(client, sesi):
    slug = sesi["slug"]
    for _ in range(5):
        client.post(f"/api/gallery/{slug}/unlock", json={"pin": "9999"})
    r = client.post(f"/api/gallery/{slug}/unlock", json={"pin": "1234"})  # PIN benar pun ditolak
    assert r.status_code == 429


def test_blokir_pin_bertahan_setelah_server_restart(client, sesi):
    """Hitungan salah tebak disimpan di database, bukan di memori."""
    slug = sesi["slug"]
    for _ in range(5):
        client.post(f"/api/gallery/{slug}/unlock", json={"pin": "9999"})
    with SessionLocal() as db:  # seperti proses baru: baca ulang dari database
        assert ratelimit.count(db, f"pin:{slug}", 15 * 60) >= 5


def test_kunci_ulang_perangkat_menghapus_blokir_pin(client, admin, sesi):
    slug = sesi["slug"]
    for _ in range(5):
        client.post(f"/api/gallery/{slug}/unlock", json={"pin": "9999"})
    assert client.post(f"/api/admin/sessions/{sesi['id']}/relock", headers=admin).status_code == 200
    assert _buka(client, slug)


def test_login_admin_salah_berkali_kali_diblokir(client):
    for _ in range(5):
        client.post("/api/admin/login", json={"password": "salah"})
    r = client.post("/api/admin/login", json={"password": "rahasia-tes"})
    assert r.status_code == 429


# ---------------------------------------------------------------- kuota & pengiriman
def test_kirim_pilihan_melebihi_batas_maksimal_ditolak(client, sesi):
    h = _buka(client, sesi["slug"])
    r = client.post(f"/api/gallery/{sesi['slug']}/submit", headers=h, json={"file_ids": [f"f{i}" for i in range(6)]})
    assert r.status_code == 400
    assert "Maksimal 5" in r.json()["detail"]


def test_kirim_pilihan_menandai_foto_di_luar_paket(client, sesi):
    h = _buka(client, sesi["slug"])
    r = client.post(f"/api/gallery/{sesi['slug']}/submit", headers=h, json={"file_ids": ["f0", "f1", "f2", "f3"]})
    assert r.status_code == 200, r.text
    assert r.json()["selected_count"] == 4
    assert r.json()["extra_count"] == 1  # kuota paket 3, satu foto jadi tambahan


def test_tidak_bisa_kirim_dua_kali(client, sesi):
    h = _buka(client, sesi["slug"])
    client.post(f"/api/gallery/{sesi['slug']}/submit", headers=h, json={"file_ids": ["f0"]})
    r = client.post(f"/api/gallery/{sesi['slug']}/submit", headers=h, json={"file_ids": ["f1"]})
    assert r.status_code == 400


def test_galeri_butuh_token_pin(client, sesi):
    assert client.get(f"/api/gallery/{sesi['slug']}").status_code in (401, 403)


# ---------------------------------------------------------------- penanda "baru selesai"
def test_penanda_baru_muncul_setelah_kirim_dan_hilang_setelah_dibuka(client, admin, sesi):
    h = _buka(client, sesi["slug"])
    client.post(f"/api/gallery/{sesi['slug']}/submit", headers=h, json={"file_ids": ["f0", "f1"]})

    daftar = client.get("/api/admin/sessions", headers=admin).json()
    assert [x["is_new"] for x in daftar if x["id"] == sesi["id"]] == [True]

    assert client.get(f"/api/admin/sessions/{sesi['id']}", headers=admin).status_code == 200
    daftar = client.get("/api/admin/sessions", headers=admin).json()
    assert [x["is_new"] for x in daftar if x["id"] == sesi["id"]] == [False]


def test_sesi_yang_belum_dikirim_tidak_ditandai_baru(client, admin, sesi):
    daftar = client.get("/api/admin/sessions", headers=admin).json()
    assert all(x["is_new"] is False for x in daftar)


# ---------------------------------------------------------------- backup
def test_backup_dibuat_setiap_klien_mengirim_pilihan(client, sesi):
    from pathlib import Path

    from app.config import get_settings

    db_path = Path(get_settings().database_url.removeprefix("sqlite:///"))
    folder = db_path.parent / "backups" / "kiriman"
    sebelum = len(list(folder.glob("*.db"))) if folder.exists() else 0

    h = _buka(client, sesi["slug"])
    assert client.post(f"/api/gallery/{sesi['slug']}/submit", headers=h, json={"file_ids": ["f0"]}).status_code == 200
    assert len(list(folder.glob("*.db"))) == sebelum + 1


# ---------------------------------------------------------------- health
def test_health_melaporkan_database_dan_jumlah_sesi(client, sesi):
    data = client.get("/api/health").json()
    assert data["database"] == "ok"
    assert data["sessions_total"] >= 1
    assert "drive_mode" in data
