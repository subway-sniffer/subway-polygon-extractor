from typing import Any, Literal

from pydantic import BaseModel, Field


class StationMetadata(BaseModel):
    """Station package metadata."""

    station_id: str
    station_name: str
    line_ids: list[str] = Field(default_factory=list)
    version: str = "v001"


class ImportStationRequest(BaseModel):
    """JSON request for importing one station package."""

    metadata: StationMetadata
    navigation_graph: dict[str, Any]
    route_video_edges: dict[str, Any] | None = None
    scene_planes: dict[str, Any] | None = None


class PlatformEndpoint(BaseModel):
    """Human-facing platform route endpoint."""

    type: Literal["platform"] = "platform"
    line_id: str | None = None
    direction: str | None = None
    platform_id: str | None = None
    car: int


class ExitEndpoint(BaseModel):
    """Human-facing exit route endpoint."""

    type: Literal["exit"] = "exit"
    exit_number: str


class FacilityEndpoint(BaseModel):
    """Human-facing facility route endpoint."""

    type: Literal["facility"] = "facility"
    facility_type: str
    label: str | None = None


class NodeEndpoint(BaseModel):
    """Debug/internal route endpoint."""

    type: Literal["node"] = "node"
    node: str


Endpoint = PlatformEndpoint | ExitEndpoint | FacilityEndpoint | NodeEndpoint | str


class RouteRequest(BaseModel):
    """Route request from the client app."""

    station_id: str
    version: str | None = None
    start: Endpoint
    goal: Endpoint
    route_preference: Literal["none", "stair", "escalator", "elevator"] = "none"
    include_toilet: bool = False
    toilet_gender: Literal["any", "male", "female", "accessible"] = "any"
    synthetic_mode: Literal["same-polygon", "all"] = "same-polygon"
    same_layer_radius: float | None = None
    zone_change_penalty: float = 100.0
    paid_free_penalty: float = 1000.0
