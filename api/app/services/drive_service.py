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
import io
import os
import threading
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import httpx

from ..config import get_settings

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
IMAGE_MIMES = ("image/jpeg", "image/png", "image/webp")
THUMB_PX = 640
FULL_PX = 2048  # lightbox size; originals (often 15 MB+) are never kept
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
        im.save(out, "JPEG", quality=85, optimize=True, progressive=True)
        return out.getvalue()


def _folder_dir(folder_id: str) -> Path:
    return Path(get_settings().cache_dir) / hashlib.sha1(folder_id.encode()).hexdigest()[:16]


def _cache_path(folder_id: str, file_id: str, size: str) -> Path:
    d = _folder_dir(folder_id) / size
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{hashlib.sha1(file_id.encode()).hexdigest()}.jpg"


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
    with _list_lock:
        _list_cache[folder_id] = photos
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

    px = FULL_PX if size == "full" else THUMB_PX

    if is_mock():
        data = _resize(_download_mock(photo), px)
    else:
        # Fast path: Drive-rendered resize. Fallback: download original and resize locally.
        data = _download_drive_thumb(photo, px) or _resize(_download_real(photo), px)

    _write_atomic(cached, data)
    return data, "image/jpeg"


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


def warm_cache(folder_id: str, workers: int = 6) -> None:
    """Pre-fetch every thumbnail (then full images) so the client never waits. Runs in a background task."""
    from concurrent.futures import ThreadPoolExecutor

    if folder_id in _warming:
        return
    _warming.add(folder_id)
    try:
        photos = list_photos(folder_id)

        def fetch(args):
            p, size = args
            try:
                get_image(folder_id, p.file_id, size)
            except Exception:
                pass

        with ThreadPoolExecutor(max_workers=workers) as ex:
            list(ex.map(fetch, [(p, "thumb") for p in photos]))
            list(ex.map(fetch, [(p, "full") for p in photos]))
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
