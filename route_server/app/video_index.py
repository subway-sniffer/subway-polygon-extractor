from pipeline.navigation_routing import build_node_maps
from pipeline.route_edge_planner import normalize_edge_key, safe_title_part
from route_server.app.config import settings
from route_server.app.db import connect, row_to_dict


def build_video_edge_lookup(route_video_edges):
    """Return an edge_id lookup from route_video_edges payload."""
    lookup = {}
    for edge in route_video_edges.get("edges", []) if isinstance(route_video_edges, dict) else []:
        edge_id = edge.get("edge_id")
        if edge_id:
            lookup[edge_id] = edge
    return lookup


def route_edge_video_id(route_edge, nodes_by_id, directed=False):
    """Return the normalized video edge id for one route edge."""
    from_node = nodes_by_id.get(route_edge.get("from"))
    to_node = nodes_by_id.get(route_edge.get("to"))
    if not from_node or not to_node:
        return None
    from_key, to_key = normalize_edge_key(from_node, to_node, directed=directed)
    return f"{from_key}_{to_key}"


def video_url(station_id, station_name, edge):
    """Build a video URL for one edge record."""
    if edge.get("url"):
        return edge["url"]
    if edge.get("r2_url"):
        return edge["r2_url"]
    title = edge.get("video_title") or f"{safe_title_part(station_name or station_id)}_{edge.get('edge_id')}"
    filename = f"{title}.mp4"
    if settings.video_base_url:
        return f"{settings.video_base_url}/{safe_title_part(station_id)}/routes/{filename}"
    return f"{safe_title_part(station_id)}/routes/{filename}"


def db_video_edge(station_id, version, edge_id):
    """Return one video edge row from SQLite."""
    with connect() as conn:
        row = conn.execute(
            """
            SELECT edge_id, video_title, url, from_node_key, to_node_key,
                   route_edge_type, connector_type, transport_mode, used_by_count
            FROM video_edges
            WHERE station_id = ? AND version = ? AND edge_id = ?
            """,
            (str(station_id), str(version), str(edge_id)),
        ).fetchone()
    return row_to_dict(row)


def match_route_videos(station_id, metadata, navigation_graph, route, route_video_edges):
    """Attach pre-rendered video metadata to each route edge."""
    nodes_by_id, _ = build_node_maps(navigation_graph.get("nodes", []))
    lookup = build_video_edge_lookup(route_video_edges)
    videos = []
    missing = []
    for route_edge in route.get("edges", []):
        edge_id = route_edge_video_id(route_edge, nodes_by_id, directed=False)
        if not edge_id:
            continue
        edge = lookup.get(edge_id)
        if not edge:
            missing.append(edge_id)
            continue
        videos.append(
            {
                "edge_id": edge_id,
                "video_title": edge.get("video_title"),
                "url": video_url(station_id, metadata.get("station_name"), edge),
                "from": edge.get("from"),
                "to": edge.get("to"),
            }
        )
    return videos, missing


def match_route_videos_db(station_id, version, metadata, navigation_graph, route):
    """Attach pre-rendered video metadata from SQLite to each route edge."""
    nodes_by_id, _ = build_node_maps(navigation_graph.get("nodes", []))
    matches = []
    missing = []
    for route_edge in route.get("edges", []):
        edge_id = route_edge_video_id(route_edge, nodes_by_id, directed=False)
        if not edge_id:
            continue
        edge = db_video_edge(station_id, version, edge_id)
        if not edge:
            missing.append(edge_id)
            matches.append({"edge_id": edge_id, "route_edge": route_edge, "video_url": None})
            continue
        matches.append(
            {
                "edge_id": edge_id,
                "route_edge": route_edge,
                "video_title": edge.get("video_title"),
                "video_url": video_url(station_id, metadata.get("station_name"), edge),
                "from": {"node_key_str": edge.get("from_node_key")},
                "to": {"node_key_str": edge.get("to_node_key")},
            }
        )
    return matches, missing
