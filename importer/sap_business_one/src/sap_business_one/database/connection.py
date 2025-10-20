"""
Database connection and session management
"""
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sap_business_one.utils import settings
from sap_business_one.utils.settings import get_settings
from loguru import logger

global_settings = get_settings()

# Create database engine
engine = create_engine(
    global_settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=global_settings.DEBUG,
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
    logger.info("get_db_session")
    db = SessionLocal()
    logger.info("db instantiated")

    try:
        return db
    except Exception as e:
        logger.error(f"Database session error: {e}")
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
