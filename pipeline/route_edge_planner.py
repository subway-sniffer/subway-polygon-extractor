import argparse
import json
import math
from pathlib import Path

from pipeline.navigation_routing import (
    build_adjacency,
    build_node_maps,
    load_json,
    normalize_zone,
    resolve_node_id,
    save_json,
    shortest_path,
)


def safe_title_part(value):
    """Return a filesystem-safe title component."""
    text = str(value or "").strip()
    return "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in text).strip("_") or "route"


def distance_3d(a, b):
    """Return Euclidean distance between two 3D points."""
    return math.sqrt(sum((float(x) - float(y)) ** 2 for x, y in zip(a, b)))


def infer_station_name(nodes, fallback="station"):
    """Infer a station name from platform nodes."""
    for node in nodes:
        if node.get("station_name"):
            return node["station_name"]
    return fallback


def platform_car_representatives(navigation_graph):
    """Return one representative node per platform/car group."""
    groups = {}
    for node in navigation_graph.get("nodes", []):
        if node.get("type") != "platform_position":
            continue
        platform_id = node.get("platform_id")
        car = node.get("car")
        position = node.get("position")
        if not platform_id or car is None or not position:
            continue
        groups.setdefault((platform_id, int(car)), []).append(node)

    representatives = []
    for (platform_id, car), nodes in sorted(groups.items(), key=lambda item: (str(item[0][0]), int(item[0][1]))):
        centroid = [
            sum(float(node["position"][axis]) for node in nodes) / len(nodes)
            for axis in range(3)
        ]
        representative = min(nodes, key=lambda node: distance_3d(node["position"], centroid))
        representatives.append(
            {
                "platform_id": platform_id,
                "station_name": representative.get("station_name"),
                "line_id": representative.get("line_id"),
                "direction": representative.get("direction"),
                "car": car,
                "node_id": representative.get("node_id"),
                "node_key": representative.get("node_key"),
                "node_key_str": representative.get("node_key_str"),
                "position": representative.get("position"),
                "source_door_count": len(nodes),
                "source_doors": sorted(node.get("car_door") for node in nodes if node.get("car_door")),
            }
        )
    return representatives


def exit_route_nodes(navigation_graph, include_unnumbered=False):
    """Return exit nodes used as route goals."""
    exits = []
    for node in navigation_graph.get("nodes", []):
        if node.get("type") not in {"exit", "exit_elevator"}:
            continue
        if not include_unnumbered and not node.get("exit_number"):
            continue
        exits.append(
            {
                "node_id": node.get("node_id"),
                "node_key": node.get("node_key"),
                "node_key_str": node.get("node_key_str"),
                "type": node.get("type"),
                "exit_number": node.get("exit_number"),
                "layer": node.get("layer"),
                "position": node.get("position"),
            }
        )
    return sorted(exits, key=lambda node: (str(node.get("exit_number")), str(node.get("node_key_str"))))


def toilet_matches_gender(node, toilet_gender):
    """Return whether one toilet node satisfies a requested gender condition."""
    requested = str(toilet_gender or "any").strip().lower()
    if requested in {"", "any", "all"}:
        return True
    node_gender = str(node.get("toilet_gender") or "both").strip().lower()
    if requested in {"male", "female"}:
        return node_gender in {requested, "both"}
    if requested == "accessible":
        return node_gender == "accessible"
    return node_gender == requested


def toilet_nodes(navigation_graph, toilet_gender):
    """Return toilet waypoint candidates for one gender condition."""
    candidates = []
    for node in navigation_graph.get("nodes", []):
        if node.get("poi_type") != "toilet" and node.get("asset_type") != "toilet":
            continue
        if toilet_matches_gender(node, toilet_gender):
            candidates.append(node)
    return candidates


def route_pair_specs(platform_representatives, exits, include_platform_platform=True, include_same_platform=False):
    """Build OD pair specs for platform-platform and platform-exit routes."""
    pairs = []
    if include_platform_platform:
        for index, start in enumerate(platform_representatives):
            for goal in platform_representatives[index + 1:]:
                if not include_same_platform and start.get("platform_id") == goal.get("platform_id"):
                    continue
                pairs.append(
                    {
                        "type": "platform_platform",
                        "start_node_id": start["node_id"],
                        "goal_node_id": goal["node_id"],
                        "start_node_key_str": start.get("node_key_str"),
                        "goal_node_key_str": goal.get("node_key_str"),
                    }
                )
    for start in platform_representatives:
        for goal in exits:
            pairs.append(
                {
                    "type": "platform_exit",
                    "start_node_id": start["node_id"],
                    "goal_node_id": goal["node_id"],
                    "start_node_key_str": start.get("node_key_str"),
                    "goal_node_key_str": goal.get("node_key_str"),
                    "exit_number": goal.get("exit_number"),
                }
            )
    return pairs


def normalize_edge_key(from_node, to_node, directed=False):
    """Return a stable edge key for deduplication."""
    from_key = from_node.get("node_key_str") or from_node.get("node_id")
    to_key = to_node.get("node_key_str") or to_node.get("node_id")
    if directed or str(from_key) <= str(to_key):
        return str(from_key), str(to_key)
    return str(to_key), str(from_key)


def edge_record(edge_key, from_node, to_node, station_name, route_edge):
    """Build one reusable video edge record."""
    from_key, to_key = edge_key
    return {
        "edge_id": f"{from_key}_{to_key}",
        "video_title": f"{safe_title_part(station_name)}_{from_key}_{to_key}",
        "from": {
            "node_id": from_node.get("node_id"),
            "node_key": from_node.get("node_key"),
            "node_key_str": from_node.get("node_key_str"),
            "position": from_node.get("position"),
        },
        "to": {
            "node_id": to_node.get("node_id"),
            "node_key": to_node.get("node_key"),
            "node_key_str": to_node.get("node_key_str"),
            "position": to_node.get("position"),
        },
        "route_edge_type": route_edge.get("type"),
        "connector_type": route_edge.get("connector_type"),
        "transport_mode": route_edge.get("transport_mode"),
        "used_by_count": 0,
        "used_by_pair_types": [],
        "source_route_edge_ids": [],
    }


class RouteComputer:
    """Reuse node maps and adjacency while evaluating many OD routes."""

    def __init__(self, navigation_graph, **route_options):
        self.nodes = navigation_graph.get("nodes", [])
        self.nodes_by_id, self.node_key_map = build_node_maps(self.nodes)
        self.adjacency = build_adjacency(navigation_graph, **route_options)

    def route(self, start_input, goal_input):
        """Build one route result using the precomputed adjacency graph."""
        start_id = resolve_node_id(start_input, self.nodes_by_id, self.node_key_map)
        goal_id = resolve_node_id(goal_input, self.nodes_by_id, self.node_key_map)
        route = shortest_path(self.adjacency, start_id, goal_id)
        if route is None:
            raise ValueError(f"No route found: {start_input} -> {goal_input}")
        path_node_ids = [start_id]
        for edge in route["edges"]:
            path_node_ids.append(edge["to"])
        path_nodes = [self.nodes_by_id[node_id] for node_id in path_node_ids]
        return {
            "total_cost": route["total_cost"],
            "node_count": len(path_nodes),
            "edge_count": len(route["edges"]),
            "nodes": path_nodes,
            "edges": route["edges"],
            "node_ids": path_node_ids,
            "zone_sequence": [normalize_zone(node.get("zone_type")) for node in path_nodes],
        }


def merge_route_edges(first_route, second_route):
    """Return a minimal route payload from two waypoint route legs."""
    return {
        "total_cost": float(first_route.get("total_cost", 0)) + float(second_route.get("total_cost", 0)),
        "edges": first_route.get("edges", []) + second_route.get("edges", []),
    }


def best_toilet_route(route_computer, pair, toilet_gender, toilet_candidates):
    """Return the cheapest start->toilet->goal route for one OD pair and gender."""
    best = None
    failures = []
    for toilet in toilet_candidates:
        toilet_id = toilet.get("node_id")
        if not toilet_id:
            continue
        try:
            first = route_computer.route(pair["start_node_id"], toilet_id)
            second = route_computer.route(toilet_id, pair["goal_node_id"])
        except Exception as exc:
            failures.append({"toilet_node_id": toilet_id, "error": str(exc)})
            continue
        route = merge_route_edges(first, second)
        route["toilet_node_id"] = toilet_id
        route["toilet_gender"] = toilet_gender
        if best is None or route["total_cost"] < best["total_cost"]:
            best = route
    if best is None:
        raise ValueError(f"No toilet route found for {toilet_gender}: {failures[:3]}")
    return best


def append_route_edges(edges, nodes_by_id, route, pair_type, station_name, directed=False, toilet_gender=None):
    """Add route edges into the reusable edge dictionary."""
    for route_edge in route.get("edges", []):
        from_node = nodes_by_id.get(route_edge.get("from"))
        to_node = nodes_by_id.get(route_edge.get("to"))
        if not from_node or not to_node:
            continue
        edge_key = normalize_edge_key(from_node, to_node, directed=directed)
        if edge_key not in edges:
            record_from = from_node if edge_key[0] == (from_node.get("node_key_str") or from_node.get("node_id")) else to_node
            record_to = to_node if record_from is from_node else from_node
            edges[edge_key] = edge_record(edge_key, record_from, record_to, station_name, route_edge)
        edge = edges[edge_key]
        edge["used_by_count"] += 1
        if pair_type not in edge["used_by_pair_types"]:
            edge["used_by_pair_types"].append(pair_type)
        if toilet_gender:
            edge.setdefault("used_by_toilet_genders", [])
            if toilet_gender not in edge["used_by_toilet_genders"]:
                edge["used_by_toilet_genders"].append(toilet_gender)
        source_edge_id = route_edge.get("edge_id")
        if source_edge_id and source_edge_id not in edge["source_route_edge_ids"]:
            edge["source_route_edge_ids"].append(source_edge_id)


def collect_unique_route_edges(
    navigation_graph,
    pairs,
    station_name,
    directed=False,
    include_toilet_routes=False,
    toilet_genders=None,
    **route_options,
):
    """Run OD routes and return unique route edges plus failures."""
    route_computer = RouteComputer(navigation_graph, **route_options)
    nodes_by_id = route_computer.nodes_by_id
    edges = {}
    failures = []
    routes_ok = 0
    toilet_routes_ok = 0
    toilet_genders = toilet_genders or ["male", "female"]
    toilet_candidates_by_gender = {
        gender: toilet_nodes(navigation_graph, gender)
        for gender in toilet_genders
    } if include_toilet_routes else {}
    for pair in pairs:
        try:
            route = route_computer.route(pair["start_node_id"], pair["goal_node_id"])
        except Exception as exc:
            failures.append({**pair, "error": str(exc)})
            continue
        routes_ok += 1
        append_route_edges(edges, nodes_by_id, route, pair["type"], station_name, directed=directed)
        for gender, candidates in toilet_candidates_by_gender.items():
            if not candidates:
                failures.append({**pair, "type": f"{pair['type']}_via_toilet_{gender}", "error": f"no {gender} toilet candidates"})
                continue
            try:
                toilet_route = best_toilet_route(route_computer, pair, gender, candidates)
            except Exception as exc:
                failures.append({**pair, "type": f"{pair['type']}_via_toilet_{gender}", "error": str(exc)})
                continue
            toilet_routes_ok += 1
            append_route_edges(
                edges,
                nodes_by_id,
                toilet_route,
                f"{pair['type']}_via_toilet",
                station_name,
                directed=directed,
                toilet_gender=gender,
            )
    return sorted(edges.values(), key=lambda edge: edge["edge_id"]), failures, routes_ok, toilet_routes_ok, toilet_candidates_by_gender


def build_route_edge_export(
    navigation_graph,
    station_name=None,
    include_platform_platform=True,
    include_same_platform=False,
    include_unnumbered_exits=False,
    include_toilet_routes=False,
    toilet_genders=None,
    directed=False,
    **route_options,
):
    """Build route-video edge requirements from car-level platform representatives."""
    nodes = navigation_graph.get("nodes", [])
    station = station_name or infer_station_name(nodes)
    platform_reps = platform_car_representatives(navigation_graph)
    exits = exit_route_nodes(navigation_graph, include_unnumbered=include_unnumbered_exits)
    pairs = route_pair_specs(
        platform_reps,
        exits,
        include_platform_platform=include_platform_platform,
        include_same_platform=include_same_platform,
    )
    unique_edges, failures, routes_ok, toilet_routes_ok, toilet_candidates_by_gender = collect_unique_route_edges(
        navigation_graph,
        pairs,
        station,
        directed=directed,
        include_toilet_routes=include_toilet_routes,
        toilet_genders=toilet_genders,
        **route_options,
    )
    return {
        "metadata": {
            "format": "route_video_edges",
            "station_name": station,
            "platform_granularity": "car",
            "edge_deduplication": "directed" if directed else "undirected",
            "include_toilet_routes": include_toilet_routes,
            "toilet_genders": toilet_genders or ["male", "female"],
            "route_options": route_options,
        },
        "counts": {
            "platform_car_node_count": len(platform_reps),
            "exit_node_count": len(exits),
            "od_pair_count": len(pairs),
            "route_success_count": routes_ok,
            "toilet_route_success_count": toilet_routes_ok,
            "route_failure_count": len(failures),
            "unique_edge_count": len(unique_edges),
            "toilet_candidate_counts": {
                gender: len(candidates)
                for gender, candidates in toilet_candidates_by_gender.items()
            },
        },
        "platform_car_nodes": platform_reps,
        "exit_nodes": exits,
        "edges": unique_edges,
        "route_failures": failures,
    }


def parse_args():
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Export unique route-video edges from a navigation graph.")
    parser.add_argument("--input", required=True, help="navigation_graph.json path")
    parser.add_argument("--output", required=True, help="route edge requirements JSON path")
    parser.add_argument("--station-name", help="Station name used in video titles")
    parser.add_argument("--directed", action="store_true", help="Keep A->B and B->A as separate video edges")
    parser.add_argument("--include-same-platform", action="store_true", help="Include car-to-car pairs on the same platform")
    parser.add_argument("--no-platform-platform", action="store_true", help="Skip platform-platform OD routes")
    parser.add_argument("--include-unnumbered-exits", action="store_true", help="Include exit nodes without exit_number")
    parser.add_argument("--include-toilet-routes", action="store_true", help="Include start-to-toilet-to-goal route variants")
    parser.add_argument("--toilet-genders", default="male,female", help="Comma-separated toilet conditions for route variants")
    parser.add_argument("--synthetic-mode", choices=["all", "same-polygon"], default="same-polygon")
    parser.add_argument("--same-layer-radius", type=float, default=None)
    parser.add_argument("--zone-change-penalty", type=float, default=100.0)
    parser.add_argument("--paid-free-penalty", type=float, default=1000.0)
    parser.add_argument("--route-preference", choices=["none", "stair", "escalator", "elevator"], default="none")
    return parser.parse_args()


def main():
    """Run the CLI."""
    args = parse_args()
    graph = load_json(args.input)
    payload = build_route_edge_export(
        graph,
        station_name=args.station_name,
        include_platform_platform=not args.no_platform_platform,
        include_same_platform=args.include_same_platform,
        include_unnumbered_exits=args.include_unnumbered_exits,
        include_toilet_routes=args.include_toilet_routes,
        toilet_genders=[gender.strip() for gender in args.toilet_genders.split(",") if gender.strip()],
        directed=args.directed,
        synthetic_mode=args.synthetic_mode,
        same_layer_radius=args.same_layer_radius,
        zone_change_penalty=args.zone_change_penalty,
        paid_free_penalty=args.paid_free_penalty,
        route_preference=args.route_preference,
    )
    save_json(payload, args.output)
    print(json.dumps({"output": args.output, **payload["counts"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
