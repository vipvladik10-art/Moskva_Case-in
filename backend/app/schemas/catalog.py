from typing import Any

from pydantic import BaseModel, Field


class LocationPayload(BaseModel):
    lat: float
    lon: float


class SiteCreatePayload(BaseModel):
    name: str | None = None
    location: LocationPayload
    geometry: dict[str, Any] | None = None
    lane_width_m: float = 4.0
    layer_thickness_m: float = 0.05
    mix_density_t_m3: float = 2.4
    mix_type: str = "ЩМА-15"
    thin_layer: bool = False
    preferred_plant_id: int | None = None


class SiteUpdatePayload(BaseModel):
    name: str | None = None
    location: LocationPayload | None = None
    geometry: dict[str, Any] | None = None
    lane_width_m: float | None = None
    layer_thickness_m: float | None = None
    mix_density_t_m3: float | None = None
    mix_type: str | None = None
    thin_layer: bool | None = None
    preferred_plant_id: int | None = None


class PlantCreatePayload(BaseModel):
    name: str | None = None
    location: LocationPayload
    capacity_t_per_hour: int = 60
    active: bool = True


class PlantUpdatePayload(BaseModel):
    name: str | None = None
    location: LocationPayload | None = None
    capacity_t_per_hour: int | None = None
    active: bool | None = None


class MapMarkerCreatePayload(BaseModel):
    name: str | None = None
    lat: float
    lon: float
    notes: str = ""


class MapMarkerUpdatePayload(BaseModel):
    name: str | None = None
    lat: float | None = None
    lon: float | None = None
    notes: str | None = None
