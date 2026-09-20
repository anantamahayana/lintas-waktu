"""Admin endpoints for website content. All require the admin JWT."""
import json
import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DbSession

from ..auth import require_admin
from ..database import get_db
from ..services import drive_service
from . import film as film_links, settings_store, site_cache
from .models import Inquiry, InquiryStatus, Project
from .schemas import (
    InquiryOut,
    InquiryUpdate,
    ProjectCreate,
    ProjectDetailOut,
    ProjectOut,
    ProjectPhotoOut,
    ProjectUpdate,
    SiteSettings,
    SiteSettingsUpdate,
)

router = APIRouter(prefix="/api/admin", tags=["content-admin"], dependencies=[Depends(require_admin)])


def _folder_id(value: str) -> str:
    m = re.search(r"/folders/([A-Za-z0-9_-]+)", value)
    return m.group(1) if m else value.strip()


def photo_out(folder_id: str, p: drive_service.DrivePhoto) -> ProjectPhotoOut:
    return ProjectPhotoOut(
        file_id=p.file_id,
        filename=p.filename,
        width=p.width,
        height=p.height,
        thumb_url=f"/api/public/img/{folder_id}/{p.file_id}?size=thumb",
        full_url=f"/api/public/img/{folder_id}/{p.file_id}?size=full",
    )


def placeholder_urls(p: Project) -> list[str]:
    return json.loads(p.placeholder_urls or "[]")


def _sized(url: str, width: int) -> str:
    """Unsplash-style URLs accept a width; anything else is returned as-is."""
    if "images.unsplash.com" in url:
        base = url.split("?")[0]
        return f"{base}?w={width}&q=80&auto=format&fit=crop"
    return url


PLACEHOLDER_ID = "ph-"  # file_id prefix for placeholder images: "ph-0", "ph-1", ...


def placeholder_photos(p: Project) -> list[ProjectPhotoOut]:
    return [
        ProjectPhotoOut(file_id=f"{PLACEHOLDER_ID}{i}", filename=f"placeholder-{i + 1}.jpg", width=3, height=2, thumb_url=_sized(u, 800), full_url=_sized(u, 1600))
        for i, u in enumerate(placeholder_urls(p))
    ]


def film_out(p: Project) -> dict | None:
    if not (p.film_title or p.film_url):
        return None
    info = film_links.parse(p.film_url)
    return {"title": p.film_title, "duration": p.film_duration, "url": p.film_url, "embed_url": info["embed_url"] if info else None, "poster_url": p.film_poster_url}


def cover_url(p: Project) -> str | None:
    if p.drive_folder_id:
        return f"/api/public/img/{p.drive_folder_id}/{p.cover_file_id}?size=full" if p.cover_file_id else None
    urls = placeholder_urls(p)
    if not urls:
        return p.film_poster_url  # film-only project: the poster stands in for the cover
    i = int(p.cover_file_id[len(PLACEHOLDER_ID):]) if p.cover_file_id and p.cover_file_id.startswith(PLACEHOLDER_ID) else 0
    return _sized(urls[i] if 0 <= i < len(urls) else urls[0], 1600)


def _photos(p: Project) -> list[drive_service.DrivePhoto]:
    if not p.drive_folder_id:
        return []
    try:
        return drive_service.list_photos(p.drive_folder_id)
    except drive_service.DriveError:
        return []


def photos_out(p: Project, refresh: bool = True) -> list[ProjectPhotoOut]:
    """Every photograph of a project as the site sees it: Drive files, or the placeholders."""
    if not p.drive_folder_id:
        return placeholder_photos(p)
    photos = _photos(p) if refresh else (drive_service._list_cache.get(p.drive_folder_id) or [])
    return [photo_out(p.drive_folder_id, ph) for ph in photos]


def project_out(p: Project, with_photos: bool = False) -> dict:
    photos = photos_out(p, refresh=with_photos)
    data = {
        **{c.name: getattr(p, c.name) for c in Project.__table__.columns if c.name not in ("facts", "placeholder_urls")},
        "facts": json.loads(p.facts or "[]"),
        "placeholder_urls": placeholder_urls(p),
        "cover_url": cover_url(p),
        "film": film_out(p),
        "photo_count": len(photos),
    }
    if with_photos:
        data["photos"] = photos
    return data


def _get(db: DbSession, project_id: str) -> Project:
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


def _apply(p: Project, data: dict) -> None:
    for k, v in data.items():
        if k == "facts":
            v = json.dumps([f if isinstance(f, dict) else f.model_dump() for f in v])
        if k == "drive_folder_id":
            v = _folder_id(v or "")
        if k == "placeholder_urls":
            v = json.dumps(list(v))
        if k == "kind" and hasattr(v, "value"):
            v = v.value
        setattr(p, k, v)


def _check_film(p: Project, old_url: str | None) -> None:
    """Film kinds need a playable link; refresh the poster when the link changed."""
    if p.kind in ("film", "both"):
        if not p.film_url:
            raise HTTPException(400, "A film project needs the YouTube or Vimeo link")
        if not film_links.parse(p.film_url):
            raise HTTPException(400, "Paste a YouTube or Vimeo link — other players can't be embedded")
    if p.film_url != old_url or (p.film_url and not p.film_poster_url):
        p.film_poster_url = film_links.poster(p.film_url)


# ---------------------------------------------------------------- projects
@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: DbSession = Depends(get_db)):
    rows = db.query(Project).order_by(Project.sort_order.asc(), Project.month.desc().nullslast(), Project.created_at.desc()).all()
    return [project_out(p) for p in rows]


@router.post("/projects", response_model=ProjectDetailOut, status_code=201)
def create_project(body: ProjectCreate, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    if db.query(Project).filter(Project.slug == body.slug).first():
        raise HTTPException(409, "Slug already in use")
    p = Project()
    _apply(p, body.model_dump())
    _check_film(p, None)
    if p.drive_folder_id:
        # validate the folder and pick a default cover
        try:
            photos = drive_service.list_photos(p.drive_folder_id, refresh=True)
        except drive_service.DriveError as e:
            raise HTTPException(400, str(e))
        if not photos:
            raise HTTPException(400, "The Drive folder has no images")
        if not p.cover_file_id:
            p.cover_file_id = photos[0].file_id
    elif not placeholder_urls(p) and p.kind != "film":
        raise HTTPException(400, "A project needs a Google Drive folder (or placeholder image URLs)")
    db.add(p)
    db.commit()
    db.refresh(p)
    if p.drive_folder_id:
        background.add_task(drive_service.warm_cache, p.drive_folder_id)
    background.add_task(site_cache.invalidate, f"project created: {p.slug}")
    return project_out(p, with_photos=True)


@router.get("/projects/{project_id}", response_model=ProjectDetailOut)
def get_project(project_id: str, db: DbSession = Depends(get_db)):
    return project_out(_get(db, project_id), with_photos=True)


@router.patch("/projects/{project_id}", response_model=ProjectDetailOut)
def update_project(project_id: str, body: ProjectUpdate, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    p = _get(db, project_id)
    data = body.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"] != p.slug and db.query(Project).filter(Project.slug == data["slug"]).first():
        raise HTTPException(409, "Slug already in use")
    folder_changed = "drive_folder_id" in data and _folder_id(data["drive_folder_id"] or "") != p.drive_folder_id
    old_film = p.film_url
    _apply(p, data)
    _check_film(p, old_film)
    if not p.drive_folder_id and not placeholder_urls(p) and p.kind != "film":
        raise HTTPException(400, "A project needs a Google Drive folder (or placeholder image URLs)")
    if folder_changed and not p.drive_folder_id:
        p.cover_file_id = None  # back to placeholders
    elif folder_changed:
        try:
            photos = drive_service.list_photos(p.drive_folder_id, refresh=True)
        except drive_service.DriveError as e:
            raise HTTPException(400, str(e))
        if p.cover_file_id not in {ph.file_id for ph in photos}:
            p.cover_file_id = photos[0].file_id if photos else None
        background.add_task(drive_service.warm_cache, p.drive_folder_id)
    db.commit()
    db.refresh(p)
    background.add_task(site_cache.invalidate, f"project updated: {p.slug}")
    return project_out(p, with_photos=True)


@router.post("/projects/{project_id}/sync", response_model=ProjectDetailOut)
def sync_project(project_id: str, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    p = _get(db, project_id)
    if p.film_url and not p.film_poster_url:  # e.g. Vimeo was unreachable when the project was saved
        p.film_poster_url = film_links.poster(p.film_url)
        db.commit()
    if not p.drive_folder_id:
        return project_out(p, with_photos=True)
    try:
        drive_service.list_photos(p.drive_folder_id, refresh=True)
    except drive_service.DriveError as e:
        raise HTTPException(400, str(e))
    background.add_task(drive_service.warm_cache, p.drive_folder_id)
    background.add_task(site_cache.invalidate, f"project synced: {p.slug}")
    return project_out(p, with_photos=True)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    p = _get(db, project_id)
    db.delete(p)
    db.commit()
    background.add_task(site_cache.invalidate, f"project deleted: {p.slug}")


@router.post("/projects/reorder", status_code=204)
def reorder_projects(ids: list[str], background: BackgroundTasks, db: DbSession = Depends(get_db)):
    """Body: ordered list of project ids → sort_order 0..n."""
    for i, pid in enumerate(ids):
        p = db.get(Project, pid)
        if p:
            p.sort_order = i
    db.commit()
    background.add_task(site_cache.invalidate, "projects reordered")


# ---------------------------------------------------------------- inquiries
@router.get("/inquiries", response_model=list[InquiryOut])
def list_inquiries(status: InquiryStatus | None = Query(None), db: DbSession = Depends(get_db)):
    q = db.query(Inquiry)
    if status:
        q = q.filter(Inquiry.status == status)
    return q.order_by(Inquiry.created_at.desc()).all()


@router.get("/inquiries/{inquiry_id}", response_model=InquiryOut)
def get_inquiry(inquiry_id: str, db: DbSession = Depends(get_db)):
    i = db.get(Inquiry, inquiry_id)
    if not i:
        raise HTTPException(404, "Inquiry not found")
    return i


@router.patch("/inquiries/{inquiry_id}", response_model=InquiryOut)
def update_inquiry(inquiry_id: str, body: InquiryUpdate, db: DbSession = Depends(get_db)):
    i = db.get(Inquiry, inquiry_id)
    if not i:
        raise HTTPException(404, "Inquiry not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(i, k, v)
    db.commit()
    db.refresh(i)
    return i


@router.delete("/inquiries/{inquiry_id}", status_code=204)
def delete_inquiry(inquiry_id: str, db: DbSession = Depends(get_db)):
    i = db.get(Inquiry, inquiry_id)
    if not i:
        raise HTTPException(404, "Inquiry not found")
    db.delete(i)
    db.commit()


# ---------------------------------------------------------------- site settings
@router.get("/site-settings", response_model=SiteSettings)
def get_site_settings(db: DbSession = Depends(get_db)):
    return settings_store.get(db)


@router.put("/site-settings", response_model=SiteSettings)
def put_site_settings(body: SiteSettingsUpdate, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    out = settings_store.update(db, body)
    background.add_task(site_cache.invalidate, "site settings updated")
    return out
