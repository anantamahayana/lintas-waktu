"""Public endpoints consumed by the Next.js site. No auth; read-only except inquiries."""
import json
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session as DbSession

from ..database import get_db
from ..services import drive_service
from . import settings_store
from .models import Inquiry, Project, ProjectCategory
from .router_admin import cover_url, photos_out
from .schemas import Film, InquiryCreate, PublicProjectOut, SiteSettings

router = APIRouter(prefix="/api/public", tags=["public"])

# simple per-IP throttle for the contact form: 5 per 10 minutes
_inquiry_hits: dict[str, list[float]] = defaultdict(list)


def _public(p: Project, locale: str, with_photos: bool) -> PublicProjectOut:
    lang = "id" if locale == "id" else "en"
    photos = photos_out(p) if with_photos else []
    film = Film(title=p.film_title, duration=p.film_duration, url=p.film_url) if (p.film_title or p.film_url) else None
    return PublicProjectOut(
        slug=p.slug,
        title=p.title,
        category=p.category,
        location=p.location,
        date_label=p.date_label,
        month=p.month,
        cover_url=cover_url(p),
        pull=getattr(p, f"pull_{lang}") or p.pull_en,
        body=getattr(p, f"body_{lang}") or p.body_en,
        facts=json.loads(p.facts or "[]"),
        film=film,
        featured=p.featured,
        photos=photos,
    )


@router.get("/projects", response_model=list[PublicProjectOut])
def list_projects(
    locale: str = Query("en"),
    category: ProjectCategory | None = Query(None),
    featured: bool | None = Query(None),
    db: DbSession = Depends(get_db),
):
    q = db.query(Project).filter(Project.published.is_(True))
    if category:
        q = q.filter(Project.category == category)
    if featured is not None:
        q = q.filter(Project.featured.is_(featured))
    rows = q.order_by(Project.sort_order.asc(), Project.month.desc().nullslast(), Project.created_at.desc()).all()
    return [_public(p, locale, with_photos=False) for p in rows]


@router.get("/projects/{slug}", response_model=PublicProjectOut)
def get_project(slug: str, locale: str = Query("en"), db: DbSession = Depends(get_db)):
    p = db.query(Project).filter(Project.slug == slug, Project.published.is_(True)).first()
    if not p:
        raise HTTPException(404, "Project not found")
    return _public(p, locale, with_photos=True)


@router.get("/img/{folder_id}/{file_id}")
async def get_image(folder_id: str, file_id: str, size: str = "thumb", db: DbSession = Depends(get_db)):
    """Image proxy for portfolio photographs. Only folders that belong to a
    published project are served, so this cannot be used to read arbitrary Drive folders."""
    allowed = db.query(Project.id).filter(Project.drive_folder_id == folder_id, Project.published.is_(True)).first()
    if not allowed:
        raise HTTPException(404, "Not found")
    size = "full" if size == "full" else "thumb"
    try:
        data, media_type = await run_in_threadpool(drive_service.get_image, folder_id, file_id, size)
    except drive_service.DriveError as e:
        raise HTTPException(404, str(e))
    return Response(data, media_type=media_type, headers={"Cache-Control": "public, max-age=2592000, immutable"})


@router.get("/settings", response_model=SiteSettings)
def get_settings(db: DbSession = Depends(get_db)):
    return settings_store.get(db)


@router.post("/inquiries", status_code=201)
def create_inquiry(body: InquiryCreate, request: Request, db: DbSession = Depends(get_db)):
    if body.website:  # honeypot filled → pretend success
        return {"ok": True}
    ip = request.client.host if request.client else "?"
    now = time.time()
    hits = [t for t in _inquiry_hits[ip] if now - t < 600]
    if len(hits) >= 5:
        raise HTTPException(429, "Too many messages — please try again later")
    _inquiry_hits[ip] = hits + [now]

    i = Inquiry(**body.model_dump(exclude={"website"}))
    db.add(i)
    db.commit()
    return {"ok": True, "id": i.id}
