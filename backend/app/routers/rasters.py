from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.services import rasters as service


router = APIRouter(prefix="/api/rasters", tags=["rasters"])


@router.get("/diagnostics/classes", summary="Check raster classes against database legends on demand")
def raster_class_diagnostics() -> dict:
    return service.class_diagnostics()

@router.get("")
def rasters() -> list[dict]:
    return service.raster_metadata()


@router.get("/{raster_id}")
def raster_metadata(raster_id: str) -> dict:
    try:
        return service.metadata_for(raster_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Raster not found") from None


@router.get("/{raster_id}/image.png", response_class=Response)
def raster_image(raster_id: str) -> Response:
    try:
        image = service.raster_png(raster_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Raster not found") from None
    return Response(image, media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})


@router.get("/{raster_id}/value")
def raster_value(raster_id: str, lng: float = Query(ge=-180, le=180), lat: float = Query(ge=-90, le=90)) -> dict:
    try:
        return service.pixel_value(raster_id, lng, lat)
    except KeyError:
        raise HTTPException(status_code=404, detail="Raster not found") from None
