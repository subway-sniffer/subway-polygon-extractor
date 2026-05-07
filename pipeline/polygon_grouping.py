import argparse
import json
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np

try:
    from pipeline.export_json import to_python_list
except ModuleNotFoundError:
    from export_json import to_python_list


SEMANTIC_EMPTY = {
    "layer": None,
    "line": None,
    "zone_type": None,
    "label": None,
    "confidence": None,
}


def load_json(path):
    """Load JSON data from disk."""
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(data, path):
    """Save JSON data to disk."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(to_python_list(data), file, ensure_ascii=False, indent=2)
    return output_path


def flatten_point(point):
    """Normalize OpenCV point shapes such as [[x, y]] into [x, y]."""
    while isinstance(point, list) and len(point) == 1 and isinstance(point[0], list):
        point = point[0]
    return [float(point[0]), float(point[1])]


def flatten_polygon_points(points):
    """Normalize polygon points into a list of [x, y] pairs."""
    return [flatten_point(point) for point in points]


def color_center_to_rgb(group):
    """Convert a color group center to RGB."""
    center = group.get("center")
    if center is None:
        return group.get("color_rgb", [180, 180, 180])

    color_space = group.get("color_space", "lab").lower()
    center_array = np.array(center, dtype=np.uint8).reshape((1, 1, 3))
    if color_space == "lab":
        bgr = cv2.cvtColor(center_array, cv2.COLOR_LAB2BGR)[0, 0]
    elif color_space == "hsv":
        bgr = cv2.cvtColor(center_array, cv2.COLOR_HSV2BGR)[0, 0]
    elif color_space == "bgr":
        bgr = center_array[0, 0]
    else:
        bgr = np.array([180, 180, 180], dtype=np.uint8)
    return [int(bgr[2]), int(bgr[1]), int(bgr[0])]


def polygon_area(points):
    """Calculate polygon area."""
    contour = np.array(points, dtype=np.float32)
    return float(abs(cv2.contourArea(contour)))


def polygon_bbox(points):
    """Calculate [x, y, w, h] bbox for polygon points."""
    contour = np.array(points, dtype=np.float32)
    x, y, w, h = cv2.boundingRect(contour)
    return [int(x), int(y), int(w), int(h)]


def polygon_centroid(points):
    """Calculate polygon centroid."""
    contour = np.array(points, dtype=np.float32)
    moments = cv2.moments(contour)
    if moments["m00"] != 0:
        return [float(moments["m10"] / moments["m00"]), float(moments["m01"] / moments["m00"])]
    arr = np.array(points, dtype=np.float32)
    return [float(np.mean(arr[:, 0])), float(np.mean(arr[:, 1]))]


def floor_polygons_to_intermediate(data):
    """Convert floor_polygons.json color_groups into flat intermediate polygon records."""
    polygons = []
    polygon_index = 1
    for group in data.get("color_groups", []):
        color_cluster = group.get("cluster_id")
        color_rgb = color_center_to_rgb(group)
        for cluster_polygon_index, points in enumerate(group.get("polygons", []), start=1):
            flat_points = flatten_polygon_points(points)
            polygons.append(
                {
                    "polygon_id": f"poly_{polygon_index:03d}",
                    "source": {
                        "type": group.get("type", "unknown"),
                        "cluster_id": color_cluster,
                        "cluster_polygon_index": cluster_polygon_index,
                    },
                    "color_cluster": color_cluster,
                    "color_rgb": color_rgb,
                    "area": polygon_area(flat_points),
                    "bbox_transformed": polygon_bbox(flat_points),
                    "centroid_transformed": polygon_centroid(flat_points),
                    "points_transformed": flat_points,
                    "semantic": dict(SEMANTIC_EMPTY),
                }
            )
            polygon_index += 1
    return polygons


def load_input_polygons(data):
    """Load either intermediate_polygons.json or floor_polygons.json style input."""
    if "color_groups" in data:
        return floor_polygons_to_intermediate(data)
    return data.get("polygons", data if isinstance(data, list) else [])


def bbox_to_xyxy(bbox):
    """Convert [x, y, w, h] to [x1, y1, x2, y2]."""
    x, y, w, h = bbox
    return float(x), float(y), float(x + w), float(y + h)


def bbox_gap(bbox_a, bbox_b):
    """Return Euclidean gap between two [x, y, w, h] boxes, or 0 when overlapping."""
    ax1, ay1, ax2, ay2 = bbox_to_xyxy(bbox_a)
    bx1, by1, bx2, by2 = bbox_to_xyxy(bbox_b)

    dx = max(bx1 - ax2, ax1 - bx2, 0)
    dy = max(by1 - ay2, ay1 - by2, 0)
    return float(np.hypot(dx, dy))


def bbox_overlaps_or_close(bbox_a, bbox_b, max_gap):
    """Return whether two bboxes overlap or are within max_gap."""
    return bbox_gap(bbox_a, bbox_b) <= max_gap


def point_in_bbox(point, bbox):
    """Return whether a point is inside [x, y, w, h]."""
    x, y = point
    bx, by, bw, bh = bbox
    return bx <= x <= bx + bw and by <= y <= by + bh


def point_segment_distance(point, seg_a, seg_b):
    """Return distance between a point and a segment."""
    p = np.array(point, dtype=np.float64)
    a = np.array(seg_a, dtype=np.float64)
    b = np.array(seg_b, dtype=np.float64)
    ab = b - a
    denom = float(np.dot(ab, ab))
    if denom == 0:
        return float(np.linalg.norm(p - a))
    t = max(0.0, min(1.0, float(np.dot(p - a, ab) / denom)))
    projection = a + (t * ab)
    return float(np.linalg.norm(p - projection))


def ccw(a, b, c):
    """Return orientation sign for three points."""
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])


def segments_intersect(a, b, c, d):
    """Return whether two line segments intersect."""
    return ccw(a, c, d) != ccw(b, c, d) and ccw(a, b, c) != ccw(a, b, d)


def polygon_segments(points):
    """Yield closed polygon segments."""
    for index, point in enumerate(points):
        yield point, points[(index + 1) % len(points)]


def polygon_min_distance(points_a, points_b):
    """Return minimum distance between two polygon outlines."""
    points_a = flatten_polygon_points(points_a)
    points_b = flatten_polygon_points(points_b)

    contour_a = np.array(points_a, dtype=np.float32)
    contour_b = np.array(points_b, dtype=np.float32)
    for point in points_a:
        if cv2.pointPolygonTest(contour_b, tuple(point), False) >= 0:
            return 0.0
    for point in points_b:
        if cv2.pointPolygonTest(contour_a, tuple(point), False) >= 0:
            return 0.0

    min_distance = float("inf")
    for a1, a2 in polygon_segments(points_a):
        for b1, b2 in polygon_segments(points_b):
            if segments_intersect(a1, a2, b1, b2):
                return 0.0
            min_distance = min(
                min_distance,
                point_segment_distance(a1, b1, b2),
                point_segment_distance(a2, b1, b2),
                point_segment_distance(b1, a1, a2),
                point_segment_distance(b2, a1, a2),
            )
    return float(min_distance)


def centroid_distance(poly_a, poly_b):
    """Return centroid distance between two polygon records."""
    a = np.array(poly_a["centroid_transformed"], dtype=np.float64)
    b = np.array(poly_b["centroid_transformed"], dtype=np.float64)
    return float(np.linalg.norm(a - b))


def adjacency_details(poly_a, poly_b, adjacency_distance, same_color_distance):
    """Return adjacency decision details for a polygon pair."""
    gap = bbox_gap(poly_a["bbox_transformed"], poly_b["bbox_transformed"])
    centroid_dist = centroid_distance(poly_a, poly_b)
    reasons = []
    polygon_distance = None

    if gap <= adjacency_distance:
        reasons.append("bbox_close")

    if point_in_bbox(poly_a["centroid_transformed"], poly_b["bbox_transformed"]) or point_in_bbox(
        poly_b["centroid_transformed"],
        poly_a["bbox_transformed"],
    ):
        reasons.append("centroid_inside_bbox")

    if gap <= max(adjacency_distance, same_color_distance):
        polygon_distance = polygon_min_distance(poly_a["points_transformed"], poly_b["points_transformed"])
        if polygon_distance <= adjacency_distance:
            reasons.append("polygon_distance")

    if (
        poly_a.get("color_cluster") == poly_b.get("color_cluster")
        and centroid_dist <= same_color_distance
        and gap <= same_color_distance
    ):
        reasons.append("same_color_centroid")

    return {
        "adjacent": bool(reasons),
        "reasons": reasons,
        "bbox_gap": gap,
        "polygon_distance": polygon_distance,
        "centroid_distance": centroid_dist,
    }


def are_polygons_adjacent(poly_a, poly_b, adjacency_distance, same_color_distance):
    """Return whether two polygon records are adjacent."""
    return adjacency_details(poly_a, poly_b, adjacency_distance, same_color_distance)["adjacent"]


def build_adjacency_graph(polygons, adjacency_distance, same_color_distance):
    """Build an adjacency graph from polygon records."""
    adjacency = {poly["polygon_id"]: set() for poly in polygons}
    edges = []
    for i, poly_a in enumerate(polygons):
        for poly_b in polygons[i + 1:]:
            details = adjacency_details(poly_a, poly_b, adjacency_distance, same_color_distance)
            if not details["adjacent"]:
                continue
            a_id = poly_a["polygon_id"]
            b_id = poly_b["polygon_id"]
            adjacency[a_id].add(b_id)
            adjacency[b_id].add(a_id)
            edges.append(
                {
                    "a": a_id,
                    "b": b_id,
                    "reasons": details["reasons"],
                    "bbox_gap": details["bbox_gap"],
                    "polygon_distance": details["polygon_distance"],
                    "centroid_distance": details["centroid_distance"],
                }
            )
    return {"adjacency": adjacency, "edges": edges}


def edge_merge_score(edge):
    """Return a lower-is-stronger merge score for an adjacency edge."""
    bbox_gap_value = float(edge.get("bbox_gap", 0) or 0)
    polygon_distance = edge.get("polygon_distance")
    polygon_distance_value = float(polygon_distance) if polygon_distance is not None else bbox_gap_value
    centroid_distance_value = float(edge.get("centroid_distance", 0) or 0)
    reasons = set(edge.get("reasons", []))

    score = min(bbox_gap_value, polygon_distance_value) + (centroid_distance_value * 0.01)
    if "same_color_centroid" in reasons:
        score -= 10.0
    if "centroid_inside_bbox" in reasons:
        score -= 3.0
    return score


def graph_from_edges(polygons, edges):
    """Build a graph from a selected edge list."""
    adjacency = {poly["polygon_id"]: set() for poly in polygons}
    for edge in edges:
        adjacency[edge["a"]].add(edge["b"])
        adjacency[edge["b"]].add(edge["a"])
    return {"adjacency": adjacency, "edges": edges}


def centroid_y_bands(polygons, target_groups):
    """Assign polygons into target_groups bands by transformed centroid y."""
    if not target_groups or target_groups <= 0:
        return {}
    target_groups = min(int(target_groups), len(polygons))
    samples = np.array([[float(poly["centroid_transformed"][1])] for poly in polygons], dtype=np.float32)
    if target_groups == 1:
        labels = np.zeros((len(polygons),), dtype=np.int32)
        centers = np.array([[float(np.mean(samples[:, 0]))]], dtype=np.float32)
    else:
        cv2.setRNGSeed(12345)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 0.01)
        _, labels, centers = cv2.kmeans(samples, target_groups, None, criteria, 10, cv2.KMEANS_PP_CENTERS)
        labels = labels.reshape((-1,))

    sorted_center_indices = [index for index, _ in sorted(enumerate(centers[:, 0]), key=lambda item: item[1])]
    remap = {old_index: new_index + 1 for new_index, old_index in enumerate(sorted_center_indices)}
    return {poly["polygon_id"]: remap[int(labels[index])] for index, poly in enumerate(polygons)}


def select_edges_by_centroid_y_bands(polygons, graph, target_groups):
    """Keep only edges whose endpoints belong to the same centroid-y target band."""
    band_by_polygon = centroid_y_bands(polygons, target_groups)
    selected_edges = []
    for edge in graph["edges"]:
        if band_by_polygon.get(edge["a"]) != band_by_polygon.get(edge["b"]):
            continue
        edge_with_band = dict(edge)
        edge_with_band["target_band"] = band_by_polygon.get(edge["a"])
        edge_with_band["merge_score"] = edge_merge_score(edge)
        selected_edges.append(edge_with_band)
    target_graph = graph_from_edges(polygons, selected_edges)
    achieved_group_count = len(connected_components(target_graph))
    return target_graph, {
        "enabled": True,
        "requested_group_count": int(target_groups),
        "achieved_group_count": achieved_group_count,
        "selected_edge_count": len(selected_edges),
        "candidate_edge_count": len(graph["edges"]),
        "edge_selection": "centroid_y_bands",
        "polygon_bands": band_by_polygon,
    }


def select_edges_for_target_groups(polygons, graph, target_groups, strategy="centroid_y"):
    """Select strongest adjacency edges until the graph reaches target group count."""
    if not target_groups or target_groups <= 0:
        return graph, {
            "enabled": False,
            "requested_group_count": None,
            "achieved_group_count": len(connected_components(graph)),
            "selected_edge_count": len(graph["edges"]),
            "candidate_edge_count": len(graph["edges"]),
        }

    target_groups = min(int(target_groups), len(polygons))
    if strategy == "centroid_y":
        target_graph, metadata = select_edges_by_centroid_y_bands(polygons, graph, target_groups)
        if metadata["achieved_group_count"] == target_groups:
            return target_graph, metadata

    parent = {poly["polygon_id"]: poly["polygon_id"] for poly in polygons}
    component_count = len(polygons)
    selected_edges = []

    def find(node):
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(a, b):
        nonlocal component_count
        root_a = find(a)
        root_b = find(b)
        if root_a == root_b:
            return False
        parent[root_b] = root_a
        component_count -= 1
        return True

    sorted_edges = sorted(graph["edges"], key=edge_merge_score)
    for edge in sorted_edges:
        if component_count <= target_groups:
            break
        if union(edge["a"], edge["b"]):
            edge_with_score = dict(edge)
            edge_with_score["merge_score"] = edge_merge_score(edge)
            selected_edges.append(edge_with_score)

    target_graph = graph_from_edges(polygons, selected_edges)
    achieved_group_count = len(connected_components(target_graph))
    return target_graph, {
        "enabled": True,
        "requested_group_count": int(target_groups),
        "achieved_group_count": achieved_group_count,
        "selected_edge_count": len(selected_edges),
        "candidate_edge_count": len(graph["edges"]),
        "edge_selection": "strongest_edges_until_target_connected_components",
        "fallback_from": strategy if strategy != "strongest_edges" else None,
    }


def connected_components(graph):
    """Return connected components from an adjacency graph."""
    adjacency = graph["adjacency"] if "adjacency" in graph else graph
    visited = set()
    components = []
    for node in adjacency:
        if node in visited:
            continue
        stack = [node]
        component = []
        visited.add(node)
        while stack:
            current = stack.pop()
            component.append(current)
            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    stack.append(neighbor)
        components.append(sorted(component))
    return components


def merged_bbox(polygons):
    """Return merged [x, y, w, h] for polygon records."""
    boxes = [bbox_to_xyxy(poly["bbox_transformed"]) for poly in polygons]
    x1 = min(box[0] for box in boxes)
    y1 = min(box[1] for box in boxes)
    x2 = max(box[2] for box in boxes)
    y2 = max(box[3] for box in boxes)
    return [int(round(x1)), int(round(y1)), int(round(x2 - x1)), int(round(y2 - y1))]


def merged_centroid(polygons):
    """Return area-weighted centroid for polygon records."""
    total_area = sum(float(poly.get("area", 0)) for poly in polygons)
    if total_area <= 0:
        centers = np.array([poly["centroid_transformed"] for poly in polygons], dtype=np.float64)
        return [float(np.mean(centers[:, 0])), float(np.mean(centers[:, 1]))]
    cx = sum(float(poly.get("area", 0)) * poly["centroid_transformed"][0] for poly in polygons) / total_area
    cy = sum(float(poly.get("area", 0)) * poly["centroid_transformed"][1] for poly in polygons) / total_area
    return [float(cx), float(cy)]


def dominant_color(polygons):
    """Return dominant color cluster and RGB by total polygon area."""
    areas = defaultdict(float)
    rgbs = {}
    for poly in polygons:
        cluster = poly.get("color_cluster")
        areas[cluster] += float(poly.get("area", 0))
        rgbs[cluster] = poly.get("color_rgb")
    cluster = max(areas, key=areas.get)
    return cluster, rgbs.get(cluster)


def build_polygon_groups(polygons, components):
    """Build semantic candidate groups from connected components."""
    by_id = {poly["polygon_id"]: poly for poly in polygons}
    groups = []
    polygons_with_groups = []
    group_by_polygon_id = {}

    for index, component in enumerate(components, start=1):
        group_id = f"group_{index:03d}"
        component_polygons = [by_id[polygon_id] for polygon_id in component]
        dominant_cluster, dominant_rgb = dominant_color(component_polygons)
        group = {
            "group_id": group_id,
            "polygon_ids": component,
            "polygon_count": len(component),
            "grouping_method": "adjacency_connected_components",
            "merged_bbox": merged_bbox(component_polygons),
            "merged_centroid": merged_centroid(component_polygons),
            "total_area": sum(float(poly.get("area", 0)) for poly in component_polygons),
            "dominant_color_cluster": dominant_cluster,
            "dominant_color_rgb": dominant_rgb,
            "nearby_texts": [],
            "semantic": dict(SEMANTIC_EMPTY),
        }
        groups.append(group)
        for polygon_id in component:
            group_by_polygon_id[polygon_id] = group_id

    for poly in polygons:
        updated = dict(poly)
        updated["group_id"] = group_by_polygon_id.get(poly["polygon_id"])
        polygons_with_groups.append(updated)

    return groups, polygons_with_groups


def group_palette(index):
    """Return a stable BGR color for a group index."""
    palette = [
        (80, 160, 255),
        (120, 220, 120),
        (220, 160, 120),
        (200, 120, 220),
        (120, 220, 220),
        (220, 220, 120),
        (180, 180, 255),
        (160, 255, 180),
    ]
    return palette[index % len(palette)]


def rgb_to_bgr(color_rgb):
    """Convert an RGB color list to a BGR tuple."""
    if not color_rgb:
        return (180, 180, 180)
    return tuple(int(value) for value in color_rgb[:3][::-1])


def draw_polygon_groups_debug(polygons, groups, output_path, canvas_width=1400, canvas_height=900):
    """Draw grouped polygons filled with their original colors."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas = np.zeros((canvas_height, canvas_width, 3), dtype=np.uint8)
    polygon_by_id = {poly["polygon_id"]: poly for poly in polygons}

    for group_index, group in enumerate(groups):
        group_color = group_palette(group_index)
        for polygon_id in group["polygon_ids"]:
            poly = polygon_by_id[polygon_id]
            points = np.array(poly["points_transformed"], dtype=np.int32).reshape((-1, 1, 2))
            fill_color = rgb_to_bgr(poly.get("color_rgb"))
            cv2.fillPoly(canvas, [points], fill_color)
            cv2.polylines(canvas, [points], True, group_color, 2)
            centroid = tuple(int(round(v)) for v in poly["centroid_transformed"])
            cv2.putText(canvas, polygon_id, centroid, cv2.FONT_HERSHEY_SIMPLEX, 0.35, group_color, 1, cv2.LINE_AA)

        x, y, w, h = group["merged_bbox"]
        cv2.rectangle(canvas, (x, y), (x + w, y + h), group_color, 4)
        cx, cy = [int(round(v)) for v in group["merged_centroid"]]
        cv2.putText(canvas, group["group_id"], (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.65, group_color, 2, cv2.LINE_AA)

    cv2.imwrite(str(output_path), canvas)
    return output_path


def group_polygons_payload(source_data, source_file, polygons, graph, groups, polygons_with_groups, args, target_metadata=None):
    """Build polygon grouping JSON payload."""
    if target_metadata is None:
        target_metadata = {}
    return {
        "source_file": str(source_file),
        "source_image": source_data.get("source_image"),
        "coordinate_space": "transformed_auto_centered",
        "grouping": {
            "method": "adjacency_connected_components",
            "adjacency_distance": args.adjacency_distance,
            "same_color_distance": args.same_color_distance,
            "input_polygon_count": len(polygons),
            "group_count": len(groups),
            "edge_count": len(graph["edges"]),
            "target_grouping": target_metadata,
        },
        "groups": groups,
        "polygons": polygons_with_groups,
        "adjacency_edges": graph["edges"],
    }


def parse_args():
    """Parse command-line options."""
    parser = argparse.ArgumentParser(description="Group adjacent transformed polygons into semantic candidates.")
    parser.add_argument("--input", default="../test_image_output/output/floor_polygons.json")
    parser.add_argument("--output", default="../test_image_output/output/polygon_groups.json")
    parser.add_argument("--debug-image", default="../test_image_output/output/debug/polygon_groups.png")
    parser.add_argument("--adjacency-distance", type=float, default=25)
    parser.add_argument("--same-color-distance", type=float, default=100)
    parser.add_argument("--target-groups", type=int, default=None)
    parser.add_argument("--target-layers", type=int, default=None)
    parser.add_argument("--target-group-strategy", choices=["centroid_y", "strongest_edges"], default="centroid_y")
    parser.add_argument("--canvas-width", type=int, default=1400)
    parser.add_argument("--canvas-height", type=int, default=900)
    return parser.parse_args()


def main():
    """Run polygon grouping from CLI."""
    args = parse_args()
    source_file = Path(args.input)
    source_data = load_json(source_file)
    polygons = load_input_polygons(source_data)
    graph = build_adjacency_graph(polygons, args.adjacency_distance, args.same_color_distance)
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
        source_file,
        polygons,
        graph,
        groups,
        polygons_with_groups,
        args,
        target_metadata,
    )
    output_path = save_json(payload, args.output)
    debug_path = draw_polygon_groups_debug(
        polygons_with_groups,
        groups,
        args.debug_image,
        canvas_width=args.canvas_width,
        canvas_height=args.canvas_height,
    )
    print(f"polygons={len(polygons)}, groups={len(groups)}, edges={len(graph['edges'])}")
    print(f"output={output_path}")
    print(f"debug_image={debug_path}")


if __name__ == "__main__":
    main()
