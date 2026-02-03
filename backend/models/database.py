"""Database configuration and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import settings, DATA_DIR

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Create database engine
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize the database with all tables."""
    # Import all models to ensure they're registered
    from . import league, matchup, draft, chat
    
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized at: {settings.database_url}")


if __name__ == "__main__":
    init_db()
