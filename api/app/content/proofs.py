"""Album proofs (online). The album app (desktop/) uploads one JPEG per spread; the client opens
/p/{slug} on the site with a PIN, looks through the album, leaves notes (optionally pointing at a spot
on a spread) and approves it. The app reads the notes back into each page's revision note.

Files live on the volume: {UPLOAD_DIR}/proofs/{proof id}/v{version}/{index}.jpg. Only the newest
version is kept; the files of a proof are removed 60 days after it was approved or expired."""
import hashlib
import hmac
import json
import logging
import secrets
import shutil
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, Session as DbSession, mapped_column, relationship

from ..auth import is_admin_token, require_admin
from ..config import get_settings
from ..database import Base, SessionLocal, get_db
from ..models import new_slug, utcnow
from ..services import ratelimit

log = logging.getLogger(__name__)

MAX_SPREADS = 120
MAX_IMAGE_BYTES = 6 * 1024 * 1024
MAX_NOTES = 400
KEEP_FILES_DAYS = 60


# ---------------------------------------------------------------- tables
class AlbumProof(Base):
    __tablename__ = "album_proofs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(32), unique=True, index=True, default=new_slug)
    # The album app's project id, so sending again updates the same link.
    project_key: Mapped[str] = mapped_column(String(64), index=True)
    client_name: Mapped[str] = mapped_column(String(255))
    lang: Mapped[str] = mapped_column(String(2), default="en")
    pin: Mapped[str] = mapped_column(String(8))
    pin_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    version: Mapped[int] = mapped_column(Integer, default=0)  # 0 = nothing published yet
    spreads: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON [{label, w, h}]
    status: Mapped[str] = mapped_column(String(16), default="open")  # open | approved
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    allow_notes: Mapped[bool] = mapped_column(Boolean, default=True)
    open_count: Mapped[int] = mapped_column(Integer, default=0)
    first_opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    files_removed: Mapped[bool] = mapped_column(Boolean, default=False)

    notes: Mapped[list["ProofNote"]] = relationship(back_populates="proof", cascade="all, delete-orphan", order_by="ProofNote.id")


class ProofNote(Base):
    __tablename__ = "album_proof_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    proof_id: Mapped[str] = mapped_column(ForeignKey("album_proofs.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    spread: Mapped[int] = mapped_column(Integer)
    x: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0..1 across the spread
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    author: Mapped[str] = mapped_column(String(80))
    text: Mapped[str] = mapped_column(Text)
    key: Mapped[str] = mapped_column(String(24))  # lets the device that wrote it delete it
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    done: Mapped[bool] = mapped_column(Boolean, default=False)  # set by the photographer

    proof: Mapped[AlbumProof] = relationship(back_populates="notes")


# ---------------------------------------------------------------- schemas
class ProofIn(BaseModel):
    project_key: str = Field(min_length=1, max_length=64)
    client_name: str = Field(min_length=1, max_length=120)
    lang: Literal["en", "id"] = "en"
    expires_days: int = Field(14, ge=1, le=120)
    allow_notes: bool = True


class SpreadIn(BaseModel):
    label: str = Field(max_length=24)
    w: int = Field(gt=0, le=10000)
    h: int = Field(gt=0, le=10000)


class PublishIn(BaseModel):
    spreads: list[SpreadIn] = Field(min_length=1, max_length=MAX_SPREADS)


class NoteOut(BaseModel):
    id: int
    version: int
    spread: int
    x: float | None
    y: float | None
    author: str
    text: str
    created_at: datetime
    done: bool


class NoteCreated(NoteOut):
    key: str


class NoteDone(BaseModel):
    done: bool


class ProofAdminOut(BaseModel):
    id: str
    slug: str
    pin: str
    url: str
    client_name: str
    lang: str
    version: int
    spread_count: int
    status: str
    approved_at: datetime | None
    approved_by: str | None
    expires_at: datetime | None
    allow_notes: bool
    open_count: int
    first_opened_at: datetime | None
    last_seen_at: datetime | None
    notes: list[NoteOut]


class SpreadOut(BaseModel):
    index: int
    label: str
    w: int
    h: int
    url: str


class ProofMeta(BaseModel):
    client_name: str
    lang: str
    locked: bool
    expired: bool
    status: str


class ProofOut(BaseModel):
    client_name: str
    lang: str
    version: int
    status: str
    approved_at: datetime | None
    approved_by: str | None
    allow_notes: bool
    expires_at: datetime | None
    spreads: list[SpreadOut]
    notes: list[NoteOut]
    preview: bool


class UnlockIn(BaseModel):
    pin: str = Field(min_length=1, max_length=8)


class UnlockOut(BaseModel):
    token: str


class NoteIn(BaseModel):
    spread: int = Field(ge=0, lt=MAX_SPREADS)
    x: float | None = Field(None, ge=0, le=1)
    y: float | None = Field(None, ge=0, le=1)
    author: str = Field(min_length=1, max_length=60)
    text: str = Field(min_length=1, max_length=600)


class ApproveIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


# ---------------------------------------------------------------- helpers
def _dir(p: AlbumProof) -> Path:
    return Path(get_settings().upload_dir) / "proofs" / p.id


def _hash_pin(pin: str) -> str:
    return hashlib.sha256(f"{get_settings().secret_key}:proof:{pin}".encode()).hexdigest()


def _aware(d: datetime | None) -> datetime | None:
    return d if d is None or d.tzinfo else d.replace(tzinfo=utcnow().tzinfo)


def _expired(p: AlbumProof) -> bool:
    e = _aware(p.expires_at)
    return bool(e and e < utcnow())


def _spreads(p: AlbumProof) -> list[dict]:
    return json.loads(p.spreads or "[]")


def _note(n: ProofNote) -> NoteOut:
    return NoteOut(id=n.id, version=n.version, spread=n.spread, x=n.x, y=n.y, author=n.author, text=n.text, created_at=n.created_at, done=n.done)


# Signed "exp.signature" passes, like the client gallery: the device pass lasts 7 days, image links
# about 12 hours. Changing the PIN invalidates both.
ACCESS_TTL_S = 7 * 24 * 3600
IMAGE_TTL_S = 12 * 3600


def _sign(p: AlbumProof, purpose: str, exp: int) -> str:
    msg = f"proof:{purpose}:{p.slug}:{p.pin_hash}:{exp}"
    return hmac.new(get_settings().secret_key.encode(), msg.encode(), "sha256").hexdigest()[:32]


def _make(p: AlbumProof, purpose: str, ttl: int) -> str:
    exp = int(time.time()) + ttl
    if purpose == "img":
        exp = (exp // 3600 + 1) * 3600
    return f"{exp}.{_sign(p, purpose, exp)}"


def _valid(p: AlbumProof, token: str | None, purpose: str) -> bool:
    try:
        exp_s, sig = (token or "").split(".", 1)
        exp = int(exp_s)
    except ValueError:
        return False
    return exp > time.time() and hmac.compare_digest(sig, _sign(p, purpose, exp))


def _by_slug(db: DbSession, slug: str) -> AlbumProof:
    p = db.query(AlbumProof).filter(AlbumProof.slug == slug).first()
    if not p or p.version == 0:
        raise HTTPException(404, "Album proof not found.")
    return p


def _authorize(p: AlbumProof, token: str | None, purpose: str = "access", admin: bool = False) -> None:
    if admin:
        return
    if _expired(p):
        raise HTTPException(410, "This proof link has expired. Please contact us.")
    if not _valid(p, token, purpose):
        raise HTTPException(401, "Enter the PIN again.")


def _admin_out(p: AlbumProof) -> ProofAdminOut:
    return ProofAdminOut(
        id=p.id, slug=p.slug, pin=p.pin, url=f"{get_settings().frontend_url.rstrip('/')}/p/{p.slug}",
        client_name=p.client_name, lang=p.lang, version=p.version, spread_count=len(_spreads(p)), status=p.status,
        approved_at=p.approved_at, approved_by=p.approved_by, expires_at=p.expires_at, allow_notes=p.allow_notes,
        open_count=p.open_count or 0, first_opened_at=p.first_opened_at, last_seen_at=p.last_seen_at,
        notes=[_note(n) for n in p.notes],
    )


def _public_out(p: AlbumProof, admin: bool) -> ProofOut:
    t = _make(p, "img", IMAGE_TTL_S)
    spreads = [SpreadOut(index=i, label=s.get("label", ""), w=s["w"], h=s["h"], url=f"/api/proof/{p.slug}/img/{p.version}/{i}?t={t}") for i, s in enumerate(_spreads(p))]
    return ProofOut(
        client_name=p.client_name, lang=p.lang, version=p.version, status=p.status, approved_at=p.approved_at, approved_by=p.approved_by,
        allow_notes=p.allow_notes, expires_at=p.expires_at, spreads=spreads, notes=[_note(n) for n in p.notes], preview=admin,
    )


def purge_old_files() -> int:
    """Free the volume: drop image files of proofs approved or expired more than 60 days ago."""
    cutoff = utcnow() - timedelta(days=KEEP_FILES_DAYS)
    n = 0
    with SessionLocal() as db:
        for p in db.query(AlbumProof).filter(AlbumProof.files_removed.is_(False)).all():
            done = _aware(p.approved_at) if p.status == "approved" else _aware(p.expires_at)
            if done and done < cutoff:
                shutil.rmtree(_dir(p), ignore_errors=True)
                p.files_removed = True
                n += 1
        db.commit()
    return n


# ---------------------------------------------------------------- album app (admin)
router = APIRouter(prefix="/api/admin/proofs", tags=["proofs"], dependencies=[Depends(require_admin)])


def _get(db: DbSession, proof_id: str) -> AlbumProof:
    p = db.get(AlbumProof, proof_id)
    if not p:
        raise HTTPException(404, "Proof tidak ditemukan.")
    return p


@router.post("", response_model=ProofAdminOut)
def create_or_update(body: ProofIn, db: DbSession = Depends(get_db)):
    """One proof per album project: sending again keeps the link and PIN."""
    p = db.query(AlbumProof).filter(AlbumProof.project_key == body.project_key).first()
    if not p:
        pin = f"{secrets.randbelow(10000):04d}"
        p = AlbumProof(project_key=body.project_key, pin=pin, pin_hash=_hash_pin(pin))
        db.add(p)
    p.client_name = body.client_name.strip()
    p.lang = body.lang
    p.allow_notes = body.allow_notes
    p.expires_at = utcnow() + timedelta(days=body.expires_days)
    p.updated_at = utcnow()
    db.commit()
    return _admin_out(p)


@router.get("", response_model=list[ProofAdminOut])
def find(project_key: str = Query(..., max_length=64), db: DbSession = Depends(get_db)):
    return [_admin_out(p) for p in db.query(AlbumProof).filter(AlbumProof.project_key == project_key).all()]


@router.get("/{proof_id}", response_model=ProofAdminOut)
def detail(proof_id: str, db: DbSession = Depends(get_db)):
    return _admin_out(_get(db, proof_id))


@router.put("/{proof_id}/draft/{index}", status_code=204)
async def upload_spread(proof_id: str, index: int, request: Request, db: DbSession = Depends(get_db)):
    """One spread image (raw JPEG body) of the version being prepared."""
    p = _get(db, proof_id)
    if not 0 <= index < MAX_SPREADS:
        raise HTTPException(400, "Nomor spread di luar batas.")
    data = await request.body()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Gambar spread terlalu besar (maks. 6 MB).")
    if data[:3] != b"\xff\xd8\xff":
        raise HTTPException(415, "Harus JPEG.")
    d = _dir(p) / "draft"
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{index}.jpg").write_bytes(data)
    return Response(status_code=204)


@router.post("/{proof_id}/publish", response_model=ProofAdminOut)
def publish(proof_id: str, body: PublishIn, db: DbSession = Depends(get_db)):
    """Make the uploaded spreads the current version. The client sees it on their next visit;
    earlier notes stay (marked with their version); an approval is cleared."""
    p = _get(db, proof_id)
    root, draft = _dir(p), _dir(p) / "draft"
    missing = [i for i in range(len(body.spreads)) if not (draft / f"{i}.jpg").exists()]
    if missing:
        raise HTTPException(400, f"Spread belum terunggah: {', '.join(str(i + 1) for i in missing[:5])}.")
    for extra in draft.glob("*.jpg"):
        if int(extra.stem) >= len(body.spreads):
            extra.unlink()
    v = p.version + 1
    draft.rename(root / f"v{v}")
    for old in root.glob("v*"):
        if old.name != f"v{v}":
            shutil.rmtree(old, ignore_errors=True)
    p.version = v
    p.spreads = json.dumps([s.model_dump() for s in body.spreads])
    p.status = "open"
    p.approved_at = p.approved_by = None
    p.files_removed = False
    p.updated_at = utcnow()
    db.commit()
    return _admin_out(p)


@router.patch("/{proof_id}/notes/{note_id}", response_model=NoteOut)
def mark_note(proof_id: str, note_id: int, body: NoteDone, db: DbSession = Depends(get_db)):
    n = db.get(ProofNote, note_id)
    if not n or n.proof_id != proof_id:
        raise HTTPException(404, "Catatan tidak ditemukan.")
    n.done = body.done
    db.commit()
    return _note(n)


@router.delete("/{proof_id}", status_code=204)
def delete_proof(proof_id: str, db: DbSession = Depends(get_db)):
    p = _get(db, proof_id)
    shutil.rmtree(_dir(p), ignore_errors=True)
    db.delete(p)
    db.commit()
    return Response(status_code=204)


# ---------------------------------------------------------------- client (public, PIN)
public = APIRouter(prefix="/api/proof", tags=["proofs"])
PIN_MAX_FAILS, PIN_MAX_FAILS_PROOF, PIN_WINDOW_S = 5, 10, 15 * 60


@public.get("/{slug}/meta", response_model=ProofMeta)
def meta(slug: str, db: DbSession = Depends(get_db), authorization: str | None = Header(None)):
    p = _by_slug(db, slug)
    admin = is_admin_token(authorization)
    return ProofMeta(client_name=p.client_name, lang=p.lang, locked=not admin, expired=_expired(p) and not admin, status=p.status)


@public.post("/{slug}/unlock", response_model=UnlockOut)
def unlock(slug: str, body: UnlockIn, request: Request, db: DbSession = Depends(get_db)):
    p = _by_slug(db, slug)
    if _expired(p):
        raise HTTPException(410, "This proof link has expired. Please contact us.")
    ip = request.client.host if request.client else "?"
    key, pkey = f"proofpin:{slug}:{ip}", f"proofpin:{slug}"
    if ratelimit.count(db, key, PIN_WINDOW_S) >= PIN_MAX_FAILS or ratelimit.count(db, pkey, PIN_WINDOW_S) >= PIN_MAX_FAILS_PROOF:
        raise HTTPException(429, "Too many tries. Please wait 15 minutes.")
    if not hmac.compare_digest(_hash_pin(body.pin.strip()), p.pin_hash):
        ratelimit.record(db, key, pkey)
        raise HTTPException(401, "Wrong PIN.")
    ratelimit.clear(db, key)
    return UnlockOut(token=_make(p, "access", ACCESS_TTL_S))


@public.get("/{slug}", response_model=ProofOut)
def view(slug: str, db: DbSession = Depends(get_db), x_proof_token: str | None = Header(None), authorization: str | None = Header(None)):
    p = _by_slug(db, slug)
    admin = is_admin_token(authorization)
    _authorize(p, x_proof_token, admin=admin)
    if not admin:  # the photographer's own look does not count as "opened by the client"
        now = utcnow()
        last = _aware(p.last_seen_at)
        if not last or now - last > timedelta(minutes=30):
            p.open_count = (p.open_count or 0) + 1
        from .activity import record

        record(db, "proof_open", f"{p.client_name} opened the album proof (v{p.version})", "/admin", key=f"{p.id}:{p.version}", every_hours=6)
        p.first_opened_at = p.first_opened_at or now
        p.last_seen_at = now
        db.commit()
    return _public_out(p, admin)


@public.get("/{slug}/img/{version}/{index}")
def image(slug: str, version: int, index: int, t: str | None = Query(None), db: DbSession = Depends(get_db)):
    p = _by_slug(db, slug)
    _authorize(p, t, "img")
    f = _dir(p) / f"v{version}" / f"{index}.jpg"
    if version != p.version or not f.is_file():
        raise HTTPException(404, "Not found.")
    return FileResponse(f, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=604800, immutable"})


@public.post("/{slug}/notes", response_model=NoteCreated, status_code=201)
def add_note(slug: str, body: NoteIn, db: DbSession = Depends(get_db), x_proof_token: str | None = Header(None), authorization: str | None = Header(None)):
    if is_admin_token(authorization):
        raise HTTPException(403, "Preview mode: notes are for the client.")
    p = _by_slug(db, slug)
    _authorize(p, x_proof_token)
    if p.status == "approved":
        raise HTTPException(409, "This album is already approved.")
    if not p.allow_notes:
        raise HTTPException(403, "Notes are turned off for this proof.")
    if body.spread >= len(_spreads(p)):
        raise HTTPException(400, "Unknown spread.")
    if len(p.notes) >= MAX_NOTES:
        raise HTTPException(429, "Too many notes. Please message us instead.")
    n = ProofNote(version=p.version, spread=body.spread, x=body.x, y=body.y, author=body.author.strip(), text=body.text.strip(), key=secrets.token_urlsafe(12))
    p.notes.append(n)
    from .activity import record

    record(db, "proof_note", f"{body.author.strip() or p.client_name} left a note on the album proof: “{body.text.strip()[:80]}”", "/admin", key=p.id)
    db.commit()
    return NoteCreated(**_note(n).model_dump(), key=n.key)


@public.delete("/{slug}/notes/{note_id}", status_code=204)
def delete_note(slug: str, note_id: int, key: str = Query(..., max_length=24), db: DbSession = Depends(get_db), x_proof_token: str | None = Header(None)):
    p = _by_slug(db, slug)
    _authorize(p, x_proof_token)
    n = db.get(ProofNote, note_id)
    if not n or n.proof_id != p.id or not hmac.compare_digest(n.key, key):
        raise HTTPException(404, "Note not found.")
    if p.status == "approved" or n.done:
        raise HTTPException(409, "This note can no longer be removed.")
    db.delete(n)
    db.commit()
    return Response(status_code=204)


@public.post("/{slug}/approve", response_model=ProofOut)
def approve(slug: str, body: ApproveIn, db: DbSession = Depends(get_db), x_proof_token: str | None = Header(None), authorization: str | None = Header(None)):
    if is_admin_token(authorization):
        raise HTTPException(403, "Preview mode: only the client can approve.")
    p = _by_slug(db, slug)
    _authorize(p, x_proof_token)
    if p.status != "approved":
        p.status = "approved"
        p.approved_at = utcnow()
        p.approved_by = body.name.strip()
        from .activity import record

        record(db, "proof_approve", f"{p.approved_by or p.client_name} approved the album (v{p.version})", "/admin", key=p.id)
        db.commit()
    return _public_out(p, False)
