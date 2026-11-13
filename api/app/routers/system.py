"""Server status for the admin dashboard: backups (on the server and off it), disk, database."""
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from ..auth import require_admin
from ..config import get_settings
from ..database import SessionLocal

router = APIRouter(prefix="/api/admin", tags=["system"], dependencies=[Depends(require_admin)])


class SystemStatus(BaseModel):
    database: str
    last_backup: str | None  # file name of the newest daily copy on the server
    backup_age_days: float | None
    offsite_at: datetime | None  # last time the encrypted copy reached GitHub (marker written by the backup workflow)
    offsite_age_days: float | None
    disk_free_mb: int | None
    disk_total_mb: int | None
    warnings: list[str]


def _age(ts: float) -> float:
    return round((datetime.now(timezone.utc).timestamp() - ts) / 86400, 2)


@router.get("/system", response_model=SystemStatus)
def system_status():
    s = get_settings()
    warnings: list[str] = []
    database = "ok"
    try:
        with SessionLocal() as db:
            db.execute(text("select 1"))
    except Exception as e:  # pragma: no cover - reported, not raised
        database = f"error: {e}"
        warnings.append("Database cannot be read")
    last = age = off_at = off_age = None
    if s.database_url.startswith("sqlite:///"):
        folder = Path(s.database_url.removeprefix("sqlite:///")).parent / "backups"
        copies = sorted(folder.glob("*-????-??-??.db"))
        if copies:
            last, age = copies[-1].name, _age(copies[-1].stat().st_mtime)
        mark = folder / ".offsite"
        if mark.exists():
            off_at = datetime.fromtimestamp(mark.stat().st_mtime, timezone.utc)
            off_age = _age(mark.stat().st_mtime)
    if age is None or age > 2:
        warnings.append("No backup on the server in the last 2 days")
    if off_age is None or off_age > 2:
        warnings.append("No off-server backup (GitHub) in the last 2 days")
    free = total = None
    probe = Path(s.cache_dir)
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    try:
        u = shutil.disk_usage(probe)
        free, total = int(u.free / 1e6), int(u.total / 1e6)
        if u.free / u.total < 0.1 or u.free < 2e9:
            warnings.append("Disk almost full")
    except OSError:
        pass
    return SystemStatus(database=database, last_backup=last, backup_age_days=age, offsite_at=off_at, offsite_age_days=off_age,
                        disk_free_mb=free, disk_total_mb=total, warnings=warnings)
