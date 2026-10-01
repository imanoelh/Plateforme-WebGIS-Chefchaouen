import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import URL


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)


def setting(name: str, legacy: str | None = None) -> str:
    value = os.getenv(name) or (os.getenv(legacy) if legacy else None)
    if not value:
        raise RuntimeError(f"Missing required setting: {name}")
    return value


@dataclass(frozen=True)
class Settings:
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    db_schema: str
    cors_origins: tuple[str, ...]

    @property
    def database_url(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )


def load_settings() -> Settings:
    schema = os.getenv("DB_SCHEMA", "webgis")
    if schema != "webgis":
        raise RuntimeError("This API expects DB_SCHEMA=webgis")
    origins = os.getenv("CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081")
    return Settings(
        db_host=setting("DB_HOST", "POSTGRES_HOST"),
        db_port=int(setting("DB_PORT", "POSTGRES_PORT")),
        db_name=setting("DB_NAME", "POSTGRES_DB"),
        db_user=setting("DB_USER", "POSTGRES_USER"),
        db_password=setting("DB_PASSWORD", "POSTGRES_PASSWORD"),
        db_schema=schema,
        cors_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
    )


settings = load_settings()
