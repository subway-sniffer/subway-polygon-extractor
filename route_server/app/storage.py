from pathlib import Path

from route_server.app.config import settings
from route_server.app.json_utils import load_json, save_json


def safe_path_part(value):
    """Return a safe path component for station/version folders."""
    text = str(value or "").strip()
    return "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in text).strip("_") or "unknown"


def station_dir(station_id):
    """Return a station data directory."""
    return settings.data_root / "stations" / safe_path_part(station_id)


def version_dir(station_id, version):
    """Return a station version data directory."""
    return station_dir(station_id) / safe_path_part(version)


def station_index_path():
    """Return the station index JSON path."""
    return settings.data_root / "stations.json"


def load_station_index():
    """Load all registered station records."""
    path = station_index_path()
    if not path.exists():
        return {"stations": []}
    return load_json(path)


def save_station_index(index):
    """Save station index records."""
    return save_json(index, station_index_path())


def find_station(station_id):
    """Find one station record by id."""
    for station in load_station_index().get("stations", []):
        if str(station.get("station_id")) == str(station_id):
            return station
    return None


def upsert_station(metadata):
    """Insert or update station metadata in the index."""
    index = load_station_index()
    stations = index.setdefault("stations", [])
    station_id = str(metadata["station_id"])
    existing = next((station for station in stations if str(station.get("station_id")) == station_id), None)
    if existing:
        existing.update(metadata)
    else:
        stations.append(metadata)
    stations.sort(key=lambda station: (str(station.get("station_name") or ""), str(station.get("station_id") or "")))
    save_station_index(index)
    return metadata


def active_version(station):
    """Return a station's active version string."""
    return str(station.get("active_version") or station.get("version") or "v001")


def station_files(station_id, version=None):
    """Return core JSON paths for a station version."""
    station = find_station(station_id)
    selected_version = str(version or active_version(station or {"version": "v001"}))
    root = version_dir(station_id, selected_version)
    return {
        "root": root,
        "metadata": root / "metadata.json",
        "navigation_graph": root / "navigation_graph.json",
        "route_video_edges": root / "route_video_edges.json",
        "scene_planes": root / "scene_planes.json",
    }


def load_station_package(station_id, version=None):
    """Load station metadata, navigation graph, and optional video edge index."""
    files = station_files(station_id, version)
    if not files["navigation_graph"].exists():
        raise FileNotFoundError(f"navigation_graph.json not found for station {station_id}")
    metadata = load_json(files["metadata"]) if files["metadata"].exists() else {}
    graph = load_json(files["navigation_graph"])
    video_edges = load_json(files["route_video_edges"]) if files["route_video_edges"].exists() else {}
    return metadata, graph, video_edges


def save_station_package(metadata, navigation_graph, route_video_edges=None, scene_planes=None):
    """Save a full station route package."""
    station_id = str(metadata["station_id"])
    version = str(metadata.get("version") or metadata.get("active_version") or "v001")
    metadata = {**metadata, "station_id": station_id, "version": version, "active_version": version}
    files = station_files(station_id, version)
    files["root"].mkdir(parents=True, exist_ok=True)
    save_json(metadata, files["metadata"])
    save_json(navigation_graph, files["navigation_graph"])
    if route_video_edges is not None:
        save_json(route_video_edges, files["route_video_edges"])
    if scene_planes is not None:
        save_json(scene_planes, files["scene_planes"])
    upsert_station(metadata)
    return files
