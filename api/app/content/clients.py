"""Clients, derived: there is no client table. Sessions, proofs, invoices, bookings and inquiries that share a
WhatsApp number, an email, a name (case and spacing ignored) or an explicit link belong to the same person."""
import hashlib
import re
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from ..auth import require_admin
from ..database import get_db
from ..models import PhotoSession
from ..services.branding import normalize_wa
from .bookings import Booking
from .invoices import Invoice, payments_of, totals
from .models import Inquiry
from .proofs import AlbumProof

router = APIRouter(prefix="/api/admin", tags=["clients"], dependencies=[Depends(require_admin)])


def _name(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _ts(d) -> datetime:
    if d is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if isinstance(d, datetime):
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


class Item(BaseModel):
    type: str  # session | proof | invoice | booking | inquiry
    id: str
    title: str
    status: str
    at: datetime
    link: str
    amount: int | None = None
    balance: int | None = None
    currency: str | None = None


class Payment(BaseModel):
    receipt_no: str
    amount: int
    currency: str
    paid_on: date
    invoice_number: str
    receipt_url: str


class ClientSummary(BaseModel):
    id: str
    name: str
    wa: str
    email: str
    counts: dict[str, int]
    last_at: datetime
    balance: int  # open IDR balance across invoices (USD shown per invoice)


class ClientDetail(ClientSummary):
    names: list[str]
    items: list[Item]
    payments: list[Payment]


def _groups(db: DbSession):
    """Union-find over every record; returns {group_root: [record, …]} and the records as tuples."""
    recs: list[tuple[str, object, list[str]]] = []  # (type, obj, keys)
    for s in db.query(PhotoSession).all():
        recs.append(("session", s, [f"n:{_name(s.client_name)}", *([f"w:{s.client_wa}"] if s.client_wa else []), f"s:{s.id}"]))
    for i in db.query(Invoice).all():
        wa = normalize_wa(i.client_phone)
        recs.append(("invoice", i, [f"n:{_name(i.client_name)}", *([f"w:{wa}"] if wa else []), *([f"e:{i.client_email.lower()}"] if i.client_email else []),
                                     f"i:{i.id}", *([f"s:{i.session_id}"] if i.session_id else [])]))
    for b in db.query(Booking).all():
        if b.kind == "block" or not (b.client_name or b.client_wa or b.invoice_id or b.session_id):
            continue
        recs.append(("booking", b, [*([f"n:{_name(b.client_name)}"] if b.client_name else []), *([f"w:{b.client_wa}"] if b.client_wa else []),
                                     *([f"i:{b.invoice_id}"] if b.invoice_id else []), *([f"s:{b.session_id}"] if b.session_id else [])]))
    for p in db.query(AlbumProof).all():
        recs.append(("proof", p, [f"n:{_name(p.client_name)}"]))
    for q in db.query(Inquiry).all():
        recs.append(("inquiry", q, [f"n:{_name(q.name)}", *([f"e:{q.email.lower()}"] if q.email else [])]))
    parent: dict[str, str] = {}

    def find(k: str) -> str:
        parent.setdefault(k, k)
        while parent[k] != k:
            parent[k] = parent[parent[k]]
            k = parent[k]
        return k

    for _, _, keys in recs:
        keys = [k for k in keys if k not in ("n:",)]
        for k in keys[1:]:
            parent[find(k)] = find(keys[0])
    groups: dict[str, list[tuple[str, object, list[str]]]] = {}
    for r in recs:
        keys = [k for k in r[2] if k != "n:"]
        if keys:
            groups.setdefault(find(keys[0]), []).append(r)
    return groups


def _gid(members) -> str:
    """Stable id: from the earliest record's own key, so it survives new records joining the group."""
    first = min(members, key=lambda r: (_ts(getattr(r[1], "created_at", None)), r[0]))
    return hashlib.sha1(f"{first[0]}:{first[1].id}".encode()).hexdigest()[:12]


def _build(db: DbSession, members, detail: bool):
    items: list[Item] = []
    pays: list[Payment] = []
    names, was, emails = [], [], []
    balance = 0
    for kind, o, keys in members:
        names += [getattr(o, "client_name", None) or getattr(o, "name", None)]
        was += [k[2:] for k in keys if k.startswith("w:")]
        emails += [k[2:] for k in keys if k.startswith("e:")]
        if kind == "session":
            items.append(Item(type=kind, id=o.id, title=f"Gallery · {o.photo_limit} photos", status=o.status.value, at=_ts(o.created_at), link=f"/admin/sessions/{o.id}"))
        elif kind == "invoice":
            t = totals(o)
            if o.status.value == "sent" and o.kind == "invoice" and o.currency == "IDR":
                balance += t.balance
            items.append(Item(type=kind, id=o.id, title=f"{'Quotation' if o.kind == 'quote' else 'Invoice'} {o.number}" + (f" · {o.event_label}" if o.event_label else ""),
                              status=o.status.value, at=_ts(o.issued_at), link=f"/admin/invoices/{o.id}", amount=t.total, balance=t.balance, currency=o.currency))
            if detail:
                from .invoices import _receipt_url

                pays += [Payment(receipt_no=p.receipt_no, amount=p.amount, currency=o.currency, paid_on=p.paid_on, invoice_number=o.number, receipt_url=_receipt_url(p)) for p in payments_of(db, o)]
        elif kind == "booking":
            items.append(Item(type=kind, id=o.id, title=f"{o.title} · {o.start_date:%d %b %Y}", status=o.status.value, at=_ts(o.start_date), link="/admin/calendar"))
        elif kind == "proof":
            items.append(Item(type=kind, id=o.id, title=f"Album proof v{o.version}", status=o.status, at=_ts(o.updated_at or o.created_at), link="/admin/activity"))
        elif kind == "inquiry":
            items.append(Item(type=kind, id=o.id, title=f"Inquiry · {o.kind}" + (f" · {o.date}" if o.date else ""), status=o.status.value if hasattr(o.status, "value") else str(o.status), at=_ts(o.created_at), link="/admin/inquiries"))
    items.sort(key=lambda x: x.at, reverse=True)
    counts: dict[str, int] = {}
    for it in items:
        counts[it.type] = counts.get(it.type, 0) + 1
    named = [n for n in names if n]
    base = dict(id=_gid(members), name=named[-1] if named else "—", wa=was[0] if was else "", email=emails[0] if emails else "", counts=counts,
                last_at=items[0].at if items else _ts(None), balance=balance)
    if not detail:
        return ClientSummary(**base)
    return ClientDetail(**base, names=sorted(set(named)), items=items, payments=sorted(pays, key=lambda p: p.paid_on, reverse=True))


@router.get("/clients", response_model=list[ClientSummary])
def list_clients(db: DbSession = Depends(get_db)):
    out = [_build(db, m, False) for m in _groups(db).values()]
    return sorted(out, key=lambda c: c.last_at, reverse=True)


@router.get("/clients/{client_id}", response_model=ClientDetail)
def get_client(client_id: str, db: DbSession = Depends(get_db)):
    for m in _groups(db).values():
        if _gid(m) == client_id:
            return _build(db, m, True)
    raise HTTPException(404, "Client not found")
