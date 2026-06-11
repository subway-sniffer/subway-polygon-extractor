from pipeline.route_edge_planner import exit_route_nodes, platform_car_representatives
from route_server.app.db import connect, from_json_text, row_to_dict
from route_server.app.station_aliases import display_aliases_for_station, normalize_station_key, station_alias_tokens


def normalize_text(value):
    """Normalize a user-facing text field for matching."""
    return str(value or "").strip()


def resolve_station_id(station_id):
    """Resolve a station id or alias to a registered canonical station id."""
    requested = str(station_id)
    with connect() as conn:
        rows = conn.execute(
            "SELECT station_id, station_name FROM stations ORDER BY station_name, station_id"
        ).fetchall()
    for row in rows:
        if str(row["station_id"]) == requested:
            return str(row["station_id"])
    requested_tokens = station_alias_tokens(requested)
    for row in rows:
        row_tokens = station_alias_tokens(row["station_id"], row["station_name"])
        if requested_tokens & row_tokens:
            return str(row["station_id"])
    return requested


def active_version_for_station(station_id, version=None):
    """Return the active or requested version for a station."""
    if version:
        return str(version)
    station_id = resolve_station_id(station_id)
    with connect() as conn:
        row = conn.execute("SELECT active_version FROM stations WHERE station_id = ?", (str(station_id),)).fetchone()
    if not row:
        raise KeyError(f"등록되지 않은 station_id입니다: {station_id}")
    return row["active_version"]


def station_rows():
    """Return registered stations from SQLite."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT station_id, station_name, line_ids_json, active_version, updated_at FROM stations ORDER BY station_name, station_id"
        ).fetchall()
    stations = []
    for row in rows:
        station = {
            **row_to_dict(row),
            "line_ids": from_json_text(row["line_ids_json"], []),
        }
        stations.append(station)
        existing_names = {
            normalize_station_key(station.get("station_id")),
            normalize_station_key(station.get("station_name")),
        }
        for alias in display_aliases_for_station(station.get("station_id"), station.get("station_name")):
            if normalize_station_key(alias) in existing_names:
                continue
            stations.append(
                {
                    **station,
                    "station_name": alias,
                    "alias_of": station.get("station_id"),
                }
            )
    return stations


def station_row(station_id):
    """Return one station row from SQLite."""
    station_id = resolve_station_id(station_id)
    with connect() as conn:
        row = conn.execute(
            "SELECT station_id, station_name, line_ids_json, active_version, updated_at FROM stations WHERE station_id = ?",
            (str(station_id),),
        ).fetchone()
    if not row:
        return None
    return {
        **row_to_dict(row),
        "line_ids": from_json_text(row["line_ids_json"], []),
    }


def station_version_row(station_id, version=None):
    """Return one station version row from SQLite."""
    station_id = resolve_station_id(station_id)
    selected_version = active_version_for_station(station_id, version)
    with connect() as conn:
        row = conn.execute(
            """
            SELECT station_id, version, navigation_graph_path, route_video_edges_path, scene_planes_path, created_at
            FROM station_versions
            WHERE station_id = ? AND version = ?
            """,
            (str(station_id), selected_version),
        ).fetchone()
    if not row:
        raise KeyError(f"등록되지 않은 station version입니다: {station_id}/{selected_version}")
    return row_to_dict(row)


def db_route_options(station_id, version=None):
    """Build app-facing route options from SQLite indexes."""
    station_id = resolve_station_id(station_id)
    selected_version = active_version_for_station(station_id, version)
    with connect() as conn:
        platform_rows = conn.execute(
            """
            SELECT line_id, direction, platform_id, car
            FROM platform_nodes
            WHERE station_id = ? AND version = ?
            ORDER BY line_id, direction, platform_id, car
            """,
            (str(station_id), selected_version),
        ).fetchall()
        exit_rows = conn.execute(
            """
            SELECT exit_number, node_id, node_key_str, node_type AS type, layer, position_json
            FROM exit_nodes
            WHERE station_id = ? AND version = ?
            ORDER BY exit_number, node_key_str
            """,
            (str(station_id), selected_version),
        ).fetchall()
        facility_rows = conn.execute(
            """
            SELECT facility_type AS type, facility_subtype, label, node_id, node_key_str, layer, position_json
            FROM facility_nodes
            WHERE station_id = ? AND version = ?
            ORDER BY facility_type, facility_subtype, label, node_key_str
            """,
            (str(station_id), selected_version),
        ).fetchall()

    platforms = {}
    for row in platform_rows:
        key = (row["line_id"], row["direction"], row["platform_id"])
        entry = platforms.setdefault(
            key,
            {
                "line_id": row["line_id"],
                "direction": row["direction"],
                "platform_id": row["platform_id"],
                "cars": [],
            },
        )
        if row["car"] not in entry["cars"]:
            entry["cars"].append(row["car"])
    for platform in platforms.values():
        platform["cars"] = sorted(platform["cars"])

    exits = []
    for row in exit_rows:
        item = row_to_dict(row)
        item["position"] = from_json_text(item.pop("position_json"), None)
        exits.append(item)

    facilities = []
    for row in facility_rows:
        item = row_to_dict(row)
        item["position"] = from_json_text(item.pop("position_json"), None)
        facilities.append(item)

    return {
        "platforms": list(platforms.values()),
        "exits": exits,
        "facilities": facilities,
    }


def db_platform_node(station_id, version=None, line_id=None, direction=None, platform_id=None, car=None):
    """Resolve a platform endpoint from SQLite indexes."""
    station_id = resolve_station_id(station_id)
    selected_version = active_version_for_station(station_id, version)
    clauses = ["station_id = ?", "version = ?"]
    params = [str(station_id), selected_version]
    if line_id not in (None, ""):
        clauses.append("line_id = ?")
        params.append(line_id)
    if direction not in (None, ""):
        clauses.append("direction = ?")
        params.append(direction)
    if platform_id not in (None, ""):
        clauses.append("platform_id = ?")
        params.append(platform_id)
    if car not in (None, ""):
        clauses.append("car = ?")
        params.append(int(car))
    query = f"SELECT node_id FROM platform_nodes WHERE {' AND '.join(clauses)}"
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
    if not rows:
        raise KeyError("platform 조건에 맞는 대표 노드가 없습니다.")
    if len(rows) > 1:
        raise KeyError("platform 조건이 여러 노드와 매칭됩니다. line_id, direction, platform_id, car를 더 지정하세요.")
    return rows[0]["node_id"]


def db_exit_node(station_id, version=None, exit_number=None, route_preference="none"):
    """Resolve an exit endpoint from SQLite indexes."""
    station_id = resolve_station_id(station_id)
    selected_version = active_version_for_station(station_id, version)
    preference = normalize_text(route_preference).lower()
    if preference == "elevator":
        order_clause = """
            CASE
              WHEN node_type = 'exit_elevator' THEN 0
              ELSE 1
            END,
            node_key_str
        """
    else:
        order_clause = """
            CASE
              WHEN node_type = 'exit_elevator' THEN 1
              ELSE 0
            END,
            node_key_str
        """
    with connect() as conn:
        rows = conn.execute(
            f"""
            SELECT node_id FROM exit_nodes
            WHERE station_id = ? AND version = ? AND exit_number = ?
            ORDER BY {order_clause}
            """,
            (str(station_id), selected_version, str(exit_number)),
        ).fetchall()
    if not rows:
        raise KeyError(f"출구 {exit_number}에 해당하는 노드가 없습니다.")
    return rows[0]["node_id"]


def db_facility_node(station_id, version=None, facility_type=None, facility_subtype=None, label=None):
    """Resolve a facility endpoint from SQLite indexes."""
    station_id = resolve_station_id(station_id)
    selected_version = active_version_for_station(station_id, version)
    clauses = ["station_id = ?", "version = ?", "facility_type = ?"]
    params = [str(station_id), selected_version, str(facility_type)]
    if facility_subtype not in (None, ""):
        clauses.append("facility_subtype = ?")
        params.append(str(facility_subtype))
    if label not in (None, ""):
        clauses.append("label LIKE ?")
        params.append(f"%{label}%")
    query = f"SELECT node_id FROM facility_nodes WHERE {' AND '.join(clauses)} ORDER BY node_key_str"
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
    if not rows:
        raise KeyError("조건에 맞는 시설 노드가 없습니다.")
    if len(rows) > 1 and label in (None, ""):
        raise KeyError("시설 조건이 여러 노드와 매칭됩니다. label을 더 구체적으로 지정하세요.")
    return rows[0]["node_id"]


def db_facility_nodes(station_id, version=None, facility_type=None, facility_subtypes=None):
    """Return matching facility node ids from SQLite indexes."""
    station_id = resolve_station_id(station_id)
    selected_version = active_version_for_station(station_id, version)
    clauses = ["station_id = ?", "version = ?", "facility_type = ?"]
    params = [str(station_id), selected_version, str(facility_type)]
    if facility_subtypes:
        placeholders = ",".join("?" for _ in facility_subtypes)
        clauses.append(f"facility_subtype IN ({placeholders})")
        params.extend([str(value) for value in facility_subtypes])
    query = f"SELECT node_id FROM facility_nodes WHERE {' AND '.join(clauses)} ORDER BY node_key_str"
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
    return [row["node_id"] for row in rows]


def resolve_route_endpoint_db(station_id, version, endpoint, route_preference="none"):
    """Resolve app-facing endpoint data to a node id using SQLite indexes."""
    if isinstance(endpoint, str):
        return endpoint
    endpoint_type = normalize_text(endpoint.get("type"))
    if endpoint.get("node"):
        return endpoint["node"]
    if endpoint.get("node_id"):
        return endpoint["node_id"]
    if endpoint.get("node_key_str"):
        return endpoint["node_key_str"]
    if endpoint_type == "platform":
        return db_platform_node(
            station_id,
            version,
            line_id=endpoint.get("line_id"),
            direction=endpoint.get("direction"),
            platform_id=endpoint.get("platform_id"),
            car=endpoint.get("car"),
        )
    if endpoint_type == "exit":
        return db_exit_node(
            station_id,
            version,
            endpoint.get("exit_number"),
            route_preference=route_preference,
        )
    if endpoint_type == "facility":
        return db_facility_node(
            station_id,
            version,
            facility_type=endpoint.get("facility_type"),
            facility_subtype=endpoint.get("facility_subtype"),
            label=endpoint.get("label"),
        )
    raise KeyError(f"지원하지 않는 endpoint type입니다: {endpoint_type}")


def build_route_options(navigation_graph):
    """Build user-facing route options from a navigation graph."""
    platform_reps = platform_car_representatives(navigation_graph)
    platforms = {}
    for node in platform_reps:
        key = (
            normalize_text(node.get("line_id")),
            normalize_text(node.get("direction")),
            normalize_text(node.get("platform_id")),
        )
        entry = platforms.setdefault(
            key,
            {
                "line_id": node.get("line_id"),
                "direction": node.get("direction"),
                "platform_id": node.get("platform_id"),
                "station_name": node.get("station_name"),
                "cars": [],
            },
        )
        if node.get("car") not in entry["cars"]:
            entry["cars"].append(node.get("car"))
    for platform in platforms.values():
        platform["cars"] = sorted(platform["cars"])

    exits = exit_route_nodes(navigation_graph, include_unnumbered=True)
    facilities = []
    for node in navigation_graph.get("nodes", []):
        node_type = node.get("type")
        if node_type not in {"toilet", "elevator", "exit_elevator", "gate"}:
            continue
        facilities.append(
            {
                "type": node_type,
                "label": node.get("label") or node.get("asset_id") or node.get("node_id"),
                "node_key_str": node.get("node_key_str"),
                "node_id": node.get("node_id"),
                "layer": node.get("layer"),
            }
        )
    return {
        "platforms": sorted(platforms.values(), key=lambda item: (str(item.get("line_id")), str(item.get("direction")), str(item.get("platform_id")))),
        "exits": exits,
        "facilities": facilities,
    }


def representative_platform_node(navigation_graph, line_id=None, direction=None, platform_id=None, car=None):
    """Resolve a platform/car request to the representative platform node."""
    candidates = platform_car_representatives(navigation_graph)
    if line_id not in (None, ""):
        candidates = [node for node in candidates if normalize_text(node.get("line_id")) == normalize_text(line_id)]
    if direction not in (None, ""):
        candidates = [node for node in candidates if normalize_text(node.get("direction")) == normalize_text(direction)]
    if platform_id not in (None, ""):
        candidates = [node for node in candidates if normalize_text(node.get("platform_id")) == normalize_text(platform_id)]
    if car not in (None, ""):
        candidates = [node for node in candidates if int(node.get("car")) == int(car)]
    if not candidates:
        raise KeyError("platform 조건에 맞는 대표 노드가 없습니다.")
    if len(candidates) > 1:
        raise KeyError("platform 조건이 여러 노드와 매칭됩니다. line_id, direction, platform_id, car를 더 지정하세요.")
    return candidates[0]["node_id"]


def exit_node(navigation_graph, exit_number):
    """Resolve an exit number to a route node."""
    target = normalize_text(exit_number)
    matches = [node for node in exit_route_nodes(navigation_graph, include_unnumbered=True) if normalize_text(node.get("exit_number")) == target]
    if not matches:
        raise KeyError(f"출구 {exit_number}에 해당하는 노드가 없습니다.")
    if len(matches) > 1:
        matches = sorted(matches, key=lambda node: str(node.get("node_key_str")))
    return matches[0]["node_id"]


def facility_node(navigation_graph, facility_type, label=None):
    """Resolve a facility request to a navigation node."""
    facility_type = normalize_text(facility_type)
    label = normalize_text(label)
    matches = []
    for node in navigation_graph.get("nodes", []):
        if normalize_text(node.get("type")) != facility_type:
            continue
        if label and label not in normalize_text(node.get("label") or node.get("asset_id") or node.get("node_id")):
            continue
        matches.append(node)
    if not matches:
        raise KeyError("조건에 맞는 시설 노드가 없습니다.")
    if len(matches) > 1:
        raise KeyError("시설 조건이 여러 노드와 매칭됩니다. label을 더 구체적으로 지정하세요.")
    return matches[0]["node_id"]


def resolve_route_endpoint(navigation_graph, endpoint):
    """Resolve app-facing endpoint data to an internal node id."""
    if isinstance(endpoint, str):
        return endpoint
    endpoint_type = normalize_text(endpoint.get("type"))
    if endpoint.get("node"):
        return endpoint["node"]
    if endpoint.get("node_id"):
        return endpoint["node_id"]
    if endpoint.get("node_key_str"):
        return endpoint["node_key_str"]
    if endpoint_type == "platform":
        return representative_platform_node(
            navigation_graph,
            line_id=endpoint.get("line_id"),
            direction=endpoint.get("direction"),
            platform_id=endpoint.get("platform_id"),
            car=endpoint.get("car"),
        )
    if endpoint_type == "exit":
        return exit_node(navigation_graph, endpoint.get("exit_number"))
    if endpoint_type == "facility":
        return facility_node(navigation_graph, endpoint.get("facility_type"), endpoint.get("label"))
    raise KeyError(f"지원하지 않는 endpoint type입니다: {endpoint_type}")
