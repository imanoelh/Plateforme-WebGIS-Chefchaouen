import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import engine
from app.routers.rasters import router as raster_router
from app.routers.statistics import router as statistics_router


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Chefchaouen WebGIS API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(statistics_router)
app.include_router(raster_router)


@app.get("/api/health", tags=["health"])
def health() -> dict:
    try:
        with engine.connect() as connection:
            postgis = connection.execute(text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')")).scalar_one()
            raster = connection.execute(text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis_raster')")).scalar_one()
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return {"status": "ok" if postgis and raster else "degraded", "database": "connected",
            "postgis": postgis, "postgis_raster": raster}


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_request, error: SQLAlchemyError):
    logger.error("Database request failed", exc_info=(type(error), error, error.__traceback__))
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})
