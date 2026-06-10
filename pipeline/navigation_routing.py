import argparse
import heapq
import json
import math
from pathlib import Path


FREE_ZONE_TYPES = {"public", "free", "outside", None, ""}
PAID_ZONE_TYPES = {"paid"}
ROUTE_PREFERENCES = {"none", "elevator"}


def load_json(path):
    """Load one JSON file."""
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(data, path):
    """Save JSON with readable UTF-8 formatting."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def distance_3d(a, b):
    """Return Euclidean distance between two 3D points."""
    return math.sqrt(sum((float(x) - float(y)) ** 2 for x, y in zip(a, b)))


def normalize_zone(zone_type):
    """Normalize a zone label for routing penalties."""
    value = str(zone_type or "public").strip().lower()
    if value == "free":
        return "public"
    return value or "public"


def is_paid_free_transition(zone_a, zone_b):
    """Return true when a route crosses between paid and free/public zones."""
    a = normalize_zone(zone_a)
    b = normalize_zone(zone_b)
    return (a in PAID_ZONE_TYPES and b in FREE_ZONE_TYPES) or (b in PAID_ZONE_TYPES and a in FREE_ZONE_TYPES)


def edge_allows_paid_free_transition(edge):
    """Return true when an edge is allowed to cross paid/public boundaries."""
    edge_type = str(edge.get("type") or "").lower()
    return edge_type == "gate_crossing"


def build_node_maps(nodes):
    """Build lookup dictionaries for node_id and numeric node keys."""
    by_id = {}
    by_key = {}
    for index, node in enumerate(nodes, start=1):
        node_id = node.get("node_id")
        if not node_id:
            continue
        node.setdefault("node_key", index)
        node.setdefault("node_key_str", f"N{index:04d}")
        by_id[node_id] = node
        if node.get("node_key") is not None:
            by_key[str(node["node_key"])] = node_id
        if node.get("node_key_str"):
            by_key[str(node["node_key_str"])] = node_id
    return by_id, by_key


def resolve_node_id(value, nodes_by_id, node_key_map):
    """Resolve a user input as node_id, node_key, or node_key_str."""
    key = str(value)
    if key in nodes_by_id:
        return key
    if key in node_key_map:
        return node_key_map[key]
    raise KeyError(f"Unknown node: {value}")


def edge_zone_penalty(from_node, to_node, zone_change_penalty, paid_free_penalty):
    """Return extra cost for undesirable zone transitions."""
    from_zone = normalize_zone(from_node.get("zone_type"))
    to_zone = normalize_zone(to_node.get("zone_type"))
    if node_zone_signature(from_node) == node_zone_signature(to_node):
        return 0.0
    if is_paid_free_transition(from_zone, to_zone):
        return float(paid_free_penalty)
    return float(zone_change_penalty)


def node_zone_signature(node):
    """Return the routing zone identity for one node."""
    if node.get("type") == "gate":
        zone_type = normalize_zone(node.get("zone_type"))
        if zone_type == "paid" and node.get("zone_label"):
            return (zone_type, str(node.get("zone_label") or ""))
        if zone_type in FREE_ZONE_TYPES:
            return (zone_type, "")
    return (normalize_zone(node.get("zone_type")), str(node.get("zone_id") or ""))


def same_walkable_region(from_node, to_node, synthetic_mode):
    """Return whether two nodes can receive a synthetic walking edge."""
    if from_node.get("type") == "gate" and to_node.get("type") == "gate":
        return False
    if synthetic_mode == "same-polygon" and from_node.get("polygon_id") != to_node.get("polygon_id"):
        return False
    return node_zone_signature(from_node) == node_zone_signature(to_node)


def is_zone_transition_gate(node):
    """Return true for a gate node that can bridge different routing zones."""
    return node.get("type") == "gate"


def edge_transport_mode(edge):
    """Return the transport mode represented by one graph edge."""
    edge_type = str(edge.get("type") or "").lower()
    connector_type = str(edge.get("connector_type") or "").lower()
    if edge_type == "elevator" or connector_type == "elevator":
        return "elevator"
    if connector_type in {"escalator", "stair"}:
        return connector_type
    if edge_type in {"escalator", "stair"}:
        return edge_type
    return None


def preference_multiplier(mode, route_preference):
    """Return a cost multiplier for the requested vertical transport preference."""
    preference = str(route_preference or "none").lower()
    if preference not in ROUTE_PREFERENCES or preference == "none" or mode is None:
        return 8.0 if mode == "elevator" else 1.0
    if preference == "elevator" and mode in {"elevator", "escalator"}:
        return 0.6
    if mode == "elevator":
        return 8.0
    if mode in {"stair", "escalator", "elevator"}:
        return 1.6
    return 1.0


def add_directed_edge(graph, edge):
    """Append one directed edge to an adjacency list."""
    graph.setdefault(edge["from"], []).append(edge)


def build_adjacency(
    navigation_graph,
    synthetic_same_layer=True,
    synthetic_mode="same-polygon",
    same_layer_radius=None,
    zone_change_penalty=100.0,
    paid_free_penalty=1000.0,
    route_preference="none",
):
    """Build routing adjacency from explicit graph edges and optional same-layer walking edges."""
    nodes = navigation_graph.get("nodes", [])
    nodes_by_id, _ = build_node_maps(nodes)
    adjacency = {node_id: [] for node_id in nodes_by_id}

    for edge in navigation_graph.get("edges", []):
        from_id = edge.get("from")
        to_id = edge.get("to")
        if from_id not in nodes_by_id or to_id not in nodes_by_id:
            continue
        if is_paid_free_transition(nodes_by_id[from_id].get("zone_type"), nodes_by_id[to_id].get("zone_type")) and not edge_allows_paid_free_transition(edge):
            continue
        base_cost = float(edge.get("cost") or distance_3d(nodes_by_id[from_id]["position"], nodes_by_id[to_id]["position"]))
        transport_mode = edge_transport_mode(edge)
        multiplier = preference_multiplier(transport_mode, route_preference)
        preferred_cost = base_cost * multiplier
        if transport_mode in {"stair", "escalator", "elevator"}:
            penalty = 0.0
        else:
            penalty = edge_zone_penalty(nodes_by_id[from_id], nodes_by_id[to_id], zone_change_penalty, paid_free_penalty)
        routed_edge = {
            **edge,
            "from": from_id,
            "to": to_id,
            "route_cost": preferred_cost + penalty,
            "base_cost": base_cost,
            "preference_multiplier": multiplier,
            "transport_mode": transport_mode,
            "zone_penalty": penalty,
            "synthetic": False,
        }
        add_directed_edge(adjacency, routed_edge)
        if edge.get("bidirectional", True):
            reverse = {**routed_edge, "from": to_id, "to": from_id, "edge_id": f"{edge.get('edge_id', 'edge')}_reverse"}
            add_directed_edge(adjacency, reverse)

    if not synthetic_same_layer:
        return adjacency

    by_layer = {}
    for node in nodes:
        if not node.get("node_id") or not node.get("layer") or not node.get("position"):
            continue
        by_layer.setdefault(node.get("layer"), []).append(node)

    for layer_nodes in by_layer.values():
        for index, from_node in enumerate(layer_nodes):
            for to_node in layer_nodes[index + 1:]:
                if not same_walkable_region(from_node, to_node, synthetic_mode):
                    continue
                if is_paid_free_transition(from_node.get("zone_type"), to_node.get("zone_type")):
                    continue
                base_cost = distance_3d(from_node["position"], to_node["position"])
                if same_layer_radius is not None and base_cost > same_layer_radius:
                    continue
                penalty = edge_zone_penalty(from_node, to_node, zone_change_penalty, paid_free_penalty)
                edge_id = f"walk_{from_node['node_id']}_to_{to_node['node_id']}"
                forward = {
                    "edge_id": edge_id,
                    "from": from_node["node_id"],
                    "to": to_node["node_id"],
                    "type": "synthetic_walk",
                    "bidirectional": True,
                    "route_cost": base_cost + penalty,
                    "base_cost": base_cost,
                    "zone_penalty": penalty,
                    "synthetic": True,
                }
                add_directed_edge(adjacency, forward)
                add_directed_edge(adjacency, {**forward, "from": to_node["node_id"], "to": from_node["node_id"], "edge_id": f"{edge_id}_reverse"})
    return adjacency


def shortest_path(adjacency, start_id, goal_id):
    """Run Dijkstra and return total cost plus edge path."""
    queue = [(0.0, start_id)]
    distances = {start_id: 0.0}
    previous = {}
    visited = set()

    while queue:
        current_cost, node_id = heapq.heappop(queue)
        if node_id in visited:
            continue
        visited.add(node_id)
        if node_id == goal_id:
            break
        for edge in adjacency.get(node_id, []):
            next_id = edge["to"]
            next_cost = current_cost + float(edge["route_cost"])
            if next_cost < distances.get(next_id, math.inf):
                distances[next_id] = next_cost
                previous[next_id] = (node_id, edge)
                heapq.heappush(queue, (next_cost, next_id))

    if goal_id not in distances:
        return None

    edges = []
    node_id = goal_id
    while node_id != start_id:
        prev_node, edge = previous[node_id]
        edges.append(edge)
        node_id = prev_node
    edges.reverse()
    return {"total_cost": distances[goal_id], "edges": edges}


def build_route_result(navigation_graph, start_input, goal_input, **options):
    """Build a route result payload from one navigation graph."""
    nodes = navigation_graph.get("nodes", [])
    nodes_by_id, node_key_map = build_node_maps(nodes)
    start_id = resolve_node_id(start_input, nodes_by_id, node_key_map)
    goal_id = resolve_node_id(goal_input, nodes_by_id, node_key_map)
    adjacency = build_adjacency(navigation_graph, **options)
    route = shortest_path(adjacency, start_id, goal_id)
    if route is None:
        raise ValueError(f"No route found: {start_input} -> {goal_input}")

    path_node_ids = [start_id]
    for edge in route["edges"]:
        path_node_ids.append(edge["to"])
    path_nodes = [nodes_by_id[node_id] for node_id in path_node_ids]
    return {
        "metadata": {
            "format": "navigation_route",
            "routing": "dijkstra",
            "start": start_input,
            "goal": goal_input,
            "start_node_id": start_id,
            "goal_node_id": goal_id,
            "synthetic_same_layer": options.get("synthetic_same_layer", True),
            "synthetic_mode": options.get("synthetic_mode", "same-polygon"),
            "zone_change_penalty": options.get("zone_change_penalty"),
            "paid_free_penalty": options.get("paid_free_penalty"),
            "route_preference": options.get("route_preference", "none"),
        },
        "total_cost": route["total_cost"],
        "node_count": len(path_nodes),
        "edge_count": len(route["edges"]),
        "nodes": path_nodes,
        "edges": route["edges"],
        "node_ids": path_node_ids,
        "zone_sequence": [normalize_zone(node.get("zone_type")) for node in path_nodes],
    }


def list_nodes(navigation_graph):
    """Return compact rows for selecting route endpoints."""
    build_node_maps(navigation_graph.get("nodes", []))
    rows = []
    for node in navigation_graph.get("nodes", []):
        rows.append(
            {
                "node_key": node.get("node_key"),
                "node_key_str": node.get("node_key_str"),
                "node_id": node.get("node_id"),
                "type": node.get("type"),
                "connector_type": node.get("connector_type"),
                "connector_id": node.get("connector_id"),
                "endpoint": node.get("endpoint"),
                "asset_id": node.get("asset_id"),
                "asset_type": node.get("asset_type"),
                "gate_side": node.get("gate_side"),
                "layer": node.get("layer"),
                "polygon_id": node.get("polygon_id"),
                "zone_type": node.get("zone_type"),
                "zone_id": node.get("zone_id"),
                "zone_label": node.get("zone_label"),
                "exit_number": node.get("exit_number"),
                "poi_type": node.get("poi_type"),
                "toilet_gender": node.get("toilet_gender"),
                "label": node.get("label") or node.get("station_name") or node.get("connector_id") or node.get("asset_id"),
                "position": node.get("position"),
                "source_position": node.get("source_position"),
                "point_source": node.get("point_source"),
                "center_source": node.get("center_source"),
            }
        )
    return rows


def parse_args():
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Find a route in navigation_graph.json.")
    parser.add_argument("--input", required=True, help="navigation_graph.json path")
    parser.add_argument("--start", help="Start node_id, node_key, or node_key_str")
    parser.add_argument("--goal", help="Goal node_id, node_key, or node_key_str")
    parser.add_argument("--output", help="Optional route JSON output path")
    parser.add_argument("--list-nodes", action="store_true", help="Print node keys and exit")
    parser.add_argument("--no-synthetic-same-layer", action="store_true", help="Use only explicit graph edges")
    parser.add_argument("--synthetic-mode", choices=["all", "same-polygon"], default="same-polygon", help="How to add temporary same-layer walk edges")
    parser.add_argument("--same-layer-radius", type=float, default=None, help="Maximum synthetic walk edge distance")
    parser.add_argument("--zone-change-penalty", type=float, default=100.0, help="Penalty for non paid/free zone changes")
    parser.add_argument("--paid-free-penalty", type=float, default=1000.0, help="Penalty for paid/public zone transitions")
    parser.add_argument("--route-preference", choices=sorted(ROUTE_PREFERENCES), default="none", help="Prefer one vertical transport mode")
    return parser.parse_args()


def main():
    """Run the route CLI."""
    args = parse_args()
    graph = load_json(args.input)
    if args.list_nodes:
        for node in list_nodes(graph):
            print(
                f"{node.get('node_key_str') or node.get('node_key')}\t"
                f"{node.get('node_id')}\t"
                f"{node.get('type')}\t"
                f"{node.get('layer')}\t"
                f"{node.get('zone_type')}\t"
                f"{node.get('label') or ''}"
            )
        return
    if not args.start or not args.goal:
        raise SystemExit("--start and --goal are required unless --list-nodes is used")
    result = build_route_result(
        graph,
        args.start,
        args.goal,
        synthetic_same_layer=not args.no_synthetic_same_layer,
        synthetic_mode=args.synthetic_mode,
        same_layer_radius=args.same_layer_radius,
        zone_change_penalty=args.zone_change_penalty,
        paid_free_penalty=args.paid_free_penalty,
        route_preference=args.route_preference,
    )
    if args.output:
        save_json(result, args.output)
    print(json.dumps({
        "total_cost": result["total_cost"],
        "node_count": result["node_count"],
        "edge_count": result["edge_count"],
        "node_ids": result["node_ids"],
        "zone_sequence": result["zone_sequence"],
        "output": args.output,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
