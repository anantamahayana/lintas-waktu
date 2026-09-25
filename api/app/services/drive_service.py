"""
Google Drive access.

Three modes, picked automatically (see `mode()`):
- service_account: backend/service_account.json exists. Folder must be shared to the
  service account email. Works with private folders.
- api_key: GOOGLE_API_KEY is set in .env. Folder must be shared as
  "Anyone with the link" (Viewer). No OAuth, no key files — the simplest setup.
- mock: neither configured -> placeholder photos from picsum.photos so the whole
  flow can be developed without Google credentials.

In both real modes images are fetched once (Drive-rendered resizes when available,
otherwise the original resized with Pillow) and cached on disk, so the client
gallery never depends on short-lived Drive links or re-downloads 15 MB originals.
"""
from __future__ import annotations

import hashlib
import logging
import io
import os
import threading
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import httpx

from ..config import get_settings

log = logging.getLogger("uvicorn.error")

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
IMAGE_MIMES = ("image/jpeg", "image/png", "image/webp")
THUMB_PX = 640
FULL_PX = 2560  # lightbox / full-width rows on 2K screens; originals (often 15 MB+) are never kept
# Drive's own resizer is soft and heavily compressed. Ask it for a larger render and scale
# down here with Lanczos: much sharper, still no original download.
DRIVE_OVERSAMPLE = 1.5
JPEG_QUALITY = 88
DRIVE_API = "https://www.googleapis.com/drive/v3"
LIST_FIELDS = "nextPageToken, files(id, name, mimeType, thumbnailLink, imageMediaMetadata(width, height))"

_list_cache: dict[str, list["DrivePhoto"]] = {}
_list_lock = threading.Lock()


@dataclass
class DrivePhoto:
    file_id: str
    filename: str
    width: int
    height: int
    thumbnail_link: str | None = None

    @property
    def name(self) -> str:
        return self.filename.rsplit(".", 1)[0]


class DriveError(Exception):
    pass


def mode() -> str:
    s = get_settings()
    if s.service_account_path.exists():
        return "service_account"
    if s.google_api_key:
        return "api_key"
    return "mock"


def is_mock() -> bool:
    return mode() == "mock"


# ---------------------------------------------------------------- auth helpers
@lru_cache
def _credentials():
    from google.oauth2 import service_account

    return service_account.Credentials.from_service_account_file(
        str(get_settings().service_account_path), scopes=SCOPES
    )


def _auth() -> tuple[dict, dict]:
    """(headers, query params) that authenticate a raw Drive REST call."""
    if mode() == "service_account":
        import httplib2
        from google_auth_httplib2 import Request

        creds = _credentials()
        if not creds.valid:
            creds.refresh(Request(httplib2.Http()))
        return {"Authorization": f"Bearer {creds.token}"}, {}
    return {}, {"key": get_settings().google_api_key}


def _explain(r: httpx.Response) -> DriveError:
    try:
        msg = r.json()["error"]["message"]
    except Exception:
        msg = r.text[:200]
    if r.status_code == 404:
        hint = (
            "Folder tidak ditemukan. Pastikan ID benar dan folder di-share ke email service account."
            if mode() == "service_account"
            else "Folder tidak ditemukan. Pastikan ID benar dan folder di-share sebagai “Anyone with the link”."
        )
        return DriveError(hint)
    if r.status_code == 403 and "not been used" in msg:
        return DriveError("Google Drive API belum di-enable di project Google Cloud Anda.")
    if r.status_code in (400, 403):
        return DriveError(f"Google Drive menolak permintaan: {msg}")
    return DriveError(f"Google Drive error {r.status_code}: {msg}")


# ---------------------------------------------------------------- real modes
def _list_real(folder_id: str) -> list[DrivePhoto]:
    headers, params = _auth()
    photos: list[DrivePhoto] = []
    page_token = None
    with httpx.Client(timeout=30) as client:
        while True:
            q = {
                **params,
                "q": f"'{folder_id}' in parents and trashed = false",
                "fields": LIST_FIELDS,
                "orderBy": "name_natural",
                "pageSize": 1000,
                "supportsAllDrives": "true",
                "includeItemsFromAllDrives": "true",
            }
            if page_token:
                q["pageToken"] = page_token
            r = client.get(f"{DRIVE_API}/files", headers=headers, params=q)
            if r.status_code != 200:
                raise _explain(r)
            data = r.json()
            for f in data.get("files", []):
                if f.get("mimeType") not in IMAGE_MIMES:
                    continue
                meta = f.get("imageMediaMetadata") or {}
                photos.append(
                    DrivePhoto(
                        file_id=f["id"],
                        filename=f["name"],
                        width=int(meta.get("width") or 3),
                        height=int(meta.get("height") or 2),
                        thumbnail_link=f.get("thumbnailLink"),
                    )
                )
            page_token = data.get("nextPageToken")
            if not page_token:
                break
    return photos


def _download_drive_thumb(photo: DrivePhoto, px: int) -> bytes | None:
    """Drive renders resized versions on demand; far cheaper than the original file."""
    if not photo.thumbnail_link:
        return None
    headers, _ = _auth()
    url = photo.thumbnail_link.split("=s")[0] + f"=s{px}"
    try:
        with httpx.Client(timeout=20, follow_redirects=True) as client:
            r = client.get(url, headers=headers)
            if r.status_code == 200 and r.headers.get("content-type", "").startswith("image/"):
                return r.content
    except httpx.HTTPError:
        pass
    return None


def _download_real(photo: DrivePhoto) -> bytes:
    headers, params = _auth()
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        r = client.get(
            f"{DRIVE_API}/files/{photo.file_id}",
            headers=headers,
            params={**params, "alt": "media", "supportsAllDrives": "true"},
        )
        if r.status_code != 200:
            raise _explain(r)
        return r.content


# ---------------------------------------------------------------- mock mode
def _list_mock(folder_id: str) -> list[DrivePhoto]:
    # Deterministic per folder id, mixed orientations for a real masonry feel
    seed = int(hashlib.md5(folder_id.encode()).hexdigest()[:6], 16)
    shapes = [(3, 2), (2, 3), (3, 2), (1, 1), (4, 5), (3, 2), (16, 9), (2, 3)]
    photos = []
    for i in range(24):
        w, h = shapes[(i + seed) % len(shapes)]
        photos.append(DrivePhoto(file_id=f"mock-{seed}-{i:03d}", filename=f"DSC_{seed % 900 + 100 + i:04d}.jpg", width=w, height=h))
    return photos


def _download_mock(photo: DrivePhoto) -> bytes:
    scale = 1200
    m = max(photo.width, photo.height)
    url = f"https://picsum.photos/seed/{photo.file_id}/{photo.width * scale // m}/{photo.height * scale // m}"
    with httpx.Client(timeout=30, follow_redirects=True) as client:
        r = client.get(url)
        r.raise_for_status()
        return r.content


# ---------------------------------------------------------------- images + cache
def _resize(data: bytes, px: int) -> bytes:
    from PIL import Image, ImageOps

    with Image.open(io.BytesIO(data)) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((px, px), Image.LANCZOS)
        out = io.BytesIO()
        im.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        return out.getvalue()


def _folder_dir(folder_id: str) -> Path:
    return Path(get_settings().cache_dir) / hashlib.sha1(folder_id.encode()).hexdigest()[:16]


def _cache_path(folder_id: str, file_id: str, size: str) -> Path:
    d = _folder_dir(folder_id) / size
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{hashlib.sha1(file_id.encode()).hexdigest()}.jpg"


# ---------------------------------------------------------------- disk space
_room_lock = threading.Lock()


def _free_mb(path: Path) -> float:
    import shutil

    while not path.exists():
        path = path.parent
    return shutil.disk_usage(path).free / 1e6


def disk_ok() -> bool:
    return _free_mb(Path(get_settings().cache_dir)) >= get_settings().cache_min_free_mb


def make_room(tiers: tuple[str, ...] = ("full", "hq", "thumb"), headroom_mb: int = 100) -> int:
    """Delete cached images, oldest first, tier by tier, until the disk has the reserve plus
    `headroom_mb` free. Everything here is rebuilt from Drive on demand. Returns files removed."""
    root = Path(get_settings().cache_dir)
    target = get_settings().cache_min_free_mb + headroom_mb
    removed = 0
    with _room_lock:
        if not root.exists() or _free_mb(root) >= target:
            return 0
        for tier in tiers:
            files = sorted(root.glob(f"*/{tier}/*"), key=lambda f: f.stat().st_mtime)
            for n, f in enumerate(files):
                f.unlink(missing_ok=True)
                removed += 1
                if n % 25 == 24 and _free_mb(root) >= target:
                    break
            if _free_mb(root) >= target:
                break
    if removed:
        log.warning("cache: disk low — removed %d cached image(s), %.0f MB free now", removed, _free_mb(root))
    return removed


def disk_report() -> str:
    """One line for the startup log: what fills the volume."""
    def size(p: Path) -> float:
        if p.is_file():
            return p.stat().st_size / 1e6
        return sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) / 1e6 if p.exists() else 0.0

    import shutil

    s = get_settings()
    cache = Path(s.cache_dir)
    parts = [f"cache {size(cache):.0f} MB"]
    if s.database_url.startswith("sqlite:///"):
        db = Path(s.database_url.removeprefix("sqlite:///"))
        parts += [f"db {size(db):.0f} MB", f"backups {size(db.parent / 'backups'):.0f} MB"]
    parts.append(f"uploads {size(Path(s.upload_dir)):.0f} MB")
    probe = cache
    while not probe.exists():
        probe = probe.parent
    u = shutil.disk_usage(probe)
    return f"disk {u.used / 1e6:.0f}/{u.total / 1e6:.0f} MB used, {u.free / 1e6:.0f} MB free · " + " · ".join(parts)


def _write_atomic(path: Path, data: bytes) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


# ---------------------------------------------------------------- public API
def list_photos(folder_id: str, refresh: bool = False) -> list[DrivePhoto]:
    with _list_lock:
        if not refresh and folder_id in _list_cache:
            return _list_cache[folder_id]
    photos = _list_mock(folder_id) if is_mock() else _list_real(folder_id)
    if photos:  # an empty answer (upload in progress, access lost) must not stick until the next restart
        with _list_lock:
            _list_cache[folder_id] = photos
    else:
        log.warning("drive: folder %s lists no JPEG/PNG photos", folder_id)
    return photos


def find_photo(folder_id: str, file_id: str) -> DrivePhoto | None:
    for p in list_photos(folder_id):
        if p.file_id == file_id:
            return p
    return None


def get_image(folder_id: str, file_id: str, size: str) -> tuple[bytes, str]:
    """Return (bytes, media_type) for a photo, served from the on-disk cache when possible."""
    cached = _cache_path(folder_id, file_id, size)
    if cached.exists():
        return cached.read_bytes(), "image/jpeg"

    photo = find_photo(folder_id, file_id)
    if photo is None:
        raise DriveError("Foto tidak ditemukan")

    px = THUMB_PX if size == "thumb" else FULL_PX

    if is_mock():
        data = _resize(_download_mock(photo), px)
    elif size == "hq":
        # Website tier: from the original file, Lanczos-scaled here (≈ +3 dB over Drive's render).
        # Costs a full download per photo, so only portfolio/site folders are warmed this way.
        try:
            data = _resize(_download_real(photo), px)
        except DriveError:
            raw = _download_drive_thumb(photo, int(px * DRIVE_OVERSAMPLE))
            if not raw:
                raise
            data = _resize(raw, px)
    else:
        # Proofing tier: an oversized Drive render, sharpened by our own downscale — fast for
        # hundreds of photos. Fallback: download the original and resize locally.
        raw = _download_drive_thumb(photo, int(px * DRIVE_OVERSAMPLE))
        data = _resize(raw, px) if raw else _resize(_download_real(photo), px)

    # never fill the disk: a thumbnail may push out old large images; otherwise serve uncached
    if not disk_ok() and size == "thumb":
        make_room(tiers=("full", "hq"))
    if disk_ok():
        try:
            _write_atomic(cached, data)
        except OSError:
            log.warning("cache: could not write %s (disk full?)", cached.name)
    return data, "image/jpeg"


def get_image_website(folder_id: str, file_id: str) -> tuple[bytes, str]:
    """Full-size for the website: the sharp `hq` tier when it is on disk; otherwise the fast Drive
    tier right away, while `hq` is built in the background for the next visitor. Nobody waits
    a minute for one photograph, and the page sharpens itself as the cache fills."""
    import threading

    if _cache_path(folder_id, file_id, "hq").exists():
        return get_image(folder_id, file_id, "hq")
    data = get_image(folder_id, file_id, "full")
    key = f"{folder_id}/{file_id}"
    if key not in _building_hq:
        _building_hq.add(key)

        def build():
            try:
                get_image(folder_id, file_id, "hq")
            except Exception:
                pass
            finally:
                _building_hq.discard(key)

        threading.Thread(target=build, daemon=True).start()
    return data


_building_hq: set[str] = set()


# ---------------------------------------------------------------- warming, status, cleanup
_warming: set[str] = set()


def cache_status(folder_id: str) -> dict:
    """How much of a folder is already on disk. Cheap: only stat calls, no Drive round-trip
    unless the list itself is unknown."""
    try:
        photos = list_photos(folder_id)
    except DriveError:
        return {"total": 0, "thumb": 0, "full": 0, "warming": folder_id in _warming}
    thumb = sum(_cache_path(folder_id, p.file_id, "thumb").exists() for p in photos)
    full = sum(_cache_path(folder_id, p.file_id, "full").exists() for p in photos)
    return {"total": len(photos), "thumb": thumb, "full": full, "warming": folder_id in _warming}


def warm_cache(folder_id: str, workers: int = 6, hq: bool = False) -> None:
    """Pre-fetch every thumbnail (then full images) so the client never waits. Runs in a background task.
    `hq` (portfolio / site folders): the full size comes from the originals — slower, sharper."""
    from concurrent.futures import ThreadPoolExecutor

    if folder_id in _warming:
        return
    _warming.add(folder_id)
    try:
        photos = list_photos(folder_id)

        def fetch(args):
            p, size = args
            if _cache_path(folder_id, p.file_id, size).exists():  # resumed run: skip what is on disk
                return
            if size != "thumb" and not disk_ok():  # large images only while there is room
                return
            try:
                get_image(folder_id, p.file_id, size)
            except Exception:
                pass

        with ThreadPoolExecutor(max_workers=workers) as ex:
            list(ex.map(fetch, [(p, "thumb") for p in photos]))
            list(ex.map(fetch, [(p, "hq" if hq else "full") for p in photos]))
    except DriveError:
        pass
    finally:
        _warming.discard(folder_id)


def purge_folder(folder_id: str) -> None:
    """Drop everything cached for a folder (it is rebuilt on demand)."""
    import shutil

    shutil.rmtree(_folder_dir(folder_id), ignore_errors=True)
    with _list_lock:
        _list_cache.pop(folder_id, None)


def purge_except(keep_folder_ids: set[str]) -> int:
    """Remove cache directories that belong to no listed folder. Returns count removed."""
    import shutil

    root = Path(get_settings().cache_dir)
    if not root.exists():
        return 0
    keep = {_folder_dir(f).name for f in keep_folder_ids}
    removed = 0
    for d in root.iterdir():
        if d.is_dir() and d.name not in keep:
            shutil.rmtree(d, ignore_errors=True)
            removed += 1
    return removed
