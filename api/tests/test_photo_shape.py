# [ID] Bentuk foto (portrait/landscape) untuk tata letak galeri: dari thumbnail yang sudah diputar sesuai EXIF.
import hashlib

from PIL import Image

from app.config import get_settings
from app.services import drive_service


def test_display_size_prefers_the_upright_thumbnail(monkeypatch, tmp_path):
    monkeypatch.setattr(get_settings(), "cache_dir", str(tmp_path))
    photo = drive_service.DrivePhoto(file_id="f-rot", filename="a.jpg", width=6000, height=4000)  # Drive: stored sideways
    assert drive_service.display_size("folder", photo) == (6000, 4000)  # no thumbnail yet: metadata
    d = tmp_path / hashlib.sha1(b"folder").hexdigest()[:16] / "thumb"
    d.mkdir(parents=True)
    Image.new("RGB", (427, 640)).save(d / f"{hashlib.sha1(b'f-rot').hexdigest()}.jpg")
    assert drive_service.display_size("folder", photo) == (427, 640)  # portrait, as seen
