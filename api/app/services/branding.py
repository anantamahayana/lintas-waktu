"""Studio branding stored in the settings table + an optional logo file on disk."""
from pathlib import Path

from sqlalchemy.orm import Session as DbSession

from ..config import BACKEND_DIR
from ..models import Setting
from ..schemas import Branding

KEYS = ("studio_name", "tagline", "contact")
UPLOAD_DIR = BACKEND_DIR / "uploads"
LOGO_NAME = "logo"
LOGO_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/svg+xml": ".svg", "image/webp": ".webp"}


def logo_path() -> Path | None:
    for ext in LOGO_TYPES.values():
        p = UPLOAD_DIR / f"{LOGO_NAME}{ext}"
        if p.exists():
            return p
    return None


def get(db: DbSession) -> Branding:
    rows = {r.key: r.value for r in db.query(Setting).filter(Setting.key.in_(KEYS)).all()}
    lp = logo_path()
    return Branding(
        studio_name=rows.get("studio_name") or "",
        tagline=rows.get("tagline") or "",
        contact=rows.get("contact") or "",
        logo_url=f"/api/branding/logo?v={int(lp.stat().st_mtime)}" if lp else None,
    )


def set_values(db: DbSession, values: dict[str, str]) -> None:
    for k in KEYS:
        if k not in values:
            continue
        row = db.get(Setting, k)
        if row is None:
            db.add(Setting(key=k, value=values[k].strip()))
        else:
            row.value = values[k].strip()
    db.commit()


def save_logo(content: bytes, content_type: str) -> None:
    ext = LOGO_TYPES[content_type]
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    remove_logo()
    (UPLOAD_DIR / f"{LOGO_NAME}{ext}").write_bytes(content)


def remove_logo() -> None:
    p = logo_path()
    if p:
        p.unlink(missing_ok=True)
