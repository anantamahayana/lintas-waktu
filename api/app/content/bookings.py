"""Calendar & booking — which days are spoken for.

A booking is a date range (whole days) with a status:
  tentative  a quotation is out / the client is deciding — the day is pencilled in
  booked     confirmed (usually when the booking fee arrives)
  blocked    personal: travel, holiday, editing week — never shown as a client job
  done       the day happened
  cancelled  kept for the record, frees the dates
Public availability exposes only the *dates* that are taken (booked / blocked / done),
never who or what — the site uses it to show a small availability calendar.
"""
import enum
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import Boolean, Date, DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import Session as DbSession

from ..auth import require_admin
from ..database import Base, get_db
from ..models import utcnow
from . import site_cache


class BookingStatus(str, enum.Enum):
    tentative = "tentative"
    booked = "booked"
    blocked = "blocked"
    done = "done"
    cancelled = "cancelled"


TAKEN = (BookingStatus.booked, BookingStatus.blocked, BookingStatus.done)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(16), default="wedding")  # wedding | prewedding | event | personal | block
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.tentative)
    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date, index=True)  # inclusive
    start_time: Mapped[str | None] = mapped_column(String(5), nullable=True)  # "14:00", informational
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    client_wa: Mapped[str | None] = mapped_column(String(25), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    invoice_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # Show this day as taken on the website (default yes for booked/done; blocked days always count)
    public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ---------------------------------------------------------------- schemas
class BookingIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    kind: str = Field("wedding", pattern=r"^(wedding|prewedding|event|personal|block)$")
    status: BookingStatus = BookingStatus.tentative
    start_date: date
    end_date: date | None = None
    start_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    location: str | None = Field(None, max_length=160)
    client_name: str | None = Field(None, max_length=160)
    client_wa: str | None = Field(None, max_length=25)
    notes: str | None = None
    invoice_id: str | None = None
    session_id: str | None = None
    public: bool = True

    @model_validator(mode="after")
    def _range(self):
        if self.end_date is None:
            self.end_date = self.start_date
        if self.end_date < self.start_date:
            raise ValueError("End date is before the start date")
        if (self.end_date - self.start_date).days > 60:
            raise ValueError("A booking can span at most 60 days")
        return self


class BookingUpdate(BookingIn):
    title: str | None = Field(None, min_length=1, max_length=160)  # type: ignore[assignment]
    kind: str | None = Field(None, pattern=r"^(wedding|prewedding|event|personal|block)$")  # type: ignore[assignment]
    status: BookingStatus | None = None  # type: ignore[assignment]
    start_date: date | None = None  # type: ignore[assignment]
    public: bool | None = None  # type: ignore[assignment]

    @model_validator(mode="after")
    def _range(self):  # ranges are checked against the stored row in the route
        return self


class BookingOut(BaseModel):
    id: str
    title: str
    kind: str
    status: BookingStatus
    start_date: date
    end_date: date
    start_time: str | None
    location: str | None
    client_name: str | None
    client_wa: str | None
    notes: str | None
    invoice_id: str | None
    invoice_number: str | None = None
    session_id: str | None
    public: bool
    created_at: datetime
    updated_at: datetime
    conflicts: list[str] = []  # titles of other bookings/blocks sharing a day


class Availability(BaseModel):
    from_date: date
    to_date: date
    taken: list[date]  # days not available for new work


# ---------------------------------------------------------------- helpers
def _overlaps(db: DbSession, b: Booking, start: date, end: date) -> list[Booking]:
    q = db.query(Booking).filter(Booking.start_date <= end, Booking.end_date >= start, Booking.status != BookingStatus.cancelled)
    return [x for x in q.all() if x.id != b.id]


def out(db: DbSession, b: Booking, with_conflicts: bool = True) -> BookingOut:
    from .invoices import Invoice

    inv = db.get(Invoice, b.invoice_id) if b.invoice_id else None
    conflicts = [x.title for x in _overlaps(db, b, b.start_date, b.end_date) if x.status in TAKEN or x.status == BookingStatus.tentative] if with_conflicts and b.status != BookingStatus.cancelled else []
    return BookingOut(**{c.name: getattr(b, c.name) for c in Booking.__table__.columns}, invoice_number=inv.number if inv else None, conflicts=conflicts)


def _apply(b: Booking, data: dict) -> None:
    from ..services.branding import normalize_wa

    for k, v in data.items():
        if k == "client_wa":
            v = normalize_wa(v) or None
        if k == "status" and hasattr(v, "value"):
            v = v  # Enum column accepts the enum
        setattr(b, k, v)


def sync_from_invoice(db: DbSession, invoice_id: str, invoice_status: str, deposit: int) -> None:
    """Keep a linked booking in step with money: booking fee in → booked; void → cancelled."""
    for b in db.query(Booking).filter(Booking.invoice_id == invoice_id).all():
        if invoice_status == "void" and b.status in (BookingStatus.tentative, BookingStatus.booked):
            b.status = BookingStatus.cancelled
        elif invoice_status == "paid" or (invoice_status == "sent" and deposit > 0):
            if b.status == BookingStatus.tentative:
                b.status = BookingStatus.booked


# ---------------------------------------------------------------- admin routes
router = APIRouter(prefix="/api/admin", tags=["bookings"], dependencies=[Depends(require_admin)])


@router.get("/bookings", response_model=list[BookingOut])
def list_bookings(from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"), db: DbSession = Depends(get_db)):
    q = db.query(Booking)
    if from_date:
        q = q.filter(Booking.end_date >= from_date)
    if to_date:
        q = q.filter(Booking.start_date <= to_date)
    return [out(db, b) for b in q.order_by(Booking.start_date.asc()).all()]


@router.post("/bookings", response_model=BookingOut, status_code=201)
def create_booking(body: BookingIn, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    b = Booking()
    _apply(b, body.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    background.add_task(site_cache.invalidate, "booking created")
    return out(db, b)


@router.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: str, db: DbSession = Depends(get_db)):
    b = db.get(Booking, booking_id)
    if not b:
        raise HTTPException(404, "Booking not found")
    return out(db, b)


@router.patch("/bookings/{booking_id}", response_model=BookingOut)
def update_booking(booking_id: str, body: BookingUpdate, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    b = db.get(Booking, booking_id)
    if not b:
        raise HTTPException(404, "Booking not found")
    data = body.model_dump(exclude_unset=True)
    start = data.get("start_date", b.start_date)
    end = data.get("end_date", b.end_date if "start_date" not in data else start)
    if end is None:
        end = start
    if end < start:
        raise HTTPException(400, "End date is before the start date")
    data["start_date"], data["end_date"] = start, end
    _apply(b, data)
    db.commit()
    db.refresh(b)
    background.add_task(site_cache.invalidate, "booking updated")
    return out(db, b)


@router.delete("/bookings/{booking_id}", status_code=204)
def delete_booking(booking_id: str, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    b = db.get(Booking, booking_id)
    if not b:
        raise HTTPException(404, "Booking not found")
    db.delete(b)
    db.commit()
    background.add_task(site_cache.invalidate, "booking deleted")


# ---------------------------------------------------------------- public: which days are taken
public = APIRouter(prefix="/api/public", tags=["bookings"])


@public.get("/availability", response_model=Availability)
def availability(months: int = Query(4, ge=1, le=12), db: DbSession = Depends(get_db)):
    """Dates already taken from today for the next `months`. Just dates — no names, no kinds."""
    start = date.today()
    end = (start.replace(day=1) + timedelta(days=32 * months)).replace(day=1) - timedelta(days=1)
    rows = db.query(Booking).filter(Booking.end_date >= start, Booking.start_date <= end, Booking.status.in_(TAKEN), Booking.public.is_(True)).all()
    taken: set[date] = set()
    for b in rows:
        d = max(b.start_date, start)
        while d <= min(b.end_date, end):
            taken.add(d)
            d += timedelta(days=1)
    return Availability(from_date=start, to_date=end, taken=sorted(taken))
