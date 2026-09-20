"""Site images — the photographs on the pages themselves (hero, About portrait,
service banners, …), as opposed to portfolio projects. One Google Drive folder
holds them; each named slot points at one file in it. Stored in the settings table."""
import json
import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from ..auth import require_admin
from ..database import get_db
from ..models import Setting
from ..services import drive_service
from . import site_cache
from .schemas import ProjectPhotoOut

# Every slot the site renders, with where it appears — the admin shows this list.
SLOTS: list[tuple[str, str, str]] = [  # (slot, page, description)
    ("hero", "Home", "Full-screen opening photograph (falls back to the first featured project's cover)"),
    ("card-wedding", "Home", "Intro card · Wedding"),
    ("card-prewedding", "Home", "Intro card · Pre-wedding"),
    ("card-personal", "Home", "Intro card · Personal"),
    ("behind-main", "Home", "Behind the camera · portrait"),
    ("cta", "Home", "Closing invitation · wide"),
    ("about-portrait", "About", "Portrait at the top"),
    ("about-1", "About", "Strip of four · 1"),
    ("about-2", "About", "Strip of four · 2"),
    ("about-3", "About", "Strip of four · 3"),
    ("about-4", "About", "Strip of four · 4"),
    ("service-banner", "Services", "Banner across the top"),
    ("service-wedding", "Services", "Wedding"),
    ("service-prewedding", "Services", "Pre-wedding"),
    ("service-event", "Services", "Event"),
    ("service-personal", "Services", "Personal"),
    ("contact-1", "Contact", "Photograph beside the form"),
]
SLOT_IDS = {s[0] for s in SLOTS}
KEY_FOLDER = "site.images_folder"
KEY_MAP = "site.images"


def _get(db: DbSession, key: str) -> str | None:
    row = db.get(Setting, key)
    return row.value if row else None


def _put(db: DbSession, key: str, value: str) -> None:
    row = db.get(Setting, key)
    if row is None:
        db.add(Setting(key=key, value=value))
    else:
        row.value = value


def folder_id(db: DbSession) -> str:
    return (_get(db, KEY_FOLDER) or "").strip()


def slot_map(db: DbSession) -> dict[str, str]:
    try:
        raw = json.loads(_get(db, KEY_MAP) or "{}")
    except ValueError:
        raw = {}
    return {k: v for k, v in raw.items() if k in SLOT_IDS and isinstance(v, str) and v}


def public_urls(db: DbSession) -> dict[str, str]:
    """slot → proxy URL, for the site. Only slots with a file set."""
    folder = folder_id(db)
    if not folder:
        return {}
    return {slot: f"/api/public/img/{folder}/{fid}?size=full" for slot, fid in slot_map(db).items()}


# ---------------------------------------------------------------- admin
class SlotOut(BaseModel):
    slot: str
    page: str
    description: str
    file_id: str | None


class SiteImagesOut(BaseModel):
    folder_id: str
    photos: list[ProjectPhotoOut]
    slots: list[SlotOut]
    folder_error: str | None = None


class SiteImagesIn(BaseModel):
    folder_id: str | None = None  # link or id; "" clears
    slots: dict[str, str | None] | None = None  # slot → file_id ("" / null clears one slot)


router = APIRouter(prefix="/api/admin", tags=["site-images"], dependencies=[Depends(require_admin)])


def _out(db: DbSession, refresh: bool = False) -> SiteImagesOut:
    folder = folder_id(db)
    photos: list[ProjectPhotoOut] = []
    error = None
    if folder:
        try:
            for p in drive_service.list_photos(folder, refresh=refresh):
                photos.append(ProjectPhotoOut(file_id=p.file_id, filename=p.filename, width=p.width, height=p.height, thumb_url=f"/api/public/img/{folder}/{p.file_id}?size=thumb", full_url=f"/api/public/img/{folder}/{p.file_id}?size=full"))
        except drive_service.DriveError as e:
            error = str(e)
    known = {p.file_id for p in photos}
    m = slot_map(db)
    return SiteImagesOut(
        folder_id=folder,
        photos=photos,
        slots=[SlotOut(slot=s, page=pg, description=d, file_id=m.get(s) if m.get(s) in known or not photos else None) for s, pg, d in SLOTS],
        folder_error=error,
    )


@router.get("/site-images", response_model=SiteImagesOut)
def get_site_images(db: DbSession = Depends(get_db)):
    return _out(db)


@router.put("/site-images", response_model=SiteImagesOut)
def put_site_images(body: SiteImagesIn, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    if body.folder_id is not None:
        m = re.search(r"/folders/([A-Za-z0-9_-]+)", body.folder_id)
        fid = m.group(1) if m else body.folder_id.strip()
        if fid and fid != folder_id(db):
            try:
                photos = drive_service.list_photos(fid, refresh=True)
            except drive_service.DriveError as e:
                raise HTTPException(400, str(e))
            if not photos:
                raise HTTPException(400, "The Drive folder has no images")
            _put(db, KEY_MAP, "{}")  # files from the old folder no longer apply
            background.add_task(drive_service.warm_cache, fid, 4, True)
        _put(db, KEY_FOLDER, fid)
    if body.slots is not None:
        current = slot_map(db)
        for slot, fid in body.slots.items():
            if slot not in SLOT_IDS:
                continue
            if fid:
                current[slot] = fid
            else:
                current.pop(slot, None)
        _put(db, KEY_MAP, json.dumps(current))
    db.commit()
    background.add_task(site_cache.invalidate, "site images updated")
    return _out(db)


@router.post("/site-images/sync", response_model=SiteImagesOut)
def sync_site_images(background: BackgroundTasks, db: DbSession = Depends(get_db)):
    folder = folder_id(db)
    if folder:
        background.add_task(drive_service.warm_cache, folder, 4, True)
    return _out(db, refresh=True)
