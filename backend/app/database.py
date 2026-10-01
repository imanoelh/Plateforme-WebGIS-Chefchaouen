from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection

from app.config import settings


engine = create_engine(settings.database_url, pool_pre_ping=True)


def get_connection() -> Iterator[Connection]:
    with engine.connect() as connection:
        yield connection
