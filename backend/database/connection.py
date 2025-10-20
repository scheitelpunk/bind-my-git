"""
Database connection and session management
"""
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from config.settings import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    # Connection pool settings
    pool_size=20,
    max_overflow=30,
    pool_recycle=3600,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db_session() -> Session:
    """
    Dependency to get database session
    """
    print("get_db_session")
    db = SessionLocal()
    print("db instantiated")

    try:
        return db
    except Exception as e:
        #print(f"Database session error: {e}")
        print("crap")
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all database tables"""
    Base.metadata.drop_all(bind=engine)