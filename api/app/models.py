import enum
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_slug() -> str:
    return secrets.token_urlsafe(9)


class SessionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"


class PhotoSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(32), unique=True, index=True, default=new_slug)
    client_name: Mapped[str] = mapped_column(String(255))
    drive_folder_id: Mapped[str] = mapped_column(String(255))
    photo_limit: Mapped[int] = mapped_column(Integer)  # included in the package
    max_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)  # hard cap incl. paid extras; None = photo_limit
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.pending)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pin_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Client's in-progress picks, saved server-side so they survive a device switch (JSON).
    draft_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    draft_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_epoch: Mapped[int] = mapped_column(Integer, default=0)  # bump = sign out every unlocked device
    reset_count: Mapped[int] = mapped_column(Integer, default=0)  # bumps so clients drop stale local picks
    draft_maybe: Mapped[str | None] = mapped_column(Text, nullable=True)  # "tandai dulu" shortlist
    first_opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def hard_limit(self) -> int:
        return max(self.photo_limit, self.max_limit or 0)

    selected_photos: Mapped[list["SelectedPhoto"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="SelectedPhoto.filename"
    )


class SelectedPhoto(Base):
    __tablename__ = "selected_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    drive_file_id: Mapped[str] = mapped_column(String(255))
    filename: Mapped[str] = mapped_column(String(512))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_extra: Mapped[bool] = mapped_column(Boolean, default=False)  # beyond the package limit
    selected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    session: Mapped[PhotoSession] = relationship(back_populates="selected_photos")


class Setting(Base):
    """Single-row-per-key studio settings (branding etc.)."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
