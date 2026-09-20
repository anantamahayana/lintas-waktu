"""Invoices — the small POS behind the studio: quote or bill a client, mark it paid,
share a read-only link they can print. Numbers run LW-2026-0001 per year.

Money is stored as integers in the invoice's currency (IDR whole rupiah, USD cents
would be overkill for photography packages — USD amounts are whole dollars too).
"""
import base64
import enum
import hashlib
import hmac
import json
import secrets
import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import Date, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import Session as DbSession

from ..auth import require_admin
from ..config import get_settings
from ..database import Base, get_db
from ..models import PhotoSession, Setting, utcnow


# ---------------------------------------------------------------- model
class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    void = "void"


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    number: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    token: Mapped[str] = mapped_column(String(32), unique=True, index=True, default=lambda: secrets.token_urlsafe(18))
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus), default=InvoiceStatus.draft)
    kind: Mapped[str] = mapped_column(String(10), default="invoice")  # invoice | quote
    client_name: Mapped[str] = mapped_column(String(160))
    client_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    client_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_label: Mapped[str | None] = mapped_column(String(200), nullable=True)  # "Wedding · Uluwatu · 14 June 2026"
    issued_at: Mapped[date] = mapped_column(Date, default=date.today)
    due_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="IDR")
    items: Mapped[str] = mapped_column(Text, default="[]")  # JSON [{description, qty, unit_price}]
    discount: Mapped[int] = mapped_column(Integer, default=0)  # amount
    tax_percent: Mapped[int] = mapped_column(Integer, default=0)
    deposit_paid: Mapped[int] = mapped_column(Integer, default=0)  # amount already received
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)  # shown on the document
    session_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # linked proofing session
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Fingerprint of the document as it was when marked sent — proves what the client received.
    sent_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class InvoiceEvent(Base):
    """Audit trail: every creation, edit and status change, with what changed."""

    __tablename__ = "invoice_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    invoice_id: Mapped[str] = mapped_column(String(36), index=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    action: Mapped[str] = mapped_column(String(24))  # created | updated | sent | paid | void | draft | duplicated
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON: changed fields, hash, …


# ---------------------------------------------------------------- schemas
class Item(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    qty: int = Field(1, ge=1, le=10000)
    unit_price: int = Field(0, ge=0)


class InvoiceIn(BaseModel):
    kind: str = Field("invoice", pattern=r"^(invoice|quote)$")
    client_name: str = Field(min_length=1, max_length=160)
    client_email: str | None = Field(None, max_length=255)
    client_phone: str | None = Field(None, max_length=40)
    client_address: str | None = None
    event_label: str | None = Field(None, max_length=200)
    issued_at: date | None = None
    due_at: date | None = None
    currency: str = Field("IDR", pattern=r"^(IDR|USD)$")
    items: list[Item] = []
    discount: int = Field(0, ge=0)
    tax_percent: int = Field(0, ge=0, le=100)
    deposit_paid: int = Field(0, ge=0)
    notes: str | None = None
    session_id: str | None = None


class InvoiceUpdate(InvoiceIn):
    client_name: str | None = Field(None, min_length=1, max_length=160)  # type: ignore[assignment]
    kind: str | None = Field(None, pattern=r"^(invoice|quote)$")  # type: ignore[assignment]
    currency: str | None = Field(None, pattern=r"^(IDR|USD)$")  # type: ignore[assignment]
    items: list[Item] | None = None  # type: ignore[assignment]
    discount: int | None = Field(None, ge=0)  # type: ignore[assignment]
    tax_percent: int | None = Field(None, ge=0, le=100)  # type: ignore[assignment]
    deposit_paid: int | None = Field(None, ge=0)  # type: ignore[assignment]


class Totals(BaseModel):
    subtotal: int
    discount: int
    taxable: int
    tax: int
    total: int
    deposit_paid: int
    balance: int


class InvoiceOut(BaseModel):
    id: str
    number: str
    token: str
    status: InvoiceStatus
    kind: str
    client_name: str
    client_email: str | None
    client_phone: str | None
    client_address: str | None
    event_label: str | None
    issued_at: date
    due_at: date | None
    currency: str
    items: list[Item]
    discount: int
    tax_percent: int
    deposit_paid: int
    notes: str | None
    session_id: str | None
    session_client: str | None = None
    paid_at: datetime | None
    sent_at: datetime | None
    created_at: datetime
    updated_at: datetime
    totals: Totals
    public_url: str
    verify_code: str
    verify_url: str
    sent_hash: str | None
    current_hash: str


class EventOut(BaseModel):
    at: datetime
    action: str
    detail: dict


class Business(BaseModel):
    """Who is invoicing — printed on every document. Admin-only (bank details)."""

    name: str = "Lintas Waktu"
    tagline: str = "Photography & Film · Bali"
    address: str = ""
    email: str = ""
    phone: str = ""
    bank_details: str = ""  # free text: bank, account name, number
    prefix: str = "LW"
    default_terms: str = "50% booking fee secures the date. Balance due 7 days before the event. Prices include delivery through the private gallery."
    default_due_days: int = 7
    tax_percent: int = 0


class BusinessUpdate(BaseModel):
    name: str | None = None
    tagline: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None
    bank_details: str | None = None
    prefix: str | None = Field(None, max_length=8, pattern=r"^[A-Za-z0-9-]*$")
    default_terms: str | None = None
    default_due_days: int | None = Field(None, ge=0, le=365)
    tax_percent: int | None = Field(None, ge=0, le=100)


class PublicInvoice(BaseModel):
    """What the client sees at /i/<token>: the document, and the business minus internals."""

    number: str
    status: InvoiceStatus
    kind: str
    client_name: str
    client_email: str | None
    client_phone: str | None
    client_address: str | None
    event_label: str | None
    issued_at: date
    due_at: date | None
    currency: str
    items: list[Item]
    discount: int
    tax_percent: int
    deposit_paid: int
    notes: str | None
    paid_at: datetime | None
    totals: Totals
    business: dict
    verify_code: str
    verify_url: str


class Verification(BaseModel):
    """Answer for anyone checking a document: is this number + code one we issued, as it stands now?"""

    valid: bool
    reason: str  # "match" | "outdated" | "no_match" | "unknown"
    number: str
    status: InvoiceStatus | None = None
    kind: str | None = None
    client_name: str | None = None
    total: int | None = None
    currency: str | None = None
    issued_at: date | None = None
    paid_at: datetime | None = None
    business: dict | None = None  # name + official bank details, the part worth double-checking


# ---------------------------------------------------------------- helpers
PREFIX = "invoice."


def get_business(db: DbSession) -> Business:
    rows = {r.key[len(PREFIX):]: r.value for r in db.query(Setting).filter(Setting.key.like(f"{PREFIX}%")).all()}
    data: dict = {}
    for name, field in Business.model_fields.items():
        if name in rows and rows[name] is not None:
            data[name] = int(rows[name]) if field.annotation is int else rows[name]
    return Business(**data)


def set_business(db: DbSession, patch: BusinessUpdate) -> Business:
    for name, value in patch.model_dump(exclude_none=True).items():
        key = PREFIX + name
        row = db.get(Setting, key)
        text = str(value).strip()
        if row is None:
            db.add(Setting(key=key, value=text))
        else:
            row.value = text
    db.commit()
    return get_business(db)


def totals(inv: Invoice) -> Totals:
    items = json.loads(inv.items or "[]")
    subtotal = sum(int(i["qty"]) * int(i["unit_price"]) for i in items)
    discount = min(inv.discount or 0, subtotal)
    taxable = subtotal - discount
    tax = round(taxable * (inv.tax_percent or 0) / 100)
    total = taxable + tax
    deposit = min(inv.deposit_paid or 0, total)
    return Totals(subtotal=subtotal, discount=discount, taxable=taxable, tax=tax, total=total, deposit_paid=deposit, balance=total - deposit)


def doc_hash(inv: Invoice) -> str:
    """Stable fingerprint of everything printed on the document."""
    t = totals(inv)
    material = json.dumps({
        "number": inv.number, "kind": inv.kind, "client": inv.client_name, "event": inv.event_label, "issued": str(inv.issued_at), "due": str(inv.due_at),
        "currency": inv.currency, "items": json.loads(inv.items or "[]"), "discount": inv.discount, "tax": inv.tax_percent, "deposit": inv.deposit_paid,
        "total": t.total, "notes": inv.notes,
    }, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(material.encode()).hexdigest()


def verify_code(inv: Invoice) -> str:
    """8-character code printed on the document: HMAC of the essentials with the server secret.
    Anyone can check it on /verify; nobody can forge it without SECRET_KEY. It changes when the
    number, client, total or issue date change — so an edited PDF stops matching."""
    t = totals(inv)
    material = f"{inv.number}|{inv.client_name.strip().lower()}|{inv.currency}|{t.total}|{inv.issued_at}"
    digest = hmac.new(get_settings().secret_key.encode(), material.encode(), hashlib.sha256).digest()
    raw = base64.b32encode(digest).decode().rstrip("=")
    code = "".join(ch for ch in raw if ch not in "01IO")[:8]  # no look-alike characters
    return f"{code[:4]}-{code[4:]}"


def verify_url(inv: Invoice) -> str:
    return f"{get_settings().frontend_url.rstrip('/')}/verify/{inv.number}?c={verify_code(inv)}"


def log(db: DbSession, inv: Invoice, action: str, detail: dict | None = None) -> None:
    db.add(InvoiceEvent(invoice_id=inv.id, action=action, detail=json.dumps(detail or {}, default=str, ensure_ascii=False)))


def next_number(db: DbSession, prefix: str) -> str:
    year = date.today().year
    stem = f"{prefix}-{year}-"
    last = db.query(Invoice.number).filter(Invoice.number.like(f"{stem}%")).order_by(Invoice.number.desc()).first()
    n = int(last[0].rsplit("-", 1)[1]) + 1 if last else 1
    return f"{stem}{n:04d}"


def _public_url(inv: Invoice) -> str:
    from ..config import get_settings

    return f"{get_settings().frontend_url.rstrip('/')}/i/{inv.token}"


def out(db: DbSession, inv: Invoice) -> InvoiceOut:
    sess = db.get(PhotoSession, inv.session_id) if inv.session_id else None
    return InvoiceOut(
        **{c.name: getattr(inv, c.name) for c in Invoice.__table__.columns if c.name != "items"},
        items=[Item(**i) for i in json.loads(inv.items or "[]")],
        session_client=sess.client_name if sess else None,
        totals=totals(inv),
        public_url=_public_url(inv),
        verify_code=verify_code(inv),
        verify_url=verify_url(inv),
        current_hash=doc_hash(inv),
    )


def _apply(inv: Invoice, data: dict) -> None:
    for k, v in data.items():
        if k == "items":
            v = json.dumps([i if isinstance(i, dict) else i.model_dump() for i in v])
        setattr(inv, k, v)


# ---------------------------------------------------------------- admin routes
router = APIRouter(prefix="/api/admin", tags=["invoices"], dependencies=[Depends(require_admin)])


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(status: InvoiceStatus | None = Query(None), db: DbSession = Depends(get_db)):
    q = db.query(Invoice)
    if status:
        q = q.filter(Invoice.status == status)
    return [out(db, i) for i in q.order_by(Invoice.created_at.desc()).all()]


@router.post("/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(body: InvoiceIn, db: DbSession = Depends(get_db)):
    biz = get_business(db)
    inv = Invoice(number=next_number(db, biz.prefix or "LW"))
    data = body.model_dump()
    data["issued_at"] = data["issued_at"] or date.today()
    if data.get("notes") is None:
        data["notes"] = biz.default_terms
    _apply(inv, data)
    db.add(inv)
    db.flush()
    log(db, inv, "created", {"hash": doc_hash(inv)})
    db.commit()
    db.refresh(inv)
    return out(db, inv)


@router.get("/invoices/{invoice_id}/events", response_model=list[EventOut])
def invoice_events(invoice_id: str, db: DbSession = Depends(get_db)):
    rows = db.query(InvoiceEvent).filter(InvoiceEvent.invoice_id == invoice_id).order_by(InvoiceEvent.at.desc(), InvoiceEvent.id.desc()).all()
    return [EventOut(at=r.at, action=r.action, detail=json.loads(r.detail or "{}")) for r in rows]


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: str, db: DbSession = Depends(get_db)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return out(db, inv)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: str, body: InvoiceUpdate, db: DbSession = Depends(get_db)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status == InvoiceStatus.paid:
        raise HTTPException(400, "A paid invoice can't be edited — void it and issue a new one")
    before = {c.name: getattr(inv, c.name) for c in Invoice.__table__.columns}
    _apply(inv, body.model_dump(exclude_unset=True))
    changed = sorted(k for k, v in before.items() if getattr(inv, k) != v and k not in ("updated_at",))
    if changed:
        log(db, inv, "updated", {"fields": changed, "hash": doc_hash(inv), "after_sent": inv.status == InvoiceStatus.sent})
    db.commit()
    db.refresh(inv)
    return out(db, inv)


class StatusChange(BaseModel):
    status: InvoiceStatus


@router.post("/invoices/{invoice_id}/status", response_model=InvoiceOut)
def set_status(invoice_id: str, body: StatusChange, db: DbSession = Depends(get_db)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status == InvoiceStatus.void and body.status != InvoiceStatus.void:
        raise HTTPException(400, "A void invoice stays void — duplicate it to issue a new one")
    inv.status = body.status
    if body.status == InvoiceStatus.paid:
        inv.paid_at = utcnow()
        inv.deposit_paid = totals(inv).total  # paid in full
    elif body.status == InvoiceStatus.sent:
        inv.sent_at = inv.sent_at or utcnow()
        inv.sent_hash = doc_hash(inv)  # what the client is being sent, fixed in time
    elif body.status == InvoiceStatus.draft:
        inv.paid_at = None
    log(db, inv, body.status.value, {"hash": doc_hash(inv), "total": totals(inv).total})
    from .bookings import sync_from_invoice

    sync_from_invoice(db, inv.id, body.status.value, inv.deposit_paid or 0)
    db.commit()
    db.refresh(inv)
    return out(db, inv)


@router.post("/invoices/{invoice_id}/duplicate", response_model=InvoiceOut, status_code=201)
def duplicate_invoice(invoice_id: str, db: DbSession = Depends(get_db)):
    src = db.get(Invoice, invoice_id)
    if not src:
        raise HTTPException(404, "Invoice not found")
    biz = get_business(db)
    inv = Invoice(number=next_number(db, biz.prefix or "LW"))
    for c in Invoice.__table__.columns:
        if c.name not in ("id", "number", "token", "status", "paid_at", "sent_at", "created_at", "updated_at", "issued_at"):
            setattr(inv, c.name, getattr(src, c.name))
    inv.issued_at = date.today()
    inv.sent_hash = None
    db.add(inv)
    db.flush()
    log(db, inv, "duplicated", {"from": src.number})
    db.commit()
    db.refresh(inv)
    return out(db, inv)


@router.delete("/invoices/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: str, db: DbSession = Depends(get_db)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status != InvoiceStatus.draft:
        raise HTTPException(400, "Only drafts can be deleted — issued invoices are kept for the books; void it instead")
    db.query(InvoiceEvent).filter(InvoiceEvent.invoice_id == inv.id).delete(synchronize_session=False)
    db.delete(inv)
    db.commit()


@router.get("/invoice-settings", response_model=Business)
def get_invoice_settings(db: DbSession = Depends(get_db)):
    return get_business(db)


@router.put("/invoice-settings", response_model=Business)
def put_invoice_settings(body: BusinessUpdate, db: DbSession = Depends(get_db)):
    return set_business(db, body)


# ---------------------------------------------------------------- public route (client view)
public = APIRouter(prefix="/api/public", tags=["invoices"])


@public.get("/invoices/{token}", response_model=PublicInvoice)
def public_invoice(token: str, db: DbSession = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.token == token).first()
    if not inv or inv.status == InvoiceStatus.draft:
        raise HTTPException(404, "Invoice not found")
    biz = get_business(db).model_dump()
    biz.pop("prefix", None)
    biz.pop("default_terms", None)
    biz.pop("default_due_days", None)
    biz.pop("tax_percent", None)
    return PublicInvoice(
        **{c.name: getattr(inv, c.name) for c in Invoice.__table__.columns if c.name in PublicInvoice.model_fields and c.name != "items"},
        items=[Item(**i) for i in json.loads(inv.items or "[]")],
        totals=totals(inv),
        business=biz,
        verify_code=verify_code(inv),
        verify_url=verify_url(inv),
    )


@public.get("/verify/{number}", response_model=Verification)
def verify(number: str, c: str = Query("", max_length=16), db: DbSession = Depends(get_db)):
    """Check a printed document: number + code. Never reveals anything for an unknown number or a
    wrong code beyond 'no match', so it cannot be used to enumerate clients."""
    number = number.strip().upper()
    inv = db.query(Invoice).filter(Invoice.number == number).first()
    code = c.strip().upper().replace(" ", "")
    if "-" not in code and len(code) == 8:
        code = f"{code[:4]}-{code[4:]}"
    if not inv or inv.status == InvoiceStatus.draft:
        return Verification(valid=False, reason="unknown", number=number)
    if not hmac.compare_digest(code, verify_code(inv)):
        # Could be a genuine but outdated copy (edited after sending) — say so, without details
        return Verification(valid=False, reason="no_match", number=number)
    biz = get_business(db)
    return Verification(
        valid=inv.status != InvoiceStatus.void,
        reason="match" if inv.status != InvoiceStatus.void else "void",
        number=inv.number, status=inv.status, kind=inv.kind, client_name=inv.client_name, total=totals(inv).total, currency=inv.currency,
        issued_at=inv.issued_at, paid_at=inv.paid_at, business={"name": biz.name, "bank_details": biz.bank_details, "email": biz.email, "phone": biz.phone},
    )
