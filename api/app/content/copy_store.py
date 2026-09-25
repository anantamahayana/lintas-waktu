"""Site text edited in the admin ("Site text"). The defaults live in the web app
(web/messages/{en,id}.json); here we keep only what the admin changed, per locale,
as a partial tree that the site merges over its defaults."""
import json

from sqlalchemy.orm import Session as DbSession

from ..models import Setting

LOCALES = ("en", "id")
MAX_BYTES = 300_000  # the whole site's text is ~30 KB; this only guards against junk


def _key(locale: str) -> str:
    return f"copy.{locale}"


def get(db: DbSession, locale: str) -> dict:
    row = db.get(Setting, _key(locale))
    try:
        data = json.loads(row.value) if row and row.value else {}
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def put(db: DbSession, locale: str, overrides: dict) -> None:
    text = json.dumps(overrides, ensure_ascii=False, separators=(",", ":"))
    if len(text.encode()) > MAX_BYTES:
        raise ValueError("Site text is too large.")
    row = db.get(Setting, _key(locale))
    if row is None:
        db.add(Setting(key=_key(locale), value=text))
    else:
        row.value = text
