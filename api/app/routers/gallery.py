import hashlib
import hmac
import json
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DbSession

from ..auth import is_admin_token
from ..config import get_settings
from ..database import get_db
from ..models import PhotoSession, SelectedPhoto, SessionStatus, utcnow
from ..schemas import Branding, DraftRequest, GalleryMeta, GalleryOut, Photo, SubmitOut, SubmitRequest, UnlockOut, UnlockRequest
from ..services import branding, drive_service

router = APIRouter(prefix="/api", tags=["gallery"])

NOTE_MAX = 300

# ---------------------------------------------------------------- PIN brute-force guard
# Two counters, both in memory: per visitor (5 wrong / 15 min) and per gallery (10 wrong / 15 min
# from anyone). The per-gallery one can't be dodged by switching or faking addresses, so at most
# ~40 guesses an hour are possible against 10,000 four-digit PINs. The visitor address is the real
# connection address; the X-Forwarded-For header is ignored because anyone can fake it.
PIN_MAX_FAILS = 5
PIN_MAX_FAILS_GALLERY = 10
PIN_WINDOW_S = 15 * 60
_pin_fails: dict[str, list[float]] = defaultdict(list)


def _fail_key(slug: str, request: Request) -> str:
    ip = request.client.host if request.client else "?"
    return f"{slug}:{ip}"


def clear_pin_fails(slug: str) -> None:
    for k in [k for k in _pin_fails if k == slug or k.startswith(f"{slug}:")]:
        _pin_fails.pop(k, None)


def _recent_fails(key: str) -> list[float]:
    now = time.monotonic()
    fails = [t for t in _pin_fails[key] if now - t < PIN_WINDOW_S]
    _pin_fails[key] = fails
    return fails


def _clean_notes(notes: dict[str, str], ids: list[str]) -> dict[str, str]:
    keep = set(ids)
    return {k: v.strip()[:NOTE_MAX] for k, v in notes.items() if k in keep and v and v.strip()}


# ---------------------------------------------------------------- pin helpers
def hash_pin(pin: str) -> str:
    return hashlib.sha256(f"{get_settings().secret_key}:{pin}".encode()).hexdigest()


# ---------------------------------------------------------------- access tokens
# Signed "exp.signature" tokens. They become invalid when: they expire, the PIN changes, or the
# admin presses "Kunci ulang semua perangkat" (access_epoch bump).
ACCESS_TTL_S = 7 * 24 * 3600  # an unlocked device stays unlocked for 7 days
IMAGE_TTL_S = 12 * 3600  # image links (can be copied/shared) die after ~12 hours


def _sign(s: PhotoSession, purpose: str, exp: int) -> str:
    msg = f"{purpose}:{s.slug}:{s.pin_hash}:{s.access_epoch or 0}:{exp}"
    return hmac.new(get_settings().secret_key.encode(), msg.encode(), "sha256").hexdigest()[:32]


def _make(s: PhotoSession, purpose: str, ttl: int) -> str:
    exp = int(time.time()) + ttl
    if purpose == "img":  # round up to the hour so image URLs stay stable (and browser-cacheable) for a while
        exp = (exp // 3600 + 1) * 3600
    return f"{exp}.{_sign(s, purpose, exp)}"


def _valid(s: PhotoSession, token: str | None, purpose: str) -> bool:
    try:
        exp_s, sig = (token or "").split(".", 1)
        exp = int(exp_s)
    except ValueError:
        return False
    return exp > time.time() and hmac.compare_digest(sig, _sign(s, purpose, exp))


def gallery_token(s: PhotoSession) -> str:
    """Device pass given after a correct PIN (valid 7 days)."""
    return _make(s, "access", ACCESS_TTL_S)


def image_token(s: PhotoSession) -> str:
    """Short-lived pass embedded in image URLs."""
    return _make(s, "img", IMAGE_TTL_S)


def _session(db: DbSession, slug: str) -> PhotoSession:
    s = db.query(PhotoSession).filter(PhotoSession.slug == slug).first()
    if not s:
        raise HTTPException(404, "Galeri tidak ditemukan atau link tidak valid.")
    return s


def _expired(s: PhotoSession) -> bool:
    if not s.expires_at:
        return False
    exp = s.expires_at if s.expires_at.tzinfo else s.expires_at.replace(tzinfo=utcnow().tzinfo)
    return exp < utcnow()


def _authorize(s: PhotoSession, token: str | None, purpose: str = "access", admin: bool = False) -> None:
    if admin:  # the photographer can always preview, PIN or expiry
        return
    if _expired(s):
        raise HTTPException(410, "Link galeri ini sudah kedaluwarsa. Hubungi fotografer Anda.")
    if s.pin_hash and not _valid(s, token, purpose):
        raise HTTPException(401, "Galeri ini dilindungi PIN. Masukkan PIN lagi.")


def _img(slug: str, file_id: str, size: str, token: str | None) -> str:
    url = f"/api/gallery/{slug}/img/{file_id}?size={size}"
    return f"{url}&t={token}" if token else url


# ---------------------------------------------------------------- endpoints
@router.get("/branding/logo")
def branding_logo():
    p = branding.logo_path()
    if not p:
        raise HTTPException(404)
    return FileResponse(p, headers={"Cache-Control": "public, max-age=86400"})


@router.get("/gallery/{slug}/meta", response_model=GalleryMeta)
def gallery_meta(slug: str, db: DbSession = Depends(get_db), authorization: str | None = Header(None)):
    s = _session(db, slug)
    admin = is_admin_token(authorization)
    return GalleryMeta(
        client_name=s.client_name,
        locked=bool(s.pin_hash) and not admin,
        expired=_expired(s) and not admin,
        preview=admin,
        branding=branding.get(db),
    )


@router.post("/gallery/{slug}/unlock", response_model=UnlockOut)
def unlock(slug: str, body: UnlockRequest, request: Request, db: DbSession = Depends(get_db)):
    s = _session(db, slug)
    if _expired(s):
        raise HTTPException(410, "Link galeri ini sudah kedaluwarsa.")
    key = _fail_key(slug, request)
    if len(_recent_fails(key)) >= PIN_MAX_FAILS or len(_recent_fails(slug)) >= PIN_MAX_FAILS_GALLERY:
        raise HTTPException(429, "Terlalu banyak percobaan PIN. Tunggu 15 menit, atau tanyakan PIN yang benar ke fotografer Anda.")
    if not s.pin_hash or not hmac.compare_digest(hash_pin(body.pin.strip()), s.pin_hash):
        now = time.monotonic()
        _pin_fails[key].append(now)
        _pin_fails[slug].append(now)
        left = min(PIN_MAX_FAILS - len(_pin_fails[key]), PIN_MAX_FAILS_GALLERY - len(_pin_fails[slug]))
        raise HTTPException(401, f"PIN salah. Sisa {left} kali percobaan." if left > 0 else "PIN salah. Coba lagi dalam 15 menit.")
    _pin_fails.pop(key, None)
    return UnlockOut(token=gallery_token(s))


@router.get("/gallery/{slug}", response_model=GalleryOut)
def get_gallery(slug: str, db: DbSession = Depends(get_db), x_gallery_token: str | None = Header(None), authorization: str | None = Header(None)):
    admin = is_admin_token(authorization)
    s = _session(db, slug)
    _authorize(s, x_gallery_token, admin=admin)
    try:
        photos = drive_service.list_photos(s.drive_folder_id)
    except drive_service.DriveError as e:
        raise HTTPException(502, str(e))

    if not admin:  # the photographer's own preview must not count as "client opened the gallery"
        now = utcnow()
        s.first_opened_at = s.first_opened_at or now
        s.last_seen_at = now
        db.commit()

    if s.status == SessionStatus.completed:
        sel_ids = [p.drive_file_id for p in s.selected_photos]
        sel_notes = {p.drive_file_id: p.note for p in s.selected_photos if p.note}
    else:  # in-progress picks saved from any device
        known = {p.file_id for p in photos}
        sel_ids = [i for i in json.loads(s.draft_ids or "[]") if i in known]
        sel_notes = _clean_notes(json.loads(s.draft_notes or "{}"), sel_ids)
        maybe = [i for i in json.loads(s.draft_maybe or "[]") if i in known and i not in set(sel_ids)]

    if s.status == SessionStatus.completed:
        maybe = []
    tok = image_token(s) if s.pin_hash else None
    return GalleryOut(
        client_name=s.client_name,
        photo_limit=s.photo_limit,
        max_limit=s.hard_limit,
        status=s.status,
        photos=[
            Photo(
                file_id=p.file_id,
                filename=p.filename,
                name=p.name,
                width=p.width,
                height=p.height,
                thumb_url=_img(slug, p.file_id, "thumb", tok),
                full_url=_img(slug, p.file_id, "full", tok),
            )
            for p in photos
        ],
        selected_ids=sel_ids,
        notes=sel_notes,
        maybe_ids=maybe,
        rev=s.reset_count or 0,
        preview=admin,
        expires_at=s.expires_at,
        branding=branding.get(db),
    )


@router.get("/gallery/{slug}/img/{file_id}")
async def get_image(slug: str, file_id: str, size: str = "thumb", t: str | None = Query(None), db: DbSession = Depends(get_db)):
    s = _session(db, slug)
    _authorize(s, t, "img")
    size = "full" if size == "full" else "thumb"
    try:
        data, media_type = await run_in_threadpool(drive_service.get_image, s.drive_folder_id, file_id, size)
    except drive_service.DriveError as e:
        raise HTTPException(404, str(e))
    return Response(data, media_type=media_type, headers={"Cache-Control": "private, max-age=604800, immutable"})


@router.put("/gallery/{slug}/draft", status_code=204)
def save_draft(slug: str, body: DraftRequest, db: DbSession = Depends(get_db), x_gallery_token: str | None = Header(None), authorization: str | None = Header(None)):
    if is_admin_token(authorization):  # preview mode: never overwrite the client's picks
        return Response(status_code=204)
    """Autosave of the client's picks so they can continue on another device."""
    s = _session(db, slug)
    _authorize(s, x_gallery_token)
    if s.status == SessionStatus.completed:
        raise HTTPException(409, "Pilihan sudah dikirim.")
    ids = list(dict.fromkeys(body.file_ids))[: s.hard_limit]
    s.draft_ids = json.dumps(ids)
    s.draft_notes = json.dumps(_clean_notes(body.notes, ids))
    s.draft_maybe = json.dumps([i for i in dict.fromkeys(body.maybe_ids) if i not in set(ids)][:2000])
    db.commit()
    return Response(status_code=204)


@router.post("/gallery/{slug}/submit", response_model=SubmitOut)
def submit(slug: str, body: SubmitRequest, db: DbSession = Depends(get_db), x_gallery_token: str | None = Header(None), authorization: str | None = Header(None)):
    if is_admin_token(authorization):
        raise HTTPException(403, "Mode pratinjau fotografer: pilihan tidak dikirim. Buka link di browser lain (atau mode Incognito) untuk mencoba sebagai klien.")
    s = _session(db, slug)
    _authorize(s, x_gallery_token)
    if s.status == SessionStatus.completed:
        raise HTTPException(400, "Pilihan sudah dikirim sebelumnya. Galeri ini sekarang hanya bisa dilihat.")

    ids = list(dict.fromkeys(body.file_ids))  # de-dupe, keep selection order
    if len(ids) > s.hard_limit:
        raise HTTPException(400, f"Maksimal {s.hard_limit} foto, Anda memilih {len(ids)}.")

    by_id = {p.file_id: p for p in drive_service.list_photos(s.drive_folder_id)}
    if any(i not in by_id for i in ids):
        raise HTTPException(400, "Beberapa foto tidak dikenali. Muat ulang halaman dan coba lagi.")

    n_extra = max(0, len(ids) - s.photo_limit)
    chosen = [i for i in dict.fromkeys(body.extra_ids or []) if i in ids]
    # Respect the client's own choice of which photos are the paid extras when it is consistent.
    extra_set = set(chosen) if len(chosen) == n_extra else set(ids[s.photo_limit:])

    for i in ids:
        note = (body.notes.get(i) or "").strip()[:NOTE_MAX] or None
        s.selected_photos.append(
            SelectedPhoto(drive_file_id=i, filename=by_id[i].filename, note=note, is_extra=i in extra_set)
        )
    s.status = SessionStatus.completed
    s.submitted_at = utcnow()
    s.draft_ids = s.draft_notes = s.draft_maybe = None
    db.commit()

    extra = max(0, len(ids) - s.photo_limit)
    msg = f"Terima kasih! {len(ids)} foto pilihan Anda sudah tersimpan."
    if extra:
        msg += f" {extra} di antaranya di luar paket."
    return SubmitOut(selected_count=len(ids), extra_count=extra, message=msg)
