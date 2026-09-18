"""Site settings persisted in the generic `settings` key/value table."""
from sqlalchemy.orm import Session as DbSession

from ..models import Setting
from .schemas import SiteSettings, SiteSettingsUpdate

PREFIX = "site."


def get(db: DbSession) -> SiteSettings:
    rows = {r.key[len(PREFIX):]: r.value for r in db.query(Setting).filter(Setting.key.like(f"{PREFIX}%")).all()}
    data: dict = {}
    for name, field in SiteSettings.model_fields.items():
        if name in rows and rows[name] is not None:
            raw = rows[name]
            data[name] = int(raw) if field.annotation is int else raw
    return SiteSettings(**data)


def update(db: DbSession, patch: SiteSettingsUpdate) -> SiteSettings:
    for name, value in patch.model_dump(exclude_none=True).items():
        key = PREFIX + name
        row = db.get(Setting, key)
        text = str(value).strip() if not isinstance(value, str) else value.strip()
        if row is None:
            db.add(Setting(key=key, value=text))
        else:
            row.value = text
    db.commit()
    return get(db)
