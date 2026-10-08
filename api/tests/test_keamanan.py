# [ID] Keamanan: token admin (PyJWT), dan logo SVG yang diunggah tidak bisa menjalankan skrip.
from datetime import datetime, timedelta, timezone

import jwt

from app.config import get_settings


def _token(**claims):
    return jwt.encode(claims, get_settings().secret_key, algorithm="HS256")


def test_token_admin_dari_login_diterima(client, admin):
    assert client.get("/api/admin/sessions", headers=admin).status_code == 200


def test_tanpa_token_atau_token_palsu_ditolak(client):
    assert client.get("/api/admin/sessions").status_code == 401
    assert client.get("/api/admin/sessions", headers={"Authorization": "Bearer bukan.token.asli"}).status_code == 401
    palsu = jwt.encode({"sub": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, "kunci-lain", algorithm="HS256")
    assert client.get("/api/admin/sessions", headers={"Authorization": f"Bearer {palsu}"}).status_code == 401


def test_token_kedaluwarsa_atau_bukan_admin_ditolak(client):
    lewat = _token(sub="admin", exp=datetime.now(timezone.utc) - timedelta(minutes=1))
    assert client.get("/api/admin/sessions", headers={"Authorization": f"Bearer {lewat}"}).status_code == 401
    bukan = _token(sub="klien", exp=datetime.now(timezone.utc) + timedelta(hours=1))
    assert client.get("/api/admin/sessions", headers={"Authorization": f"Bearer {bukan}"}).status_code == 401


def test_token_tanpa_tanda_tangan_ditolak(client):
    # "alg: none" — the classic JWT trick
    tanpa = jwt.encode({"sub": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, None, algorithm="none")
    assert client.get("/api/admin/sessions", headers={"Authorization": f"Bearer {tanpa}"}).status_code == 401


def test_logo_svg_disajikan_tanpa_izin_skrip(client, admin, tmp_path, monkeypatch):
    from app.services import branding

    monkeypatch.setattr(branding, "UPLOAD_DIR", tmp_path)
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    r = client.post("/api/admin/branding/logo", headers=admin, files={"file": ("logo.svg", svg, "image/svg+xml")})
    assert r.status_code == 200
    r = client.get("/api/branding/logo")
    assert r.status_code == 200
    assert "default-src 'none'" in r.headers["content-security-policy"] and "sandbox" in r.headers["content-security-policy"]
    assert r.headers["x-content-type-options"] == "nosniff"


def test_foto_publik_tidak_bisa_dari_folder_galeri_klien(client, sesi):
    # the website's image proxy only serves published portfolio folders and the site-images folder,
    # never a client's private gallery folder (that needs the PIN)
    from app.database import SessionLocal
    from app.models import PhotoSession

    with SessionLocal() as db:
        folder = db.query(PhotoSession).first().drive_folder_id
    assert client.get(f"/api/public/img/{folder}/f1").status_code == 404
    assert client.get("/api/public/img/folder-sembarang/f1").status_code == 404
