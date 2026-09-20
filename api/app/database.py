from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate() -> None:
    """create_all() never alters existing tables; add any columns the models gained since."""
    from sqlalchemy import inspect, text

    from . import models  # noqa: F401  (registers tables on Base)
    from .content import models as _content  # noqa: F401
    from .content import invoices as _invoices  # noqa: F401
    from .content import bookings as _bookings  # noqa: F401

    Base.metadata.create_all(bind=engine)
    insp = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            existing = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in existing:
                    continue
                ddl = f'ALTER TABLE {table.name} ADD COLUMN {col.name} {col.type.compile(engine.dialect)}'
                if col.default is not None and col.default.is_scalar:
                    v = col.default.arg
                    ddl += f" DEFAULT {int(v) if isinstance(v, bool) else repr(v)}"
                conn.execute(text(ddl))
