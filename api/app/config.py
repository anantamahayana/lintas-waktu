from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    admin_password: str = "admin123"
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 480
    database_url: str = f"sqlite:///{BACKEND_DIR / 'photo_platform.db'}"
    google_service_account_file: str = "service_account.json"
    # Hosted deploys (Railway…): the whole service-account JSON in one env var instead of a file
    google_service_account_json: str = ""
    upload_dir: str = str(BACKEND_DIR / "uploads")  # studio logo; point at the volume in production
    google_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    revalidate_secret: str = ""  # shared with the site (REVALIDATE_SECRET); empty = rely on its 60 s cache
    app_env: str = "development"
    cache_dir: str = str(BACKEND_DIR / "cache")
    cache_retention_days: int = 30  # completed sessions older than this lose their image cache

    @property
    def service_account_path(self) -> Path:
        if self.google_service_account_json.strip():
            # materialise once per process; never inside the repo
            import tempfile

            p = Path(tempfile.gettempdir()) / "lw_service_account.json"
            if not p.exists():
                p.write_text(self.google_service_account_json, encoding="utf-8")
            return p
        p = Path(self.google_service_account_file)
        return p if p.is_absolute() else BACKEND_DIR / p


@lru_cache
def get_settings() -> Settings:
    return Settings()
