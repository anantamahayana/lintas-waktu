from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .models import SessionStatus


# ---- Auth ----
class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---- Photos ----
class Photo(BaseModel):
    file_id: str
    filename: str
    name: str  # filename without extension
    width: int
    height: int
    thumb_url: str
    full_url: str


# ---- Branding / settings ----
class Branding(BaseModel):
    studio_name: str = ""
    tagline: str = ""
    contact: str = ""
    logo_url: str | None = None


class BrandingUpdate(BaseModel):
    studio_name: str = Field("", max_length=120)
    tagline: str = Field("", max_length=200)
    contact: str = Field("", max_length=200)


# ---- Admin sessions ----
class SessionCreate(BaseModel):
    client_name: str = Field(min_length=1, max_length=255)
    drive_folder_id: str = Field(min_length=1, max_length=255)
    photo_limit: int = Field(ge=1, le=1000)
    max_limit: int | None = Field(None, ge=1, le=2000)
    notes: str | None = None
    pin: str | None = Field(None, min_length=4, max_length=4, pattern=r"^\d{4}$")
    expires_at: datetime | None = None

    @field_validator("max_limit")
    @classmethod
    def _max_ge_limit(cls, v, info):
        if v is not None and "photo_limit" in info.data and v < info.data["photo_limit"]:
            raise ValueError("Batas maksimal harus ≥ batas paket")
        return v


class SessionUpdate(BaseModel):
    client_name: str | None = Field(None, min_length=1, max_length=255)
    drive_folder_id: str | None = Field(None, min_length=1, max_length=255)
    photo_limit: int | None = Field(None, ge=1, le=1000)
    max_limit: int | None = Field(None, ge=1, le=2000)
    notes: str | None = None
    pin: str | None = Field(None, max_length=8)  # "" clears
    expires_at: datetime | None = None
    clear_expiry: bool = False


class SelectedPhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    drive_file_id: str
    filename: str
    note: str | None
    is_extra: bool


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slug: str
    client_name: str
    drive_folder_id: str
    photo_limit: int
    max_limit: int | None
    status: SessionStatus
    notes: str | None
    has_pin: bool
    expires_at: datetime | None
    created_at: datetime
    submitted_at: datetime | None
    first_opened_at: datetime | None = None
    last_seen_at: datetime | None = None
    draft_count: int = 0
    preview_urls: list[str] = []
    selected_count: int
    extra_count: int
    gallery_url: str


class DraftPhotoOut(BaseModel):
    drive_file_id: str
    filename: str
    note: str | None = None


class SessionDetailOut(SessionOut):
    selected_photos: list[SelectedPhotoOut]
    draft_photos: list[DraftPhotoOut] = []
    gallery_token: str | None = None  # lets the admin page load images of a PIN-protected gallery


class FolderCheck(BaseModel):
    drive_folder_id: str = Field(min_length=1)


class CacheStatus(BaseModel):
    total: int
    thumb: int
    full: int
    warming: bool
    ready: bool


class FolderCheckOut(BaseModel):
    ok: bool
    photo_count: int
    mock: bool
    message: str


# ---- Public gallery ----
class GalleryMeta(BaseModel):
    """What a client may know before unlocking."""
    client_name: str
    locked: bool
    expired: bool
    preview: bool = False  # opened by the logged-in photographer
    branding: Branding


class GalleryOut(BaseModel):
    client_name: str
    photo_limit: int
    max_limit: int
    status: SessionStatus
    photos: list[Photo]
    selected_ids: list[str]
    notes: dict[str, str]
    maybe_ids: list[str] = []
    rev: int = 0
    preview: bool = False  # photographer preview: nothing is saved, client's picks untouched
    expires_at: datetime | None = None
    branding: Branding


class DraftRequest(BaseModel):
    file_ids: list[str] = []
    notes: dict[str, str] = {}
    maybe_ids: list[str] = []


class UnlockRequest(BaseModel):
    pin: str = Field(min_length=1, max_length=8)


class UnlockOut(BaseModel):
    token: str


class SubmitRequest(BaseModel):
    file_ids: list[str] = Field(min_length=1)
    notes: dict[str, str] = {}
    # Which picks the client marks as paid extras; if omitted, the last picks are extras.
    extra_ids: list[str] | None = None


class SubmitOut(BaseModel):
    selected_count: int
    extra_count: int
    message: str
