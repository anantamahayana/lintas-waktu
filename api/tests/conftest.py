# [ID] Persiapan tes: database sementara + foto Drive palsu, supaya tes tidak menyentuh data asli.
import os
import tempfile
from pathlib import Path

import pytest

TMP = Path(tempfile.mkdtemp(prefix="pilihfoto-test-"))
os.environ["DATABASE_URL"] = f"sqlite:///{TMP / 'test.db'}"
os.environ["ADMIN_PASSWORD"] = "rahasia-tes"
os.environ["SECRET_KEY"] = "kunci-tes"

from fastapi.testclient import TestClient  # noqa: E402  (harus setelah env di atas)

from app.database import SessionLocal, migrate  # noqa: E402
from app.main import app  # noqa: E402
from app.models import FailedAttempt, PhotoSession  # noqa: E402
from app.routers import gallery  # noqa: E402
from app.services import drive_service  # noqa: E402

FOTO = [drive_service.DrivePhoto(file_id=f"f{i}", filename=f"DSC_{i:04d}.jpg", width=1200, height=800) for i in range(10)]


@pytest.fixture(autouse=True)
def _db_bersih(monkeypatch):
    migrate()
    monkeypatch.setattr(drive_service, "list_photos", lambda folder_id, **kw: FOTO)
    monkeypatch.setattr(gallery.drive_service, "list_photos", lambda folder_id, **kw: FOTO)
    with SessionLocal() as db:
        db.query(PhotoSession).delete()
        db.query(FailedAttempt).delete()
        db.commit()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin(client):
    """Header Authorization admin yang sudah login."""
    r = client.post("/api/admin/login", json={"password": "rahasia-tes"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def sesi(client, admin):
    """Satu sesi siap pakai: kuota 3 (maks 5), PIN 1234."""
    r = client.post(
        "/api/admin/sessions",
        headers=admin,
        json={"client_name": "Klien Tes", "drive_folder_id": "folder-tes", "photo_limit": 3, "max_limit": 5, "pin": "1234"},
    )
    assert r.status_code == 201, r.text
    return r.json()
