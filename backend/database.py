import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./users.db"
)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = (
        "postgresql+psycopg2://" +
        DATABASE_URL[len("postgres://"):]
    )
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = (
        "postgresql+psycopg2://" +
        DATABASE_URL[len("postgresql://"):]
    )

is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args=(
        {"check_same_thread": False}
        if is_sqlite
        else {"sslmode": "require"}
    ),
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()