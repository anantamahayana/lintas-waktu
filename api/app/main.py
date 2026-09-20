import logging
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import SessionLocal, migrate
from .models import PhotoSession, SessionStatus, utcnow
from .routers import admin, gallery
from .content import router_admin as content_admin, router_public as content_public
from .content import models as content_models  # noqa: F401  (registers tables)
from .services import backup, drive_service

settings = get_settings()
log = logging.getLogger("uvicorn.error")


def cleanup_cache() -> None:
    """Keep image cache only for folders of sessions that are pending or recently completed."""
    cutoff = utcnow() - timedelta(days=settings.cache_retention_days)
    with SessionLocal() as db:
        keep = {
            s.drive_folder_id
            for s in db.query(PhotoSession).all()
            if s.status == SessionStatus.pending or (s.submitted_at and s.submitted_at.replace(tzinfo=cutoff.tzinfo) > cutoff)
        }
    removed = drive_service.purge_except(keep)
    if removed:
        log.info("cache cleanup: removed %d folder cache(s)", removed)


def warn_insecure_defaults() -> None:
    if settings.admin_password in {"admin123", "changeme123"}:
        log.warning("!! ADMIN_PASSWORD masih default. Ganti di backend/.env sebelum dibuka ke internet.")
    if settings.secret_key.startswith(("dev-secret", "your-super-secret")):
        log.warning("!! SECRET_KEY masih default. (Catatan: menggantinya membuat PIN sesi lama tidak berlaku.)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    backup.backup_db()
    warn_insecure_defaults()
    migrate()
    cleanup_cache()
    yield


app = FastAPI(
    title="Lintas Waktu API",
    description="Website content (projects, inquiries, settings) + client proofing (sessions, gallery, XMP export).",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(gallery.router)
app.include_router(content_admin.router)
app.include_router(content_public.router)


@app.get("/api/health")
def health():
    """Server health: database, Google Drive mode, last backup, active sessions."""
    info: dict = {"status": "ok", "drive_mode": drive_service.mode()}
    try:
        with SessionLocal() as db:
            info["sessions_pending"] = db.query(PhotoSession).filter(PhotoSession.status == SessionStatus.pending).count()
            info["sessions_total"] = db.query(PhotoSession).count()
        info["database"] = "ok"
    except Exception as e:  # an unreadable database is serious — still report it
        info["database"] = f"error: {e}"
        info["status"] = "degraded"
    if settings.database_url.startswith("sqlite:///"):
        backups = sorted((Path(settings.database_url.removeprefix("sqlite:///")).parent / "backups").glob("*.db"))
        info["last_backup"] = backups[-1].name if backups else None
        if not backups:
            info["status"] = "degraded"  # the daily backup has never run
    return info
