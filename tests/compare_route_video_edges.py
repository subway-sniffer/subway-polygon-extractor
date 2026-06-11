"""Build current route-video edges and export only edges missing from a previous file."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.navigation_routing import load_json, save_json
from pipeline.route_edge_planner import build_route_edge_export


def edge_ids(payload):
    """Return edge ids from a route_video_edges payload."""
    return {
        str(edge.get("edge_id"))
        for edge in payload.get("edges", [])
        if edge.get("edge_id")
    }


def parse_csv(value):
    """Parse a comma-separated option into a clean string list."""
    return [item.strip() for item in str(value or "").split(",") if item.strip()]


def build_missing_payload(current_payload, previous_payload, include_non_video=False):
    """Return current edge records that do not exist in previous edge ids."""
    previous_ids = edge_ids(previous_payload)
    missing_edges = []
    skipped_non_video = []
    for edge in current_payload.get("edges", []):
        edge_id = edge.get("edge_id")
        if not edge_id or edge_id in previous_ids:
            continue
        if edge.get("video_required") is False and not include_non_video:
            skipped_non_video.append(edge)
            continue
        missing_edges.append(edge)

    return {
        "metadata": {
            "format": "missing_route_video_edges",
            "comparison": "current_minus_previous_edge_id",
            "previous_edge_count": len(previous_ids),
            "current_metadata": current_payload.get("metadata", {}),
            "include_non_video": include_non_video,
        },
        "counts": {
            "previous_edge_count": len(previous_ids),
            "current_edge_count": len(current_payload.get("edges", [])),
            "missing_edge_count": len(missing_edges),
            "skipped_non_video_edge_count": len(skipped_non_video),
        },
        "edges": missing_edges,
        "skipped_non_video_edges": skipped_non_video,
    }


def parse_args():
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Compare route_video_edges JSON and export new edges only.")
    parser.add_argument("--navigation-graph", help="Current navigation_graph JSON path")
    parser.add_argument("--current-route-edges", help="Current route_video_edges JSON path. If set, no graph rebuild is run.")
    parser.add_argument("--previous", required=True, help="Previous route_video_edges JSON path")
    parser.add_argument("--output", required=True, help="Output JSON path for missing route-video edges")
    parser.add_argument("--station-name", default=None, help="Station name used in video titles")
    parser.add_argument("--route-preferences", default="none,elevator", help="Comma-separated preferences to build")
    parser.add_argument("--toilet-genders", default="male,female", help="Comma-separated toilet route variants")
    parser.add_argument("--no-toilet-routes", action="store_true", help="Do not include toilet waypoint routes")
    parser.add_argument("--no-platform-platform", action="store_true", help="Do not include platform-platform OD routes")
    parser.add_argument("--include-same-platform", action="store_true", help="Include same-platform car OD pairs")
    parser.add_argument("--include-same-line-platform", action="store_true", help="Include same-line platform OD pairs")
    parser.add_argument("--include-unnumbered-exits", action="store_true", help="Include exits without exit_number")
    parser.add_argument("--include-non-video", action="store_true", help="Keep non-video edges such as elevator transfer edges")
    parser.add_argument("--synthetic-mode", choices=["same-polygon", "all"], default="same-polygon")
    parser.add_argument("--same-layer-radius", type=float, default=None)
    parser.add_argument("--zone-change-penalty", type=float, default=100.0)
    parser.add_argument("--paid-free-penalty", type=float, default=1000.0)
    return parser.parse_args()


def main():
    """Run the comparison."""
    args = parse_args()
    previous_payload = load_json(args.previous)
    if args.current_route_edges:
        current_payload = load_json(args.current_route_edges)
    else:
        if not args.navigation_graph:
            raise SystemExit("--navigation-graph is required unless --current-route-edges is set")
        navigation_graph = load_json(args.navigation_graph)
        current_payload = build_route_edge_export(
            navigation_graph,
            station_name=args.station_name,
            include_platform_platform=not args.no_platform_platform,
            include_same_platform=args.include_same_platform,
            include_same_line_platform=args.include_same_line_platform,
            include_unnumbered_exits=args.include_unnumbered_exits,
            include_toilet_routes=not args.no_toilet_routes,
            toilet_genders=parse_csv(args.toilet_genders),
            directed=True,
            synthetic_mode=args.synthetic_mode,
            same_layer_radius=args.same_layer_radius,
            zone_change_penalty=args.zone_change_penalty,
            paid_free_penalty=args.paid_free_penalty,
            route_preference=parse_csv(args.route_preferences),
        )
    missing_payload = build_missing_payload(
        current_payload,
        previous_payload,
        include_non_video=args.include_non_video,
    )
    save_json(missing_payload, args.output)
    print(json.dumps({"output": args.output, **missing_payload["counts"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
