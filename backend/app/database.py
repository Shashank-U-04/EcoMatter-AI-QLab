"""SQLAlchemy engine/session setup. SQLite by default, PostgreSQL via DATABASE_URL."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columns added after the initial release; create_all() will not add columns to
# existing tables, so patch them in with ALTER TABLE (no-op if already present).
_SCHEMA_PATCHES = [
    ("generation_runs", "progress_generation", "INTEGER DEFAULT 0"),
    ("generation_runs", "progress_total", "INTEGER DEFAULT 0"),
    ("generation_runs", "progress_best_fitness", "FLOAT DEFAULT 0"),
    ("generation_runs", "progress_valid_count", "INTEGER DEFAULT 0"),
    ("candidates", "starred", "INTEGER DEFAULT 0"),
    ("candidates", "pubchem_cid", "INTEGER"),
]


def apply_schema_patches() -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl in _SCHEMA_PATCHES:
            if table not in inspector.get_table_names():
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
