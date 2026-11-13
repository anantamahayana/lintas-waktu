"""Client activity for the admin bell: galleries opened and submitted, proofs opened / noted / approved,
invoices and receipts opened, new inquiries. Recorded quietly — a failure here never blocks the client."""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import Session as DbSession

from ..auth import require_admin
from ..database import Base, get_db
from ..models import utcnow

log = logging.getLogger("uvicorn.error")


class Activity(Base):
    __tablename__ = "activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    kind: Mapped[str] = mapped_column(String(24))  # gallery_open | gallery_submit | proof_open | proof_note | proof_approve | invoice_open | receipt_open | inquiry
    title: Mapped[str] = mapped_column(String(240))
    link: Mapped[str | None] = mapped_column(String(240), nullable=True)  # admin path
    key: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)  # what it is about, for throttling
    read: Mapped[bool] = mapped_column(Boolean, default=False)


def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def record(db: DbSession, kind: str, title: str, link: str | None = None, key: str | None = None, every_hours: float = 0) -> None:
    """Add an entry (caller commits). With `every_hours`, the same kind+key is noted at most that often."""
    try:
        if every_hours and key:
            last = db.query(Activity).filter(Activity.kind == kind, Activity.key == key).order_by(Activity.at.desc()).first()
            if last and utcnow() - _aware(last.at) < timedelta(hours=every_hours):
                return
        db.add(Activity(kind=kind, title=title[:240], link=link, key=key))
    except Exception:  # pragma: no cover
        log.exception("activity not recorded")


class ActivityOut(BaseModel):
    id: int
    at: datetime
    kind: str
    title: str
    link: str | None
    read: bool


class ActivityList(BaseModel):
    unread: int
    items: list[ActivityOut]


router = APIRouter(prefix="/api/admin", tags=["activity"], dependencies=[Depends(require_admin)])


@router.get("/activity", response_model=ActivityList)
def list_activity(limit: int = Query(60, ge=1, le=300), db: DbSession = Depends(get_db)):
    rows = db.query(Activity).order_by(Activity.at.desc(), Activity.id.desc()).limit(limit).all()
    unread = db.query(Activity).filter(Activity.read.is_(False)).count()
    return ActivityList(unread=unread, items=[ActivityOut(id=r.id, at=r.at, kind=r.kind, title=r.title, link=r.link, read=r.read) for r in rows])


@router.post("/activity/read", status_code=204)
def mark_read(db: DbSession = Depends(get_db)):
    db.query(Activity).filter(Activity.read.is_(False)).update({Activity.read: True})
    db.commit()
