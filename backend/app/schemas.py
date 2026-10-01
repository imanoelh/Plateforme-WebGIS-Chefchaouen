from pydantic import BaseModel


class LandcoverArea(BaseModel):
    year: int
    value: int
    name: str
    area_ha: float
    hex_color: str | None


class ChangeArea(BaseModel):
    period: str
    value: int
    name: str
    area_ha: float
    hex_color: str | None


class Transition(BaseModel):
    code: int
    from_class: str
    to_class: str
    area_ha: float


class Accuracy(BaseModel):
    year: int
    overall_accuracy: float
    kappa: float
    n_train: int
    n_test: int


class LegendEntry(BaseModel):
    layer: str
    value: int
    class_name: str
    hex_color: str
