from pipeline.route_edge_planner import exit_route_nodes, platform_car_representatives
from route_server.app.db import delete_version_indexes, init_db, json_text, connect
from route_server.app.storage import save_station_package


def facility_rows(navigation_graph):
    """Yield indexable facility nodes."""
    for node in navigation_graph.get("nodes", []):
        node_type = node.get("type")
        poi_type = node.get("poi_type")
        asset_type = node.get("asset_type")
        if poi_type == "toilet" or asset_type == "toilet":
            facility_type = "toilet"
            facility_subtype = node.get("toilet_gender") or "both"
        elif node_type in {"elevator", "exit_elevator"}:
            facility_type = "elevator"
            facility_subtype = "exit" if node_type == "exit_elevator" else None
        elif node_type == "gate":
            facility_type = "gate"
            facility_subtype = node.get("access_transition")
        else:
            continue
        yield {
            "facility_type": facility_type,
            "facility_subtype": facility_subtype,
            "label": node.get("label") or node.get("asset_id") or node.get("node_id"),
            "node_id": node.get("node_id"),
            "node_key_str": node.get("node_key_str"),
            "layer": node.get("layer"),
            "position": node.get("position"),
        }


def index_station_package(metadata, files, navigation_graph, route_video_edges=None):
    """Build SQLite lookup indexes for one station package."""
    init_db()
    station_id = str(metadata["station_id"])
    version = str(metadata.get("version") or metadata.get("active_version") or "v001")
    route_video_edges = route_video_edges or {}
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO stations (station_id, station_name, line_ids_json, active_version, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(station_id) DO UPDATE SET
              station_name = excluded.station_name,
              line_ids_json = excluded.line_ids_json,
              active_version = excluded.active_version,
              updated_at = CURRENT_TIMESTAMP
            """,
            (
                station_id,
                metadata.get("station_name") or station_id,
                json_text(metadata.get("line_ids", [])),
                version,
            ),
        )
        conn.execute(
            """
            INSERT INTO station_versions (
              station_id, version, navigation_graph_path, route_video_edges_path, scene_planes_path, created_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(station_id, version) DO UPDATE SET
              navigation_graph_path = excluded.navigation_graph_path,
              route_video_edges_path = excluded.route_video_edges_path,
              scene_planes_path = excluded.scene_planes_path
            """,
            (
                station_id,
                version,
                str(files["navigation_graph"]),
                str(files["route_video_edges"]) if files["route_video_edges"].exists() else None,
                str(files["scene_planes"]) if files["scene_planes"].exists() else None,
            ),
        )
        delete_version_indexes(conn, station_id, version)

        for node in platform_car_representatives(navigation_graph):
            conn.execute(
                """
                INSERT INTO platform_nodes (
                  station_id, version, line_id, direction, platform_id, car,
                  node_id, node_key_str, position_json, source_door_count, source_doors_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    station_id,
                    version,
                    node.get("line_id"),
                    node.get("direction"),
                    node.get("platform_id"),
                    node.get("car"),
                    node.get("node_id"),
                    node.get("node_key_str"),
                    json_text(node.get("position")),
                    node.get("source_door_count") or 0,
                    json_text(node.get("source_doors", [])),
                ),
            )

        for node in exit_route_nodes(navigation_graph, include_unnumbered=True):
            conn.execute(
                """
                INSERT INTO exit_nodes (
                  station_id, version, exit_number, node_id, node_key_str, node_type, layer, position_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    station_id,
                    version,
                    node.get("exit_number"),
                    node.get("node_id"),
                    node.get("node_key_str"),
                    node.get("type"),
                    node.get("layer"),
                    json_text(node.get("position")),
                ),
            )

        for node in facility_rows(navigation_graph):
            conn.execute(
                """
                INSERT INTO facility_nodes (
                  station_id, version, facility_type, facility_subtype, label,
                  node_id, node_key_str, layer, position_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    station_id,
                    version,
                    node.get("facility_type"),
                    node.get("facility_subtype"),
                    node.get("label"),
                    node.get("node_id"),
                    node.get("node_key_str"),
                    node.get("layer"),
                    json_text(node.get("position")),
                ),
            )

        for edge in route_video_edges.get("edges", []):
            conn.execute(
                """
                INSERT INTO video_edges (
                  station_id, version, edge_id, video_title, url,
                  from_node_key, to_node_key, route_edge_type, connector_type, transport_mode, used_by_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    station_id,
                    version,
                    edge.get("edge_id"),
                    edge.get("video_title"),
                    edge.get("url") or edge.get("r2_url"),
                    (edge.get("from") or {}).get("node_key_str"),
                    (edge.get("to") or {}).get("node_key_str"),
                    edge.get("route_edge_type"),
                    edge.get("connector_type"),
                    edge.get("transport_mode"),
                    edge.get("used_by_count") or 0,
                ),
            )


def import_station_package(metadata, navigation_graph, route_video_edges=None, scene_planes=None):
    """Save station JSON files and rebuild SQLite indexes."""
    files = save_station_package(metadata, navigation_graph, route_video_edges, scene_planes)
    index_station_package(metadata, files, navigation_graph, route_video_edges)
    return files
