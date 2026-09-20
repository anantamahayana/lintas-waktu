# [ID] Pembatas percobaan salah (PIN galeri & login admin) yang disimpan di database,
# supaya hitungannya tidak kembali nol setiap server dinyalakan ulang.
from datetime import timedelta

from sqlalchemy.orm import Session as DbSession

from ..models import FailedAttempt, utcnow


def count(db: DbSession, key: str, window_s: int) -> int:
    """Berapa kali kunci ini salah dalam jendela waktu terakhir (sekalian membuang yang kedaluwarsa)."""
    cutoff = utcnow() - timedelta(seconds=window_s)
    db.query(FailedAttempt).filter(FailedAttempt.at < cutoff).delete(synchronize_session=False)
    return db.query(FailedAttempt).filter(FailedAttempt.key == key, FailedAttempt.at >= cutoff).count()


def record(db: DbSession, *keys: str) -> None:
    for k in keys:
        db.add(FailedAttempt(key=k))
    db.commit()


def clear(db: DbSession, *keys: str) -> None:
    for k in keys:
        db.query(FailedAttempt).filter(FailedAttempt.key == k).delete(synchronize_session=False)
    db.commit()


def clear_prefix(db: DbSession, prefix: str) -> None:
    """Hapus semua kunci yang diawali teks ini (mis. semua percobaan PIN satu galeri)."""
    db.query(FailedAttempt).filter(FailedAttempt.key.like(f"{prefix}%")).delete(synchronize_session=False)
    db.commit()
