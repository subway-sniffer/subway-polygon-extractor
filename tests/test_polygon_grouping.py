import argparse
from pathlib import Path
import sys

import cv2
import numpy as np

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.polygon_grouping import (  # noqa: E402
    build_adjacency_graph,
    build_polygon_groups,
    connected_components,
    draw_polygon_groups_debug,
    group_palette,
    group_polygons_payload,
    load_input_polygons,
    load_json,
    rgb_to_bgr,
    select_edges_for_target_groups,
    save_json,
)


def save_group_images(polygons, groups, output_dir, canvas_width, canvas_height):
    """Save one filled polygon image for each group."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    for stale_image in output_path.glob("group_*.png"):
        stale_image.unlink()
    polygon_by_id = {poly["polygon_id"]: poly for poly in polygons}
    saved_paths = []

    for group_index, group in enumerate(groups):
        canvas = np.zeros((canvas_height, canvas_width, 3), dtype=np.uint8)
        group_color = group_palette(group_index)
        contours = []
        for polygon_id in group["polygon_ids"]:
            poly = polygon_by_id[polygon_id]
            points = np.array(poly["points_transformed"], dtype=np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(canvas, [points], rgb_to_bgr(poly.get("color_rgb")))
            contours.append(points)
        if contours:
            cv2.polylines(canvas, contours, True, group_color, 2)

        x, y, w, h = group["merged_bbox"]
        cv2.rectangle(canvas, (x, y), (x + w, y + h), group_color, 4)
        cx, cy = [int(round(value)) for value in group["merged_centroid"]]
        cv2.putText(canvas, group["group_id"], (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.8, group_color, 2, cv2.LINE_AA)

        image_path = output_path / f"{group['group_id']}_filled.png"
        cv2.imwrite(str(image_path), canvas)
        saved_paths.append(image_path)

    return saved_paths


def validate_grouping_result(payload, expected_groups=None, expected_edges=None, require_contact_area_edges=False):
    """Validate grouping output for repeatable sample tests."""
    grouping = payload["grouping"]
    edges = payload["adjacency_edges"]

    if expected_groups is not None and grouping["group_count"] != expected_groups:
        raise AssertionError(f"expected groups={expected_groups}, got {grouping['group_count']}")

    if expected_edges is not None and grouping["edge_count"] != expected_edges:
        raise AssertionError(f"expected edges={expected_edges}, got {grouping['edge_count']}")

    if require_contact_area_edges:
        invalid_edges = [edge for edge in edges if "contact_area" not in edge.get("reasons", [])]
        missing_area = [edge for edge in edges if edge.get("contact_area") is None]
        if invalid_edges or missing_area:
            raise AssertionError("expected every edge to be created by contact_area and include contact_area value")


def print_contact_area_summary(edges):
    """Print contact area values for quick manual inspection."""
    contact_edges = [edge for edge in edges if edge.get("contact_area") is not None]
    if not contact_edges:
        return

    print("contact_area_edges:")
    for edge in sorted(contact_edges, key=lambda item: item["contact_area"], reverse=True):
        print(f"  {edge['a']} - {edge['b']}: contact_area={edge['contact_area']}")


def parse_args():
    """Parse test options."""
    parser = argparse.ArgumentParser(description="Test polygon grouping and save per-group images.")
    parser.add_argument("--input", default="../test_image_output/output/floor_polygons.json")
    parser.add_argument("--output", default="../test_image_output/tests/output_polygon_grouping/polygon_groups.json")
    parser.add_argument("--debug-image", default="../test_image_output/tests/output_polygon_grouping/polygon_groups.png")
    parser.add_argument("--group-image-dir", default="../test_image_output/tests/output_polygon_grouping/group_images")
    parser.add_argument("--adjacency-mode", choices=["contact_area", "distance"], default="contact_area")
    parser.add_argument("--adjacency-distance", type=float, default=25)
    parser.add_argument("--same-color-distance", type=float, default=100)
    parser.add_argument("--contact-distance", type=int, default=8)
    parser.add_argument("--min-contact-area", type=int, default=700)
    parser.add_argument("--target-groups", type=int, default=None)
    parser.add_argument("--target-layers", type=int, default=None)
    parser.add_argument("--target-group-strategy", choices=["centroid_y", "strongest_edges"], default="centroid_y")
    parser.add_argument("--canvas-width", type=int, default=1400)
    parser.add_argument("--canvas-height", type=int, default=900)
    parser.add_argument("--expected-groups", type=int, default=2)
    parser.add_argument("--expected-edges", type=int, default=9)
    parser.add_argument("--require-contact-area-edges", action="store_true", default=True)
    parser.add_argument("--no-validate", action="store_true")
    return parser.parse_args()


def main():
    """Run grouping test and save debug images."""
    args = parse_args()
    source_data = load_json(args.input)
    polygons = load_input_polygons(source_data)
    graph = build_adjacency_graph(
        polygons,
        args.adjacency_distance,
        args.same_color_distance,
        args.adjacency_mode,
        args.contact_distance,
        args.min_contact_area,
    )
    target_group_count = args.target_groups if args.target_groups is not None else args.target_layers
    graph, target_metadata = select_edges_for_target_groups(
        polygons,
        graph,
        target_group_count,
        args.target_group_strategy,
    )
    components = connected_components(graph)
    groups, polygons_with_groups = build_polygon_groups(polygons, components)
    payload = group_polygons_payload(
        source_data,
        args.input,
        polygons,
        graph,
        groups,
        polygons_with_groups,
        args,
        target_metadata,
    )
    save_json(payload, args.output)
    if not args.no_validate:
        validate_grouping_result(
            payload,
            expected_groups=args.expected_groups,
            expected_edges=args.expected_edges,
            require_contact_area_edges=args.require_contact_area_edges,
        )
    draw_polygon_groups_debug(
        polygons_with_groups,
        groups,
        args.debug_image,
        canvas_width=args.canvas_width,
        canvas_height=args.canvas_height,
    )
    group_image_paths = save_group_images(
        polygons_with_groups,
        groups,
        args.group_image_dir,
        args.canvas_width,
        args.canvas_height,
    )

    print(f"polygons={len(polygons)}, groups={len(groups)}, edges={len(graph['edges'])}")
    print_contact_area_summary(graph["edges"])
    print(f"output={args.output}")
    print(f"debug_image={args.debug_image}")
    print(f"group_images={len(group_image_paths)}")
    print(f"group_image_dir={args.group_image_dir}")


if __name__ == "__main__":
    main()
