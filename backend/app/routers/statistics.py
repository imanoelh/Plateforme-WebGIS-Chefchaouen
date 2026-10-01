from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from sqlalchemy.engine import Connection

from app.database import get_connection
from app.schemas import Accuracy, ChangeArea, LandcoverArea, LegendEntry, Transition
from app.services import statistics as service


router = APIRouter(prefix="/api")
Db = Annotated[Connection, Depends(get_connection)]
Year = Literal["2019", "2025"]
Layer = Literal["landcover", "change"]


@router.get("/study-area", summary="Study area as WGS84 GeoJSON")
def study_area(connection: Db) -> dict:
    return service.study_area(connection)


@router.get("/landcover/areas", response_model=list[LandcoverArea])
def landcover_areas(connection: Db, year: Year | None = None):
    return service.landcover_areas(connection, int(year) if year is not None else None)


@router.get("/changes/areas", response_model=list[ChangeArea])
@router.get("/change/areas", response_model=list[ChangeArea], include_in_schema=False)
def change_areas(connection: Db):
    return service.change_areas(connection)


@router.get("/transitions", response_model=list[Transition])
def transitions(connection: Db):
    return service.transitions(connection)


@router.get("/transitions/matrix")
def transition_matrix(connection: Db) -> dict:
    return service.transition_matrix(connection)


@router.get("/accuracy", response_model=list[Accuracy])
def accuracy(connection: Db, year: Year | None = None):
    return service.accuracy(connection, int(year) if year is not None else None)


@router.get("/legend", response_model=list[LegendEntry])
def legend(connection: Db, layer: Layer | None = None):
    return service.legend(connection, layer)


@router.get("/dashboard/summary")
def dashboard_summary(connection: Db) -> dict:
    return service.dashboard_summary(connection)
