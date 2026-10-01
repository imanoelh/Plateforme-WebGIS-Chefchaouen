import logging
import time

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.database import engine


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


if __name__ == "__main__":
    for attempt in range(1, 31):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("PostgreSQL ready")
            break
        except SQLAlchemyError:
            logger.info("Waiting for PostgreSQL (%s/30)", attempt)
            time.sleep(2)
    else:
        raise RuntimeError("PostgreSQL did not become ready")
