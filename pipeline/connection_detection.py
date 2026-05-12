from itertools import combinations
from pathlib import Path

import cv2
import numpy as np

try:
    from pipeline.export_json import to_python_list
    from pipeline.mask_bridge import combine_masks_by_ids, find_mask_components
    from pipeline.polygon_grouping import (
        SEMANTIC_EMPTY,
        bbox_gap,
        flatten_polygon_points,
        color_center_to_rgb,
        polygon_area,
        polygon_bbox,
        polygon_centroid,
        polygon_min_distance,
        save_json,
    )
except ModuleNotFoundError:
    from export_json import to_python_list
    from mask_bridge import combine_masks_by_ids, find_mask_components
    from polygon_grouping import (
        SEMANTIC_EMPTY,
        bbox_gap,
        flatten_polygon_points,
        color_center_to_rgb,
        polygon_area,
        polygon_bbox,
        polygon_centroid,
        polygon_min_distance,
        save_json,
    )


CONNECTION_SEMANTIC_EMPTY = {
    "layer_from": None,
    "layer_to": None,
    "connection_type": None,
    "label": None,
    "confidence": None,
}


def contour_to_points(contour):
    """Convert an OpenCV contour to [[x, y], ...]."""
    return [[float(point[0][0]), float(point[0][1])] for point in contour]


def transform_points(points, matrix, shift=(0.0, 0.0)):
    """Transform point coordinates with perspective matrix and canvas shift."""
    arr = np.array(points, dtype=np.float32).reshape((-1, 1, 2))
    transformed = cv2.perspectiveTransform(arr, matrix).reshape((-1, 2))
    transformed[:, 0] += float(shift[0])
    transformed[:, 1] += float(shift[1])
    return [[float(x), float(y)] for x, y in transformed]


def points_bbox(points):
    """Return [x, y, w, h] for a point list."""
    arr = np.array(points, dtype=np.float32)
    x_min = float(np.min(arr[:, 0]))
    y_min = float(np.min(arr[:, 1]))
    x_max = float(np.max(arr[:, 0]))
    y_max = float(np.max(arr[:, 1]))
    return [int(round(x_min)), int(round(y_min)), int(round(x_max - x_min)), int(round(y_max - y_min))]


def points_centroid(points):
    """Return centroid for a point list."""
    arr = np.array(points, dtype=np.float32)
    return [float(np.mean(arr[:, 0])), float(np.mean(arr[:, 1]))]


def normalize_polygon_points(points):
    """Normalize JSON-style or OpenCV-style polygon points into [[x, y], ...]."""
    arr = np.array(points, dtype=np.float32).reshape((-1, 2))
    return [[float(x), float(y)] for x, y in arr]


def color_groups_to_polygons(color_groups):
    """Convert in-memory color groups into intermediate polygon records."""
    polygons = []
    polygon_index = 1
    for group in color_groups:
        color_cluster = group.get("cluster_id")
        color_rgb = color_center_to_rgb(group)
        for cluster_polygon_index, points in enumerate(group.get("polygons", []), start=1):
            flat_points = normalize_polygon_points(points)
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


def component_to_bridge_record(component, matrix, shift):
    """Convert one source-image bridge component into transformed canvas geometry."""
    component_mask = component["mask"]
    contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    contour = max(contours, key=cv2.contourArea)
    epsilon = 0.01 * cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, epsilon, True)
    source_points = contour_to_points(approx)
    transformed_points = transform_points(source_points, matrix, shift=shift)
    return {
        "bridge_component_id": int(component["component_id"]),
        "area_source": int(component["area"]),
        "bbox_source": [int(value) for value in component["bbox"]],
        "points_source": source_points,
        "centroid_source": points_centroid(source_points),
        "points_transformed": transformed_points,
        "bbox_transformed": points_bbox(transformed_points),
        "centroid_transformed": points_centroid(transformed_points),
    }


def polygon_distance_to_bridge(poly, bridge):
    """Return outline distance between a polygon and a bridge component polygon."""
    return polygon_min_distance(poly["points_transformed"], bridge["points_transformed"])


def find_nearby_polygons(polygons, bridge, search_distance=80, max_nearby=6):
    """Find polygons near one transformed bridge component."""
    nearby = []
    for poly in polygons:
        bbox_distance = bbox_gap(poly["bbox_transformed"], bridge["bbox_transformed"])
        if bbox_distance > search_distance:
            continue
        outline_distance = polygon_distance_to_bridge(poly, bridge)
        if outline_distance > search_distance:
            continue
        centroid = np.array(poly["centroid_transformed"], dtype=np.float32)
        bridge_centroid = np.array(bridge["centroid_transformed"], dtype=np.float32)
        centroid_distance = float(np.linalg.norm(centroid - bridge_centroid))
        nearby.append(
            {
                "polygon_id": poly["polygon_id"],
                "color_cluster": poly.get("color_cluster"),
                "color_rgb": poly.get("color_rgb"),
                "bbox_distance": float(bbox_distance),
                "outline_distance": float(outline_distance),
                "centroid_distance": centroid_distance,
                "area": float(poly.get("area", 0.0)),
            }
        )

    nearby.sort(key=lambda item: (item["outline_distance"], item["centroid_distance"]))
    return nearby[:max_nearby]


def build_candidate_pairs(nearby_polygons, search_distance=80):
    """Build polygon pair candidates around one bridge component."""
    pairs = []
    for first, second in combinations(nearby_polygons, 2):
        distance = max(first["outline_distance"], second["outline_distance"])
        proximity = max(0.0, 1.0 - (distance / max(1.0, float(search_distance))))
        different_color_bonus = 0.1 if first["color_cluster"] != second["color_cluster"] else 0.0
        confidence = min(1.0, proximity + different_color_bonus)
        pairs.append(
            {
                "polygon_ids": [first["polygon_id"], second["polygon_id"]],
                "color_clusters": [first["color_cluster"], second["color_cluster"]],
                "distance": round(float(distance), 2),
                "confidence": round(float(confidence), 3),
            }
        )
    pairs.sort(key=lambda item: (-item["confidence"], item["distance"]))
    return pairs


def build_connections(polygons, bridge_records, bridge_cluster_ids, search_distance=80, max_nearby=6):
    """Build semantic connection candidates from bridge components and nearby polygons."""
    connections = []
    for bridge in bridge_records:
        nearby = find_nearby_polygons(
            polygons,
            bridge,
            search_distance=search_distance,
            max_nearby=max_nearby,
        )
        if len(nearby) < 2:
            continue

        pairs = build_candidate_pairs(nearby, search_distance=search_distance)
        connections.append(
            {
                "connection_id": f"conn_{len(connections) + 1:03d}",
                "type": "bridge_candidate",
                "bridge_clusters": bridge_cluster_ids,
                "bridge_component_id": bridge["bridge_component_id"],
                "bbox_source": bridge["bbox_source"],
                "centroid_source": bridge["centroid_source"],
                "points_source": bridge["points_source"],
                "bbox_transformed": bridge["bbox_transformed"],
                "centroid_transformed": bridge["centroid_transformed"],
                "points_transformed": bridge["points_transformed"],
                "near_polygon_ids": [item["polygon_id"] for item in nearby],
                "nearby_polygons": nearby,
                "candidate_pairs": pairs,
                "nearby_texts": [],
                "semantic": dict(CONNECTION_SEMANTIC_EMPTY),
            }
        )
    return connections


def build_connections_payload(source_image, extraction, polygons, connections, args):
    """Build serializable connection detection payload."""
    return {
        "source_image": source_image,
        "extraction": extraction,
        "connection_detection": {
            "bridge_clusters": args.get("bridge_cluster_ids"),
            "search_distance": args.get("search_distance"),
            "max_nearby": args.get("max_nearby"),
            "min_component_area": args.get("min_component_area"),
        },
        "polygons": polygons,
        "connections": connections,
    }


def draw_connection_debug(polygons, connections, output_path, canvas_width=1400, canvas_height=900):
    """Draw polygons and bridge connection candidates on a debug canvas."""
    canvas = np.full((canvas_height, canvas_width, 3), 245, dtype=np.uint8)
    polygon_lookup = {poly["polygon_id"]: poly for poly in polygons}

    for poly in polygons:
        points = np.array(flatten_polygon_points(poly["points_transformed"]), dtype=np.int32).reshape((-1, 1, 2))
        rgb = poly.get("color_rgb") or [180, 180, 180]
        bgr = (int(rgb[2]), int(rgb[1]), int(rgb[0]))
        cv2.fillPoly(canvas, [points], bgr)
        cv2.polylines(canvas, [points], True, (40, 40, 40), 1)
        cx, cy = poly["centroid_transformed"]
        cv2.putText(canvas, poly["polygon_id"], (int(cx), int(cy)), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (30, 30, 30), 1)

    for connection in connections:
        bridge_points = np.array(connection["points_transformed"], dtype=np.int32).reshape((-1, 1, 2))
        cv2.polylines(canvas, [bridge_points], True, (0, 0, 255), 3)
        x, y, w, h = connection["bbox_transformed"]
        cv2.rectangle(canvas, (x, y), (x + w, y + h), (0, 120, 255), 2)
        cx, cy = connection["centroid_transformed"]
        cv2.circle(canvas, (int(cx), int(cy)), 4, (0, 0, 255), -1)
        cv2.putText(canvas, connection["connection_id"], (int(cx) + 5, int(cy) - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 180), 2)

        for polygon_id in connection["near_polygon_ids"]:
            poly = polygon_lookup.get(polygon_id)
            if poly is None:
                continue
            pcx, pcy = poly["centroid_transformed"]
            cv2.line(canvas, (int(cx), int(cy)), (int(pcx), int(pcy)), (255, 0, 120), 1)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), canvas)
    return output_path


def detect_connections_from_pipeline_result(
    source_image,
    extraction_metadata,
    color_groups,
    cluster_result,
    bridge_cluster_ids,
    matrix,
    shift,
    output_path,
    debug_image_path=None,
    search_distance=80,
    max_nearby=6,
    min_component_area=20,
    canvas_width=1400,
    canvas_height=900,
):
    """Detect bridge connection candidates from in-memory pipeline outputs."""
    polygons = color_groups_to_polygons(color_groups)
    bridge_mask = combine_masks_by_ids(cluster_result["clusters"], bridge_cluster_ids)
    components = find_mask_components(bridge_mask, min_area=min_component_area)
    bridge_records = []
    for component in components:
        bridge_record = component_to_bridge_record(component, matrix, shift)
        if bridge_record is not None:
            bridge_records.append(bridge_record)

    connections = build_connections(
        polygons,
        bridge_records,
        bridge_cluster_ids,
        search_distance=search_distance,
        max_nearby=max_nearby,
    )
    payload = build_connections_payload(
        source_image,
        extraction_metadata,
        polygons,
        connections,
        {
            "bridge_cluster_ids": bridge_cluster_ids,
            "search_distance": search_distance,
            "max_nearby": max_nearby,
            "min_component_area": min_component_area,
        },
    )
    output_file = save_json(to_python_list(payload), output_path)
    debug_file = None
    if debug_image_path:
        debug_file = draw_connection_debug(
            polygons,
            connections,
            debug_image_path,
            canvas_width=canvas_width,
            canvas_height=canvas_height,
        )
    return {
        "output_file": output_file,
        "debug_image": debug_file,
        "connection_count": len(connections),
        "component_count": len(bridge_records),
    }
