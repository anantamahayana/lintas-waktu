from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .models import InquiryStatus, ProjectCategory

SLUG = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class Fact(BaseModel):
    label: str = Field(max_length=60)
    value: str = Field(max_length=160)


class Film(BaseModel):
    title: str | None = None
    duration: str | None = None
    url: str | None = None


class ProjectBase(BaseModel):
    slug: str = Field(min_length=2, max_length=80, pattern=SLUG)
    title: str = Field(min_length=1, max_length=160)
    category: ProjectCategory
    location: str = Field("", max_length=120)
    date_label: str = Field("", max_length=40)
    month: str | None = Field(None, pattern=r"^\d{4}-\d{2}$")
    drive_folder_id: str = Field("", max_length=255)
    cover_file_id: str | None = None
    placeholder_urls: list[str] = []
    pull_en: str = ""
    pull_id: str = ""
    body_en: str = ""
    body_id: str = ""
    facts: list[Fact] = []
    film_title: str | None = None
    film_duration: str | None = None
    film_url: str | None = None
    featured: bool = False
    published: bool = False
    sort_order: int = 0


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    """PATCH semantics — every field optional."""

    slug: str | None = Field(None, min_length=2, max_length=80, pattern=SLUG)
    title: str | None = Field(None, min_length=1, max_length=160)
    category: ProjectCategory | None = None
    location: str | None = None
    date_label: str | None = None
    month: str | None = None
    drive_folder_id: str | None = None
    cover_file_id: str | None = None
    placeholder_urls: list[str] | None = None
    pull_en: str | None = None
    pull_id: str | None = None
    body_en: str | None = None
    body_id: str | None = None
    facts: list[Fact] | None = None
    film_title: str | None = None
    film_duration: str | None = None
    film_url: str | None = None
    featured: bool | None = None
    published: bool | None = None
    sort_order: int | None = None


class ProjectPhotoOut(BaseModel):
    file_id: str
    filename: str
    width: int
    height: int
    thumb_url: str
    full_url: str


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    cover_url: str | None = None
    photo_count: int = 0
    created_at: datetime
    updated_at: datetime


class ProjectDetailOut(ProjectOut):
    photos: list[ProjectPhotoOut] = []


class PublicProjectOut(BaseModel):
    """What the website consumes — copy resolved to one locale."""

    slug: str
    title: str
    category: ProjectCategory
    location: str
    date_label: str
    month: str | None
    cover_url: str | None
    pull: str
    body: str
    facts: list[Fact]
    film: Film | None = None
    featured: bool
    photos: list[ProjectPhotoOut] = []


class InquiryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    partner: str | None = Field(None, max_length=160)
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    based: str | None = Field(None, max_length=160)
    kind: str = Field(min_length=1, max_length=32)
    date: str | None = Field(None, max_length=80)
    location: str | None = Field(None, max_length=160)
    budget: str | None = Field(None, max_length=32)
    message: str = Field(min_length=1, max_length=5000)
    locale: str = Field("en", max_length=5)
    website: str | None = None  # honeypot — must be empty


class InquiryUpdate(BaseModel):
    status: InquiryStatus | None = None
    internal_note: str | None = None


class InquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    partner: str | None
    email: str
    based: str | None
    kind: str
    date: str | None
    location: str | None
    budget: str | None
    message: str
    locale: str
    status: InquiryStatus
    internal_note: str | None
    created_at: datetime
    updated_at: datetime


class SiteSettings(BaseModel):
    """Public site settings, stored key/value in the settings table."""

    studio_name: str = "Lintas Waktu"
    descriptor_en: str = "Photography & Film · Bali"
    descriptor_id: str = "Fotografi & Film · Bali"
    whatsapp_number: str = ""  # E.164 without "+"
    whatsapp_display: str = ""
    email: str = ""
    instagram: str = ""
    service_area: str = "Bali"
    usd_rate: int = 16000
    default_package_size: int = 30
    default_validity_days: int = 21
    whatsapp_template: str = (
        "Hi {name}, your photographs are ready to choose from.\n\n{link}\nPIN: {pin}\n\n"
        "Please pick your {package} favourites (up to {extras} with extras), then press Send.\n"
        "The gallery stays open until {deadline}.\n\nThank you — {studio}"
    )


class SiteSettingsUpdate(BaseModel):
    studio_name: str | None = None
    descriptor_en: str | None = None
    descriptor_id: str | None = None
    whatsapp_number: str | None = None
    whatsapp_display: str | None = None
    email: str | None = None
    instagram: str | None = None
    service_area: str | None = None
    usd_rate: int | None = None
    default_package_size: int | None = None
    default_validity_days: int | None = None
    whatsapp_template: str | None = None
