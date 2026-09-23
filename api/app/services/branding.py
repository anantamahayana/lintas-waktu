"""Studio branding stored in the settings table + an optional logo file on disk."""
import hashlib
import hmac
import re
import secrets
from pathlib import Path

from sqlalchemy.orm import Session as DbSession

from ..config import BACKEND_DIR, get_settings
from ..models import Setting
from ..schemas import Branding

KEYS = ("studio_name", "tagline", "contact")
UPLOAD_DIR = Path(get_settings().upload_dir)
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


# ---------------------------------------------------------------- WhatsApp numbers
def normalize_wa(value: str | None) -> str:
    """Digits only, starting with the country code, as wa.me expects.

    "0812-3456-7890" and "+62 812 3456 7890" both become "6281234567890".
    Numbers that are too short/long become "" so a chat button never points at nonsense.
    """
    digits = re.sub(r"\D", "", value or "")
    if not digits:
        return ""
    if digits.startswith("0"):
        digits = "62" + digits.lstrip("0")
    elif digits.startswith("620"):
        digits = "62" + digits[3:]
    elif len(digits) <= 12 and digits.startswith("8"):
        digits = "62" + digits  # written without 0 or country code
    return digits if 8 <= len(digits) <= 15 else ""


# ---------------------------------------------------------------- admin password set from the panel (overrides .env)
def _hash_pw(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()


def check_admin_password(db: DbSession, password: str) -> bool | None:
    """True/False when a password was set from the admin panel; None when .env should be used."""
    row = db.get(Setting, "admin_password")
    if not row or not row.value:
        return None
    salt, digest = row.value.split("$", 1)
    return hmac.compare_digest(_hash_pw(password, salt), digest)


def set_admin_password(db: DbSession, password: str) -> None:
    salt = secrets.token_hex(8)
    row = db.get(Setting, "admin_password")
    value = f"{salt}${_hash_pw(password, salt)}"
    if row is None:
        db.add(Setting(key="admin_password", value=value))
    else:
        row.value = value
    db.commit()
