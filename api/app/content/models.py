import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base
from ..models import utcnow


class ProjectCategory(str, enum.Enum):
    wedding = "wedding"
    prewedding = "prewedding"
    event = "event"
    personal = "personal"


class Project(Base):
    """A portfolio project. Photographs live in a Google Drive folder (the same
    mechanism as proofing sessions); the cover is one of those files."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[ProjectCategory] = mapped_column(Enum(ProjectCategory))
    location: Mapped[str] = mapped_column(String(120), default="")
    date_label: Mapped[str] = mapped_column(String(40), default="")  # "June 2026"
    month: Mapped[str | None] = mapped_column(String(7), nullable=True)  # "2026-06", for ordering
    # Empty string = no Drive folder yet: the project then shows its placeholder_urls.
    drive_folder_id: Mapped[str] = mapped_column(String(255), default="")
    cover_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # JSON list of external image URLs (sample content) used until a Drive folder is set.
    placeholder_urls: Mapped[str | None] = mapped_column(Text, nullable=True)
    # editorial copy, bilingual
    pull_en: Mapped[str] = mapped_column(Text, default="")
    pull_id: Mapped[str] = mapped_column(Text, default="")
    body_en: Mapped[str] = mapped_column(Text, default="")
    body_id: Mapped[str] = mapped_column(Text, default="")
    facts: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON [{label, value}]
    film_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    film_duration: Mapped[str | None] = mapped_column(String(12), nullable=True)
    film_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class InquiryStatus(str, enum.Enum):
    new = "new"
    replied = "replied"
    booked = "booked"
    closed = "closed"


class Inquiry(Base):
    """A message from the public contact form."""

    __tablename__ = "inquiries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(160))
    partner: Mapped[str | None] = mapped_column(String(160), nullable=True)
    email: Mapped[str] = mapped_column(String(255))
    based: Mapped[str | None] = mapped_column(String(160), nullable=True)
    kind: Mapped[str] = mapped_column(String(32))
    date: Mapped[str | None] = mapped_column(String(80), nullable=True)
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    budget: Mapped[str | None] = mapped_column(String(32), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    locale: Mapped[str] = mapped_column(String(5), default="en")
    status: Mapped[InquiryStatus] = mapped_column(Enum(InquiryStatus), default=InquiryStatus.new)
    internal_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
