# [ID] Cache foto tidak boleh memenuhi disk (volume Railway juga menyimpan database).
from pathlib import Path

from app.config import get_settings
from app.services import drive_service


def _fake_disk(monkeypatch, root: Path, total_mb: float):
    """Free space = total minus what the cache files take (1 MB each)."""
    monkeypatch.setattr(drive_service, "_free_mb", lambda p: total_mb - sum(1 for f in root.rglob("*") if f.is_file()))


def test_make_room_evicts_large_images_oldest_first(monkeypatch, tmp_path):
    monkeypatch.setattr(get_settings(), "cache_dir", str(tmp_path))
    monkeypatch.setattr(get_settings(), "cache_min_free_mb", 10)
    for tier, n in (("thumb", 5), ("full", 40)):
        d = tmp_path / "folder" / tier
        d.mkdir(parents=True)
        for i in range(n):
            (d / f"{i}.jpg").write_bytes(b"x")
    _fake_disk(monkeypatch, tmp_path, total_mb=50)  # 45 files -> 5 MB free, reserve 10 (+5 headroom)
    removed = drive_service.make_room(headroom_mb=5)
    assert removed >= 10
    assert len(list((tmp_path / "folder" / "thumb").iterdir())) == 5  # thumbnails kept
    assert drive_service._free_mb(tmp_path) >= 15


def test_images_are_not_cached_when_disk_is_low(monkeypatch, tmp_path):
    monkeypatch.setattr(get_settings(), "cache_dir", str(tmp_path))
    monkeypatch.setattr(drive_service, "disk_ok", lambda: False)
    monkeypatch.setattr(drive_service, "make_room", lambda **kw: 0)
    photo = drive_service.DrivePhoto(file_id="f1", filename="a.jpg", width=3, height=2)
    monkeypatch.setattr(drive_service, "find_photo", lambda folder, fid: photo)
    monkeypatch.setattr(drive_service, "is_mock", lambda: True)
    monkeypatch.setattr(drive_service, "_download_mock", lambda p: _jpeg())
    data, _ = drive_service.get_image("folder", "f1", "thumb")
    assert data and not any(f.is_file() for f in tmp_path.rglob("*.jpg"))


def _jpeg() -> bytes:
    import io

    from PIL import Image

    b = io.BytesIO()
    Image.new("RGB", (20, 10)).save(b, "JPEG")
    return b.getvalue()
