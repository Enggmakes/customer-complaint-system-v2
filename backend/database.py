from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

raw_database_url = os.getenv("DATABASE_URL", "sqlite:///./ccms.db")

# Fix Render PostgreSQL URL compatibility:
# Render sets DATABASE_URL with "postgres://...", but SQLAlchemy >= 1.4 requires "postgresql://..."
if raw_database_url.startswith("postgres://"):
    DATABASE_URL = raw_database_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_database_url

# PostgreSQL (Render) vs SQLite (Local) engine configuration
if not DATABASE_URL.startswith("sqlite"):
    print("[DATABASE] Connecting to PostgreSQL (Render / Production Cloud)...")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # Automatically reconnects if Render drops idle connection
        pool_size=10,            # Efficient connection pooling
        max_overflow=20,
        pool_recycle=300,        # Recycle connections every 5 minutes to prevent stale timeouts
    )
else:
    print("[DATABASE] Connecting to local SQLite database...")
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def auto_migrate_db():
    """
    Ensure newly added columns exist in both PostgreSQL (Render) and SQLite.
    Runs non-destructively so existing records and production data are preserved.
    """
    try:
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        if "complaints" in table_names:
            columns = [c["name"] for c in inspector.get_columns("complaints")]
            new_columns = {
                "workspace": "VARCHAR(100) DEFAULT 'general'",
                "record_type": "VARCHAR(100) DEFAULT 'issue'",
                "title": "VARCHAR(300)",
                "response_draft": "TEXT",
                "custom_data": "TEXT",
            }
            with engine.connect() as conn:
                for col_name, col_type in new_columns.items():
                    if col_name not in columns:
                        print(f"[DB MIGRATE] Adding column '{col_name}' to complaints table on {engine.dialect.name}...")
                        conn.execute(text(f"ALTER TABLE complaints ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
            print(f"[DB MIGRATE] Database schema verified & up to date on {engine.dialect.name}.")
    except Exception as e:
        print(f"[DB MIGRATE WARN] Migration check: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
