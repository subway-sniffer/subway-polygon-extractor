import json

from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from pipeline.navigation_routing import build_route_result, list_nodes
from route_server.app.config import settings
from route_server.app.db import init_db
from route_server.app.importer import import_station_package
from route_server.app.indexing import (
    active_version_for_station,
    db_facility_nodes,
    db_route_options,
    resolve_route_endpoint_db,
    station_row,
    station_rows,
    station_version_row,
)
from route_server.app.schemas import ImportStationRequest, RouteRequest
from route_server.app.storage import (
    load_station_package,
)
from route_server.app.video_index import match_route_videos_db


app = FastAPI(title="Subway Route Server", version="0.1.0")
init_db()


def require_admin_token(x_admin_token: str | None):
    """Reject admin requests when ROUTE_SERVER_ADMIN_TOKEN is configured and mismatched."""
    if settings.admin_token and x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="invalid admin token")


async def upload_json(file: UploadFile | None):
    """Read an uploaded JSON file."""
    if file is None:
        return None
    content = await file.read()
    if not content:
        return None
    return json.loads(content.decode("utf-8"))


def toilet_subtypes_for_request(toilet_gender):
    """Return DB toilet subtypes that satisfy a route request."""
    gender = str(toilet_gender or "any").lower()
    if gender == "male":
        return ["male", "both"]
    if gender == "female":
        return ["female", "both"]
    if gender == "accessible":
        return ["accessible"]
    return None


def merge_waypoint_routes(first_route, second_route, waypoint_node_id):
    """Merge start->waypoint and waypoint->goal route payloads."""
    first_nodes = first_route.get("nodes", [])
    second_nodes = second_route.get("nodes", [])
    merged_nodes = first_nodes + second_nodes[1:]
    merged_edges = first_route.get("edges", []) + second_route.get("edges", [])
    return {
        "metadata": {
            **first_route.get("metadata", {}),
            "format": "navigation_route_with_waypoint",
            "waypoint_type": "toilet",
            "waypoint_node_id": waypoint_node_id,
            "first_cost": first_route.get("total_cost", 0),
            "second_cost": second_route.get("total_cost", 0),
        },
        "total_cost": float(first_route.get("total_cost", 0)) + float(second_route.get("total_cost", 0)),
        "node_count": len(merged_nodes),
        "edge_count": len(merged_edges),
        "nodes": merged_nodes,
        "edges": merged_edges,
        "node_ids": [node.get("node_id") for node in merged_nodes],
        "zone_sequence": first_route.get("zone_sequence", []) + second_route.get("zone_sequence", [])[1:],
    }


def best_toilet_route(graph, start, goal, toilet_nodes, route_options):
    """Return the cheapest start->toilet->goal route."""
    if not toilet_nodes:
        raise ValueError("조건에 맞는 화장실 노드가 없습니다.")
    best = None
    failures = []
    for toilet_node in toilet_nodes:
        try:
            first = build_route_result(graph, start, toilet_node, **route_options)
            second = build_route_result(graph, toilet_node, goal, **route_options)
        except Exception as exc:
            failures.append({"toilet_node_id": toilet_node, "error": str(exc)})
            continue
        merged = merge_waypoint_routes(first, second, toilet_node)
        if best is None or merged["total_cost"] < best["total_cost"]:
            best = merged
    if best is None:
        raise ValueError(f"화장실 경유 경로를 찾을 수 없습니다: {failures[:3]}")
    return best


def app_node_type(node):
    """Return a compact app-facing node type."""
    if not node:
        return "unknown"
    if node.get("type") == "platform_position":
        return "platform"
    if node.get("type") == "gate":
        return "gate"
    if node.get("type") in {"exit", "exit_elevator"}:
        return "exit"
    if node.get("poi_type") == "toilet" or node.get("asset_type") == "toilet":
        return "toilet"
    connector_type = node.get("connector_type")
    if connector_type:
        return connector_type
    return node.get("type") or "unknown"


def route_segments(route, video_matches):
    """Build the minimal app-facing segment list."""
    nodes_by_id = {node.get("node_id"): node for node in route.get("nodes", [])}
    segments = []
    for index, match in enumerate(video_matches, start=1):
        route_edge = match.get("route_edge") or {}
        from_node = nodes_by_id.get(route_edge.get("from"))
        to_node = nodes_by_id.get(route_edge.get("to"))
        segments.append(
            {
                "index": index,
                "from_type": app_node_type(from_node),
                "to_type": app_node_type(to_node),
                "video_url": match.get("video_url"),
            }
        )
    return segments


@app.get("/health")
def health():
    """Return server health."""
    return {"ok": True}


@app.get("/stations")
def stations():
    """List registered stations."""
    return station_rows()


@app.get("/stations/{station_id}")
def station_detail(station_id: str):
    """Return one registered station."""
    station = station_row(station_id)
    if not station:
        raise HTTPException(status_code=404, detail="station not found")
    try:
        version = station_version_row(station_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        **station,
        "active_version_record": version,
        "has_navigation_graph": bool(version.get("navigation_graph_path")),
        "has_route_video_edges": bool(version.get("route_video_edges_path")),
        "has_scene_planes": bool(version.get("scene_planes_path")),
    }


@app.get("/stations/{station_id}/nodes")
def station_nodes(station_id: str, version: str | None = None):
    """Return compact route nodes for debugging and admin UI."""
    try:
        _, graph, _ = load_station_package(station_id, version)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"station_id": station_id, "nodes": list_nodes(graph)}


@app.get("/stations/{station_id}/route-options")
def station_route_options(station_id: str, version: str | None = None):
    """Return app-facing route options such as platform cars and exits."""
    try:
        metadata, _, _ = load_station_package(station_id, version)
        options = db_route_options(station_id, version)
    except (FileNotFoundError, KeyError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"station_id": station_id, "metadata": metadata, **options}


@app.post("/route")
def route(request: RouteRequest):
    """Find a route and return matching pre-rendered video edges."""
    try:
        version = active_version_for_station(request.station_id, request.version)
        metadata, graph, _ = load_station_package(request.station_id, version)
        start_endpoint = request.start.model_dump() if hasattr(request.start, "model_dump") else request.start
        goal_endpoint = request.goal.model_dump() if hasattr(request.goal, "model_dump") else request.goal
        start = resolve_route_endpoint_db(request.station_id, version, start_endpoint)
        goal = resolve_route_endpoint_db(request.station_id, version, goal_endpoint)
        route_options = dict(
            synthetic_mode=request.synthetic_mode,
            same_layer_radius=request.same_layer_radius,
            zone_change_penalty=request.zone_change_penalty,
            paid_free_penalty=request.paid_free_penalty,
            route_preference=request.route_preference,
        )
        if request.include_toilet:
            toilet_nodes = db_facility_nodes(
                request.station_id,
                version,
                facility_type="toilet",
                facility_subtypes=toilet_subtypes_for_request(request.toilet_gender),
            )
            result = best_toilet_route(graph, start, goal, toilet_nodes, route_options)
        else:
            result = build_route_result(graph, start, goal, **route_options)
        video_matches, missing_videos = match_route_videos_db(request.station_id, version, metadata, graph, result)
    except (FileNotFoundError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    segments = route_segments(result, video_matches)
    return {
        "station_id": request.station_id,
        "version": version,
        "segments": segments,
        "debug": {
            "start_node": start,
            "goal_node": goal,
            "node_path": result.get("node_ids", []),
            "edge_ids": [match.get("edge_id") for match in video_matches],
            "edge_count": result.get("edge_count", 0),
            "cost": result.get("total_cost", 0),
            "zones": result.get("zone_sequence", []),
            "missing_video_edges": missing_videos,
        },
    }


@app.post("/admin/stations/import")
def import_station_json(request: ImportStationRequest, x_admin_token: str | None = Header(default=None)):
    """Import one station package from JSON body."""
    require_admin_token(x_admin_token)
    files = import_station_package(
        request.metadata.model_dump(),
        request.navigation_graph,
        route_video_edges=request.route_video_edges,
        scene_planes=request.scene_planes,
    )
    return {
        "saved": True,
        "station_id": request.metadata.station_id,
        "version": request.metadata.version,
        "output_dir": str(files["root"]),
    }


@app.post("/admin/stations/import-files")
async def import_station_files(
    metadata: UploadFile = File(...),
    navigation_graph: UploadFile = File(...),
    route_video_edges: UploadFile | None = File(default=None),
    scene_planes: UploadFile | None = File(default=None),
    x_admin_token: str | None = Header(default=None),
):
    """Import one station package from multipart JSON files."""
    require_admin_token(x_admin_token)
    metadata_json = await upload_json(metadata)
    graph_json = await upload_json(navigation_graph)
    video_edges_json = await upload_json(route_video_edges)
    scene_planes_json = await upload_json(scene_planes)
    if not metadata_json or not graph_json:
        raise HTTPException(status_code=400, detail="metadata와 navigation_graph가 필요합니다.")
    files = import_station_package(metadata_json, graph_json, video_edges_json, scene_planes_json)
    return {
        "saved": True,
        "station_id": metadata_json.get("station_id"),
        "version": metadata_json.get("version", "v001"),
        "output_dir": str(files["root"]),
    }
