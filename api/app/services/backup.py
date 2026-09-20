# [ID] Salinan cadangan database: harian saat server nyala, dan sekali setiap klien mengirim pilihan.
import logging
import shutil
from datetime import date, datetime
from pathlib import Path

from ..config import get_settings

log = logging.getLogger("uvicorn.error")


def _db_path() -> Path | None:
    url = get_settings().database_url
    if not url.startswith("sqlite:///"):
        return None  # database selain SQLite di-backup lewat cara servernya sendiri
    db = Path(url.removeprefix("sqlite:///"))
    return db if db.exists() else None


def backup_db(keep: int = 14) -> None:
    """Salinan harian ke backend/backups/ (menyimpan `keep` hari terakhir)."""
    db = _db_path()
    if not db:
        return
    folder = db.parent / "backups"
    folder.mkdir(exist_ok=True)
    target = folder / f"{db.stem}-{date.today():%Y-%m-%d}.db"
    if not target.exists():
        shutil.copy2(db, target)
        log.info("database backup: %s", target.name)
    for old in sorted(folder.glob(f"{db.stem}-????-??-??.db"))[:-keep]:
        old.unlink(missing_ok=True)


def backup_after_submit(client_name: str, keep: int = 30) -> None:
    """Salinan tambahan tiap kali klien selesai memilih, supaya hasil hari itu tidak menunggu backup besok.

    Disimpan di backend/backups/kiriman/ dengan nama bertanggal-jam, terpisah dari backup harian.
    """
    db = _db_path()
    if not db:
        return
    folder = db.parent / "backups" / "kiriman"
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    target = folder / f"{db.stem}-{stamp}.db"
    try:
        shutil.copy2(db, target)
        log.info("backup setelah kiriman %s: %s", client_name, target.name)
    except OSError as e:  # jangan sampai backup gagal membatalkan kiriman klien
        log.warning("backup setelah kiriman gagal: %s", e)
        return
    for old in sorted(folder.glob(f"{db.stem}-*.db"))[:-keep]:
        old.unlink(missing_ok=True)
