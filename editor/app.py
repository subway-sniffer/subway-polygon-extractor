import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request, send_file


DEFAULT_SEMANTIC = {
    "layer": None,
    "line": None,
    "zone_type": None,
    "label": None,
    "confidence": None,
}

DEFAULT_LAYER_Z = {
    "B1": 0.0,
    "B2": -1.0,
    "B3": -2.0,
    "B4": -3.0,
}


def load_json(path):
    """Load JSON from disk."""
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(data, path):
    """Save JSON to disk."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    return output_path


def default_annotations():
    """Return the initial manual annotation document."""
    return {
        "polygon_layers": {},
        "hidden_polygon_ids": [],
        "manual_polygons": [],
        "manual_edits": [],
        "manual_merges": [],
        "manual_connections": [],
        "manual_walls": [],
        "layer_alignment_pairs": [],
    }


def load_annotations(path):
    """Load manual annotations or return an empty document."""
    output_path = Path(path)
    if not output_path.exists():
        return default_annotations()
    annotations = load_json(output_path)
    base = default_annotations()
    base.update(annotations)
    return base


def normalize_points(points):
    """Normalize a point list into integer OpenCV coordinates."""
    return np.array(points, dtype=np.float32).reshape((-1, 2))


def polygon_metrics(points):
    """Calculate area, bbox, and centroid for a polygon."""
    contour = normalize_points(points)
    x, y, w, h = cv2.boundingRect(contour)
    moments = cv2.moments(contour)
    if moments["m00"] != 0:
        centroid = [float(moments["m10"] / moments["m00"]), float(moments["m01"] / moments["m00"])]
    else:
        centroid = [float(np.mean(contour[:, 0])), float(np.mean(contour[:, 1]))]
    return {
        "area_source": float(abs(cv2.contourArea(contour))),
        "bbox_source": [int(x), int(y), int(w), int(h)],
        "centroid_source": centroid,
    }


def transformed_polygon_metrics(points):
    """Calculate transformed-space metrics for a polygon."""
    metrics = polygon_metrics(points)
    return {
        "area_transformed": metrics["area_source"],
        "bbox_transformed": metrics["bbox_source"],
        "centroid_transformed": metrics["centroid_source"],
    }


def build_polygon_lookup(polygons_path, annotations, working_polygons=None):
    """Build a polygon lookup from extracted and manual polygons."""
    polygon_data = load_json(polygons_path)
    polygons = polygon_data.get("polygons", [])
    lookup = {poly["polygon_id"]: poly for poly in polygons}
    for poly in working_polygons or []:
        if poly.get("polygon_id"):
            lookup[poly["polygon_id"]] = poly
    for poly in annotations.get("manual_polygons", []):
        lookup[poly["polygon_id"]] = poly
    return lookup


def existing_polygon_ids(annotations, working_polygons=None):
    """Return polygon ids already present in annotations or the editor working set."""
    ids = set()
    for poly in annotations.get("manual_polygons", []):
        if poly.get("polygon_id"):
            ids.add(str(poly["polygon_id"]))
    for poly in working_polygons or []:
        if poly.get("polygon_id"):
            ids.add(str(poly["polygon_id"]))
    return ids


def next_prefixed_polygon_id(prefix, annotations, working_polygons=None):
    """Return the next polygon id for a prefix without colliding with the working set."""
    ids = existing_polygon_ids(annotations, working_polygons=working_polygons)
    index = 1
    while f"{prefix}_{index:03d}" in ids:
        index += 1
    return f"{prefix}_{index:03d}"


def reserve_prefixed_polygon_ids(prefix, count, annotations, working_polygons=None):
    """Return multiple new prefixed ids without colliding with existing ids."""
    ids = existing_polygon_ids(annotations, working_polygons=working_polygons)
    output = []
    index = 1
    while len(output) < count:
        candidate = f"{prefix}_{index:03d}"
        if candidate not in ids:
            output.append(candidate)
            ids.add(candidate)
        index += 1
    return output


def next_manual_polygon_id(annotations, working_polygons=None):
    """Return the next merged polygon id."""
    return next_prefixed_polygon_id("merged", annotations, working_polygons=working_polygons)


def next_edited_polygon_id(annotations, working_polygons=None):
    """Return the next edited polygon id."""
    return next_prefixed_polygon_id("edited", annotations, working_polygons=working_polygons)


def next_added_polygon_id(annotations, working_polygons=None):
    """Return the next added polygon id."""
    return next_prefixed_polygon_id("added", annotations, working_polygons=working_polygons)


def next_wall_id(annotations):
    """Return the next manual wall id."""
    return f"wall_{len(annotations.get('manual_walls', [])) + 1:03d}"


def nearest_vertex_index(points, clicked_point):
    """Return the nearest polygon vertex index to a clicked point."""
    vertices = normalize_points(points)
    clicked = np.array(clicked_point, dtype=np.float32)
    distances = np.linalg.norm(vertices - clicked, axis=1)
    return int(np.argmin(distances))


def cyclic_path(points, start_index, end_index):
    """Return the inclusive forward path around a closed polygon."""
    normalized = normalize_points(points).astype(float).tolist()
    if start_index <= end_index:
        return normalized[start_index:end_index + 1]
    return normalized[start_index:] + normalized[:end_index + 1]


def path_length(points):
    """Return cumulative segment length for a point path."""
    if len(points) < 2:
        return 0.0
    arr = np.array(points, dtype=np.float32)
    return float(np.sum(np.linalg.norm(arr[1:] - arr[:-1], axis=1)))


def point_segment_distance(point, seg_a, seg_b):
    """Return distance from a point to a segment."""
    p = np.array(point, dtype=np.float32)
    a = np.array(seg_a, dtype=np.float32)
    b = np.array(seg_b, dtype=np.float32)
    ab = b - a
    denom = float(np.dot(ab, ab))
    if denom == 0:
        return float(np.linalg.norm(p - a))
    t = max(0.0, min(1.0, float(np.dot(p - a, ab) / denom)))
    projection = a + (ab * t)
    return float(np.linalg.norm(p - projection))


def path_contact_score(path, reference_start, reference_end):
    """Score how strongly a path faces the opposite selected edge."""
    if not path:
        return float("inf")
    distances = [point_segment_distance(point, reference_start, reference_end) for point in path]
    # Use the near side average so a long outer path with one close endpoint is not mistaken as the contact side.
    sample_count = max(1, min(8, len(distances)))
    return float(np.mean(sorted(distances)[:sample_count]))


def choose_contact_and_keep_paths(points, start_index, end_index, reference_start, reference_end):
    """Choose the path closer to the opposite selected edge as the removed contact side."""
    forward = cyclic_path(points, start_index, end_index)
    backward = cyclic_path(points, end_index, start_index)
    forward_score = path_contact_score(forward, reference_start, reference_end)
    backward_score = path_contact_score(backward, reference_start, reference_end)
    if forward_score <= backward_score:
        return backward, {
            "removed_path": "forward_start_to_end",
            "removed_score": forward_score,
            "kept_path": "backward_end_to_start",
            "kept_score": backward_score,
            "removed_vertex_count": len(forward),
            "kept_vertex_count": len(backward),
        }
    return forward, {
        "removed_path": "backward_end_to_start",
        "removed_score": backward_score,
        "kept_path": "forward_start_to_end",
        "kept_score": forward_score,
        "removed_vertex_count": len(backward),
        "kept_vertex_count": len(forward),
    }


def remove_consecutive_duplicates(points):
    """Remove duplicate neighboring points from a polygon path."""
    cleaned = []
    for point in points:
        if cleaned and np.allclose(cleaned[-1], point):
            continue
        cleaned.append([float(point[0]), float(point[1])])
    if len(cleaned) > 1 and np.allclose(cleaned[0], cleaned[-1]):
        cleaned.pop()
    return cleaned


def resolve_marker_config_path(marker_config, image_path):
    """Resolve an optional marker config path for transformed export."""
    candidates = []
    if marker_config:
        candidates.append(Path(marker_config))
    image_stem = Path(image_path).stem
    candidates.append(Path("config") / f"{image_stem}_marker_config.json")
    candidates.append(Path("config") / "marker_config.json")
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    return None


def load_transform_metadata(marker_config_path):
    """Load perspective matrix from a marker config file."""
    if not marker_config_path:
        return None
    config = load_json(marker_config_path)
    matrix = np.array(config["perspective_matrix"], dtype=np.float32)
    return {
        "marker_config": str(marker_config_path),
        "perspective_matrix": matrix,
        "target_width": config.get("target_width"),
        "target_height": config.get("target_height"),
    }


def calculate_auto_center_shift_from_points(point_sets, margin=50):
    """Calculate the auto-centering shift used after perspective transform."""
    arrays = [normalize_points(points) for points in point_sets if len(points) > 0]
    if not arrays:
        return 0.0, 0.0
    all_points = np.vstack(arrays)
    x_min, y_min = np.min(all_points, axis=0).flatten()
    return float(margin - x_min), float(margin - y_min)


def transform_source_points(points, matrix, shift=(0.0, 0.0)):
    """Perspective-transform source points and apply auto-centering shift."""
    arr = normalize_points(points).reshape((-1, 1, 2))
    transformed = cv2.perspectiveTransform(arr, matrix).reshape((-1, 2))
    transformed[:, 0] += float(shift[0])
    transformed[:, 1] += float(shift[1])
    return [[float(x), float(y)] for x, y in transformed]


def final_polygon_records(polygons_path, annotations, transform_metadata=None):
    """Apply manual annotations and return final replacement polygon records."""
    polygon_data = load_json(polygons_path)
    source_polygons = polygon_data.get("polygons", [])
    hidden_ids = set(annotations.get("hidden_polygon_ids", []))
    manual_polygons = annotations.get("manual_polygons", [])
    visible_originals = [
        dict(poly)
        for poly in source_polygons
        if poly.get("polygon_id") not in hidden_ids
    ]
    visible_manuals = [
        dict(poly)
        for poly in manual_polygons
        if poly.get("polygon_id") not in hidden_ids
    ]
    final_polygons = visible_originals + visible_manuals

    if transform_metadata:
        matrix = transform_metadata["perspective_matrix"]
        raw_transformed = [cv2.perspectiveTransform(normalize_points(poly["points_source"]).reshape((-1, 1, 2)), matrix).reshape((-1, 2)) for poly in source_polygons if poly.get("points_source")]
        shift = calculate_auto_center_shift_from_points(raw_transformed)
        for poly in final_polygons:
            if poly.get("points_source"):
                poly["points_transformed"] = transform_source_points(poly["points_source"], matrix, shift=shift)
                poly.update(transformed_polygon_metrics(poly["points_transformed"]))
            if poly.get("holes_source"):
                poly["holes_transformed"] = [
                    transform_source_points(hole, matrix, shift=shift)
                    for hole in poly["holes_source"]
                    if len(hole) >= 3
                ]
        transform_info = {
            "marker_config": transform_metadata["marker_config"],
            "target_width": transform_metadata.get("target_width"),
            "target_height": transform_metadata.get("target_height"),
            "auto_center_shift": [shift[0], shift[1]],
        }
    else:
        transform_info = None

    layers = annotations.get("polygon_layers", {})
    for poly in final_polygons:
        poly.setdefault("semantic", dict(DEFAULT_SEMANTIC))
        if layers.get(poly.get("polygon_id")):
            poly["semantic"]["layer"] = layers[poly["polygon_id"]]

    return polygon_data, final_polygons, transform_info


def build_final_polygons_payload(polygons_path, annotations, transform_metadata=None):
    """Build final_polygons.json from intermediate polygons plus manual annotations."""
    polygon_data, polygons, transform_info = final_polygon_records(polygons_path, annotations, transform_metadata)
    walls = [dict(wall) for wall in annotations.get("manual_walls", [])]
    if transform_metadata and transform_info:
        matrix = transform_metadata["perspective_matrix"]
        shift = transform_info["auto_center_shift"]
        for wall in walls:
            if wall.get("points_source"):
                wall["points_transformed"] = transform_source_points(wall["points_source"], matrix, shift=shift)
    return {
        "image": polygon_data.get("image", {}),
        "extraction": polygon_data.get("extraction", {}),
        "manual_export": {
            "hidden_polygon_count": len(annotations.get("hidden_polygon_ids", [])),
            "manual_polygon_count": len(annotations.get("manual_polygons", [])),
            "manual_wall_count": len(walls),
            "final_polygon_count": len(polygons),
            "transform": transform_info,
        },
        "polygons": polygons,
        "walls": walls,
    }


def build_working_final_payload(polygons_path, working_polygons, annotations, transform_metadata=None):
    """Build final_polygons.json directly from the editor working polygon set."""
    polygon_data = load_json(polygons_path)
    polygons = [dict(poly) for poly in working_polygons]
    layers = annotations.get("polygon_layers", {})
    for poly in polygons:
        poly.setdefault("semantic", dict(DEFAULT_SEMANTIC))
        if layers.get(poly.get("polygon_id")):
            poly["semantic"]["layer"] = layers[poly["polygon_id"]]

    if transform_metadata:
        matrix = transform_metadata["perspective_matrix"]
        source_polygons = polygon_data.get("polygons", [])
        raw_transformed = [
            cv2.perspectiveTransform(normalize_points(poly["points_source"]).reshape((-1, 1, 2)), matrix).reshape((-1, 2))
            for poly in source_polygons
            if poly.get("points_source")
        ]
        shift = calculate_auto_center_shift_from_points(raw_transformed)
        for poly in polygons:
            if poly.get("points_source"):
                poly["points_transformed"] = transform_source_points(poly["points_source"], matrix, shift=shift)
                poly.update(transformed_polygon_metrics(poly["points_transformed"]))
            if poly.get("holes_source"):
                poly["holes_transformed"] = [
                    transform_source_points(hole, matrix, shift=shift)
                    for hole in poly["holes_source"]
                    if len(hole) >= 3
                ]
        transform_info = {
            "marker_config": transform_metadata["marker_config"],
            "target_width": transform_metadata.get("target_width"),
            "target_height": transform_metadata.get("target_height"),
            "auto_center_shift": [shift[0], shift[1]],
        }
    else:
        transform_info = None

    walls = [dict(wall) for wall in annotations.get("manual_walls", [])]
    if transform_metadata and transform_info:
        matrix = transform_metadata["perspective_matrix"]
        shift = transform_info["auto_center_shift"]
        for wall in walls:
            if wall.get("points_source"):
                wall["points_transformed"] = transform_source_points(wall["points_source"], matrix, shift=shift)

    return {
        "image": polygon_data.get("image", {}),
        "extraction": polygon_data.get("extraction", {}),
        "manual_export": {
            "source": "editor_working_polygons",
            "hidden_polygon_count": 0,
            "manual_polygon_count": len(polygons),
            "manual_wall_count": len(walls),
            "final_polygon_count": len(polygons),
            "transform": transform_info,
        },
        "polygons": polygons,
        "walls": walls,
    }


def parse_layer_z(value):
    """Parse layer z mapping such as 'B1=1,B2=0,B3=-1'."""
    mapping = dict(DEFAULT_LAYER_Z)
    if not value:
        return mapping
    for item in value.split(","):
        if not item.strip():
            continue
        key, z_value = item.split("=", 1)
        mapping[key.strip()] = float(z_value.strip())
    return mapping


def polygon_layer(poly, annotations=None):
    """Return layer value from a polygon semantic field."""
    annotations = annotations or {}
    polygon_id = poly.get("polygon_id")
    annotation_layer = annotations.get("polygon_layers", {}).get(polygon_id)
    if annotation_layer:
        return annotation_layer
    return (poly.get("semantic") or {}).get("layer")


def color_rgba(color_rgb, alpha=1.0):
    """Convert 0-255 RGB into normalized RGBA used by plane_with_color.json."""
    rgb = color_rgb or [180, 180, 180]
    return [float(rgb[0]) / 255.0, float(rgb[1]) / 255.0, float(rgb[2]) / 255.0, float(alpha)]


def scene_xy_from_point(point, transform_metadata=None, transform_info=None, scale=0.01, invert_y=False):
    """Convert a source-space point into scene export XY coordinates."""
    x, y = point
    if transform_metadata and transform_info:
        transformed = transform_source_points(
            [[x, y]],
            transform_metadata["perspective_matrix"],
            shift=transform_info["auto_center_shift"],
        )[0]
        x, y = transformed
    out_y = -float(y) if invert_y else float(y)
    return [float(x) * scale, out_y * scale]


def build_layer_alignment_offsets(alignment_pairs, transform_metadata=None, transform_info=None, scale=0.01, invert_y=False, reference_layer=None):
    """Build cumulative XY offsets from pairwise layer alignment points."""
    pairs = alignment_pairs or []
    if not pairs:
        return {}, None

    graph = {}
    layers = set()
    for pair in pairs:
        from_layer = pair.get("from_layer")
        to_layer = pair.get("to_layer")
        from_point = pair.get("from_point_source") or pair.get("from_point")
        to_point = pair.get("to_point_source") or pair.get("to_point")
        if not from_layer or not to_layer or not from_point or not to_point:
            continue
        from_xy = scene_xy_from_point(from_point, transform_metadata, transform_info, scale=scale, invert_y=invert_y)
        to_xy = scene_xy_from_point(to_point, transform_metadata, transform_info, scale=scale, invert_y=invert_y)
        delta = [to_xy[0] - from_xy[0], to_xy[1] - from_xy[1]]
        reverse = [-delta[0], -delta[1]]
        graph.setdefault(from_layer, []).append((to_layer, delta))
        graph.setdefault(to_layer, []).append((from_layer, reverse))
        layers.update([from_layer, to_layer])

    if not graph:
        return {}, None
    root = reference_layer if reference_layer in graph else ("B1" if "B1" in graph else sorted(layers)[0])
    offsets = {root: [0.0, 0.0]}
    queue = [root]
    while queue:
        layer = queue.pop(0)
        for next_layer, delta_to_next in graph.get(layer, []):
            if next_layer in offsets:
                continue
            # delta_to_next moves next_layer into current layer coordinates, so subtract it when traversing current -> next.
            offsets[next_layer] = [
                offsets[layer][0] - delta_to_next[0],
                offsets[layer][1] - delta_to_next[1],
            ]
            queue.append(next_layer)
    return offsets, root


def apply_xy_offset_to_vertices(vertices, offset):
    """Apply a 2D offset to 3D vertices."""
    if not offset:
        return vertices
    return [[float(x) + offset[0], float(y) + offset[1], float(z)] for x, y, z in vertices]


def build_plane_payload_from_records(polygons, walls, annotations=None, transform_metadata=None, transform_info=None, scale=0.01, default_z=0.0, layer_z=None, invert_y=False):
    """Build examples/plane_with_color.json-style planes from polygon records."""
    annotations = annotations or {}
    layer_z = layer_z or {}
    alignment_offsets, reference_layer = build_layer_alignment_offsets(
        annotations.get("layer_alignment_pairs", []),
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=scale,
        invert_y=invert_y,
        reference_layer=annotations.get("layer_alignment_reference"),
    )
    planes = []
    for poly in polygons:
        if transform_metadata and transform_info and poly.get("points_source"):
            points = transform_source_points(
                poly["points_source"],
                transform_metadata["perspective_matrix"],
                shift=transform_info["auto_center_shift"],
            )
        else:
            points = poly.get("points_transformed") or poly.get("points_source")
        if not points:
            continue
        layer = polygon_layer(poly, annotations=annotations)
        z_value = layer_z.get(layer, default_z)
        vertices = []
        for x, y in points:
            out_y = -float(y) if invert_y else float(y)
            vertices.append([float(x) * scale, out_y * scale, float(z_value)])
        offset = alignment_offsets.get(layer, [0.0, 0.0])
        vertices = apply_xy_offset_to_vertices(vertices, offset)
        if transform_metadata and transform_info and poly.get("holes_source"):
            hole_sets = [
                transform_source_points(
                    hole,
                    transform_metadata["perspective_matrix"],
                    shift=transform_info["auto_center_shift"],
                )
                for hole in poly.get("holes_source", [])
                if len(hole) >= 3
            ]
        else:
            hole_sets = poly.get("holes_transformed") or poly.get("holes_source") or []
        planes.append(
            {
                "name": f"{layer}_{poly['polygon_id']}" if layer else poly["polygon_id"],
                "polygon_id": poly.get("polygon_id"),
                "source_polygon_ids": poly.get("source_polygon_ids"),
                "layer": layer,
                "color_rgb": poly.get("color_rgb"),
                "color": color_rgba(poly.get("color_rgb")),
                "vertices": vertices,
                "holes": [
                    apply_xy_offset_to_vertices(
                        [
                            [float(x) * scale, (-float(y) if invert_y else float(y)) * scale, float(z_value)]
                            for x, y in hole
                        ],
                        offset,
                    )
                    for hole in hole_sets
                    if len(hole) >= 3
                ],
                "alignment_offset_xy": offset,
            }
        )
    wall_records = []
    for wall in walls:
        if transform_metadata and transform_info and wall.get("points_source"):
            wall_points = transform_source_points(
                wall["points_source"],
                transform_metadata["perspective_matrix"],
                shift=transform_info["auto_center_shift"],
            )
        else:
            wall_points = wall.get("points_transformed") or wall.get("points_source")
        if not wall_points or len(wall_points) < 2:
            continue
        layer = wall.get("semantic", {}).get("layer")
        z_value = layer_z.get(layer, default_z)
        height = float(wall.get("height", 1.0))
        p1, p2 = wall_points[:2]
        y1 = -float(p1[1]) if invert_y else float(p1[1])
        y2 = -float(p2[1]) if invert_y else float(p2[1])
        x1 = float(p1[0])
        x2 = float(p2[0])
        offset = alignment_offsets.get(layer, [0.0, 0.0])
        wall_records.append(
            {
                "name": wall.get("wall_id"),
                "wall_id": wall.get("wall_id"),
                "source_polygon_ids": wall.get("source_polygon_ids"),
                "type": wall.get("type", "shared_boundary_wall"),
                "height": height,
                "color": [0.8, 0.1, 0.1, 1.0],
                "vertices": apply_xy_offset_to_vertices(
                    [
                        [x1 * scale, y1 * scale, z_value],
                        [x2 * scale, y2 * scale, z_value],
                        [x2 * scale, y2 * scale, z_value + height],
                        [x1 * scale, y1 * scale, z_value + height],
                    ],
                    offset,
                ),
                "alignment_offset_xy": offset,
            }
        )
    return {
        "metadata": {
            "format": "plane1-compatible",
            "coordinate_source": "points_transformed" if transform_info else "points_source",
            "scale": scale,
            "default_z": default_z,
            "layer_z": layer_z,
            "invert_y": invert_y,
            "transform": transform_info,
            "layer_alignment": {
                "reference_layer": reference_layer,
                "offsets": alignment_offsets,
                "pair_count": len(annotations.get("layer_alignment_pairs", [])),
                "mode": "xy",
            },
        },
        "planes": planes,
        "walls": wall_records,
    }


def build_plane_payload(polygons_path, annotations, transform_metadata=None, scale=0.01, default_z=0.0, layer_z=None, invert_y=False):
    """Build examples/plane_with_color.json-style planes from final polygons."""
    _, polygons, transform_info = final_polygon_records(polygons_path, annotations, transform_metadata)
    walls = [dict(wall) for wall in annotations.get("manual_walls", [])]
    if transform_metadata and transform_info:
        matrix = transform_metadata["perspective_matrix"]
        shift = transform_info["auto_center_shift"]
        for wall in walls:
            if wall.get("points_source"):
                wall["points_transformed"] = transform_source_points(wall["points_source"], matrix, shift=shift)
    return build_plane_payload_from_records(
        polygons,
        walls,
        annotations=annotations,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=scale,
        default_z=default_z,
        layer_z=layer_z,
        invert_y=invert_y,
    )


def keep_path_from_remove_choice(points, start_index, end_index, remove_path):
    """Return the path to keep after removing the selected forward/backward path."""
    forward = cyclic_path(points, start_index, end_index)
    backward = cyclic_path(points, end_index, start_index)
    if remove_path == "forward":
        return backward, {
            "removed_path": "forward_start_to_end",
            "removed_vertex_count": len(forward),
            "kept_path": "backward_end_to_start",
            "kept_vertex_count": len(backward),
        }
    if remove_path == "backward":
        return forward, {
            "removed_path": "backward_end_to_start",
            "removed_vertex_count": len(backward),
            "kept_path": "forward_start_to_end",
            "kept_vertex_count": len(forward),
        }
    raise ValueError("remove_path는 forward 또는 backward여야 합니다.")


def build_straightened_polygon(poly, vertex_indices, remove_path):
    """Straighten one polygon by removing the selected path between two vertices."""
    if len(vertex_indices) != 2:
        raise ValueError("straighten에는 vertex index 2개가 필요합니다.")
    start_index, end_index = [int(value) for value in vertex_indices]
    if start_index == end_index:
        raise ValueError("서로 다른 vertex 2개를 선택해야 합니다.")

    kept_path, path_info = keep_path_from_remove_choice(
        poly["points_source"],
        start_index,
        end_index,
        remove_path,
    )
    points = remove_consecutive_duplicates(kept_path)
    if len(points) < 3:
        raise ValueError("straighten 결과 polygon의 점이 부족합니다.")

    vertices = normalize_points(poly["points_source"])
    return points, {
        "start_vertex_index": start_index,
        "end_vertex_index": end_index,
        "start_vertex": vertices[start_index].astype(float).tolist(),
        "end_vertex": vertices[end_index].astype(float).tolist(),
        "removed_path": path_info,
    }


def validate_polygon_holes(points, holes):
    """Validate that holes stay inside the outer polygon and have usable area."""
    outer = normalize_points(points)
    if abs(cv2.contourArea(outer)) <= 1.0:
        raise ValueError("polygon 면적이 너무 작습니다.")
    for hole_index, hole in enumerate(holes):
        hole_arr = normalize_points(hole)
        if len(hole_arr) < 3:
            raise ValueError(f"hole {hole_index}의 점이 부족합니다.")
        if abs(cv2.contourArea(hole_arr)) <= 1.0:
            raise ValueError(f"hole {hole_index}의 면적이 너무 작습니다.")
        for point in hole_arr:
            if cv2.pointPolygonTest(outer, (float(point[0]), float(point[1])), False) < 0:
                raise ValueError(f"hole {hole_index}가 외곽 polygon 밖으로 벗어났습니다.")


def build_moved_vertex_polygon(poly, vertex_index, new_point, hole_index=None):
    """Move one vertex in a polygon and return the edited point list."""
    points = normalize_points(poly["points_source"]).astype(float).tolist()
    vertex_index = int(vertex_index)
    holes = [
        remove_consecutive_duplicates(normalize_points(item).astype(float).tolist())
        for item in poly.get("holes_source", [])
        if len(item) >= 3
    ]
    moved_point = [float(new_point[0]), float(new_point[1])]

    if hole_index is None:
        if vertex_index < 0 or vertex_index >= len(points):
            raise ValueError("vertex_index가 polygon 범위를 벗어났습니다.")
        old_point = points[vertex_index]
        points[vertex_index] = moved_point
        target = "outer"
    else:
        hole_index = int(hole_index)
        if hole_index < 0 or hole_index >= len(holes):
            raise ValueError("hole_index가 polygon hole 범위를 벗어났습니다.")
        if vertex_index < 0 or vertex_index >= len(holes[hole_index]):
            raise ValueError("vertex_index가 hole 범위를 벗어났습니다.")
        old_point = holes[hole_index][vertex_index]
        holes[hole_index][vertex_index] = moved_point
        holes[hole_index] = remove_consecutive_duplicates(holes[hole_index])
        if len(holes[hole_index]) < 3:
            raise ValueError("move 결과 hole의 점이 부족합니다.")
        target = "hole"

    points = remove_consecutive_duplicates(points)
    if len(points) < 3:
        raise ValueError("move 결과 polygon의 점이 부족합니다.")
    validate_polygon_holes(points, holes)
    return points, holes, {
        "target": target,
        "hole_index": hole_index,
        "vertex_index": vertex_index,
        "from": old_point,
        "to": moved_point,
    }


def build_inserted_vertex_polygon(poly, insert_after_index, point):
    """Insert one vertex after an existing polygon vertex."""
    points = normalize_points(poly["points_source"]).astype(float).tolist()
    insert_after_index = int(insert_after_index)
    if insert_after_index < 0 or insert_after_index >= len(points):
        raise ValueError("insert_after_index가 polygon 범위를 벗어났습니다.")
    inserted_point = [float(point[0]), float(point[1])]
    edited = points[:insert_after_index + 1] + [inserted_point] + points[insert_after_index + 1:]
    edited = remove_consecutive_duplicates(edited)
    if len(edited) < 3:
        raise ValueError("insert 결과 polygon의 점이 부족합니다.")
    if abs(cv2.contourArea(np.array(edited, dtype=np.float32))) <= 1.0:
        raise ValueError("insert 결과 polygon 면적이 너무 작습니다.")
    return edited, {
        "insert_after_index": insert_after_index,
        "inserted_vertex_index": insert_after_index + 1,
        "point": inserted_point,
    }


def build_simple_keep_vertices_polygon(poly, kept_vertex_indices):
    """Create a simplified polygon from selected vertices in original order."""
    points = normalize_points(poly["points_source"]).astype(float).tolist()
    indices = sorted({int(value) for value in kept_vertex_indices})
    if len(indices) < 3:
        raise ValueError("Simple Keep에는 최소 3개의 vertex가 필요합니다.")
    if indices[0] < 0 or indices[-1] >= len(points):
        raise ValueError("kept_vertex_indices가 polygon 범위를 벗어났습니다.")

    kept_points = remove_consecutive_duplicates([points[index] for index in indices])
    if len(kept_points) < 3:
        raise ValueError("Simple Keep 결과 polygon의 점이 부족합니다.")
    if abs(cv2.contourArea(np.array(kept_points, dtype=np.float32))) <= 1.0:
        raise ValueError("Simple Keep 결과 polygon 면적이 너무 작습니다.")

    return kept_points, {
        "kept_vertex_indices": indices,
        "removed_vertex_indices": [index for index in range(len(points)) if index not in indices],
        "source_vertex_count": len(points),
        "kept_vertex_count": len(kept_points),
    }


def build_added_polygon(points):
    """Create a new polygon from manually clicked source points."""
    normalized = remove_consecutive_duplicates(normalize_points(points).astype(float).tolist())
    if len(normalized) < 3:
        raise ValueError("Add Polygon에는 최소 3개의 point가 필요합니다.")
    if abs(cv2.contourArea(np.array(normalized, dtype=np.float32))) <= 1.0:
        raise ValueError("Add Polygon 결과 polygon 면적이 너무 작습니다.")
    return normalized


def build_cut_hole_polygon(poly, hole_points):
    """Create an edited polygon with one additional interior hole."""
    outer_points = normalize_points(poly["points_source"]).astype(float).tolist()
    hole = build_added_polygon(hole_points)
    existing_holes = [
        remove_consecutive_duplicates(normalize_points(item).astype(float).tolist())
        for item in poly.get("holes_source", [])
        if len(item) >= 3
    ]
    return outer_points, existing_holes + [hole], {
        "hole_index": len(existing_holes),
        "hole_vertex_count": len(hole),
    }


def directed_path(points, start_index, end_index, direction="forward"):
    """Return the selected cyclic path in the requested direction."""
    if direction == "forward":
        return cyclic_path(points, start_index, end_index)
    if direction == "backward":
        return cyclic_path(points, end_index, start_index)
    raise ValueError("range direction은 forward 또는 backward여야 합니다.")


def replace_directed_edge_path(points, start_index, end_index, direction, replacement_path):
    """Replace the selected directed path between two vertices with another point path."""
    if start_index == end_index:
        raise ValueError("서로 다른 vertex 2개를 선택해야 합니다.")
    selected_path = directed_path(points, start_index, end_index, direction)
    outside_path = directed_path(points, end_index, start_index, direction)
    replacement = normalize_points(replacement_path).astype(float).tolist()
    if len(replacement) < 2:
        raise ValueError("replacement path는 최소 2개의 점이 필요합니다.")
    edited = replacement + list(reversed(outside_path))[1:-1]
    edited = remove_consecutive_duplicates(edited)
    if len(edited) < 3:
        raise ValueError("Shared Edge 결과 polygon의 점이 부족합니다.")
    return edited, {
        "replaced_path": f"{direction}_start_to_end",
        "replaced_vertex_count": len(selected_path),
        "replacement_vertex_count": len(replacement),
    }


def choose_replacement_orientation(reference_path, target_path, replacement_order="auto"):
    """Orient the reference path to best match the target path endpoints."""
    ref = normalize_points(reference_path).astype(float).tolist()
    target = normalize_points(target_path).astype(float).tolist()
    if replacement_order == "keep":
        return ref, "keep_order"
    if replacement_order == "reverse":
        return list(reversed(ref)), "reverse_order"
    if replacement_order != "auto":
        raise ValueError("replacement_order는 auto, keep, reverse 중 하나여야 합니다.")
    same_score = float(
        np.linalg.norm(np.array(ref[0]) - np.array(target[0]))
        + np.linalg.norm(np.array(ref[-1]) - np.array(target[-1]))
    )
    reversed_score = float(
        np.linalg.norm(np.array(ref[0]) - np.array(target[-1]))
        + np.linalg.norm(np.array(ref[-1]) - np.array(target[0]))
    )
    if same_score <= reversed_score:
        return list(reversed(ref)), "auto_reversed_from_same_direction"
    return ref, "auto_kept_from_reversed_direction"


def build_shared_edge_edit(poly_a, poly_b, vertex_indices, range_directions=None, replacement_order="auto"):
    """Replace polygon B's selected edge range with polygon A's selected edge range."""
    range_directions = range_directions or {}
    a_direction = range_directions.get("polygon_a", "forward")
    b_direction = range_directions.get("polygon_b", "forward")
    a_indices = vertex_indices.get("polygon_a", [])
    b_indices = vertex_indices.get("polygon_b", [])
    if len(a_indices) != 2 or len(b_indices) != 2:
        raise ValueError("polygon_a/polygon_b 각각 vertex index 2개가 필요합니다.")
    a_start, a_end = [int(value) for value in a_indices]
    b_start, b_end = [int(value) for value in b_indices]
    if a_start == a_end or b_start == b_end:
        raise ValueError("각 polygon에서 서로 다른 vertex 2개를 선택해야 합니다.")

    reference_path = directed_path(poly_a["points_source"], a_start, a_end, a_direction)
    target_path = directed_path(poly_b["points_source"], b_start, b_end, b_direction)
    replacement_path, pairing = choose_replacement_orientation(reference_path, target_path, replacement_order)

    a_points = normalize_points(poly_a["points_source"]).astype(float).tolist()
    b_points, b_geometry = replace_directed_edge_path(
        poly_b["points_source"],
        b_start,
        b_end,
        b_direction,
        replacement_path,
    )
    return a_points, b_points, {
        "method": "replace_polygon_b_range_with_polygon_a_range",
        "pairing": pairing,
        "range_directions": {
            "polygon_a": a_direction,
            "polygon_b": b_direction,
        },
        "replacement_order": replacement_order,
        "vertex_indices": {
            "polygon_a": [a_start, a_end],
            "polygon_b": [b_start, b_end],
        },
        "polygon_a": {
            "reference_path": f"{a_direction}_start_to_end",
            "reference_vertex_count": len(reference_path),
        },
        "polygon_b": b_geometry,
        "wall_points_source": replacement_path,
    }


def closest_vertex_pair(poly_a, poly_b):
    """Return the closest source vertex pair between two polygons."""
    points_a = normalize_points(poly_a["points_source"])
    points_b = normalize_points(poly_b["points_source"])
    deltas = points_a[:, None, :] - points_b[None, :, :]
    distances = np.linalg.norm(deltas, axis=2)
    a_index, b_index = np.unravel_index(int(np.argmin(distances)), distances.shape)
    return (
        points_a[a_index].astype(float).tolist(),
        points_b[b_index].astype(float).tolist(),
        int(a_index),
        int(b_index),
        float(distances[a_index, b_index]),
    )


def minimum_connection_edges(polygons):
    """Build nearest-neighbor connection edges until selected polygons are connected."""
    if len(polygons) < 2:
        return []

    candidate_edges = []
    for i, poly_a in enumerate(polygons):
        for j in range(i + 1, len(polygons)):
            point_a, point_b, index_a, index_b, distance = closest_vertex_pair(poly_a, polygons[j])
            candidate_edges.append(
                {
                    "a": i,
                    "b": j,
                    "point_a": point_a,
                    "point_b": point_b,
                    "index_a": index_a,
                    "index_b": index_b,
                    "distance": distance,
                }
            )
    candidate_edges.sort(key=lambda item: item["distance"])

    parent = list(range(len(polygons)))

    def find(value):
        while parent[value] != value:
            parent[value] = parent[parent[value]]
            value = parent[value]
        return value

    def union(a, b):
        root_a = find(a)
        root_b = find(b)
        if root_a == root_b:
            return False
        parent[root_b] = root_a
        return True

    selected_edges = []
    for edge in candidate_edges:
        if union(edge["a"], edge["b"]):
            selected_edges.append(edge)
        if len(selected_edges) == len(polygons) - 1:
            break
    return selected_edges


def nearest_two_vertex_indices(points, reference_points):
    """Return two vertices closest to another polygon's vertices."""
    points_array = normalize_points(points)
    reference_array = normalize_points(reference_points)
    distances = np.linalg.norm(points_array[:, None, :] - reference_array[None, :, :], axis=2)
    nearest_distances = np.min(distances, axis=1)
    ordered = np.argsort(nearest_distances)
    if len(ordered) < 2:
        raise ValueError("Auto Merge에는 각 polygon마다 최소 2개의 vertex가 필요합니다.")
    return int(ordered[0]), int(ordered[1])


def build_auto_spliced_pair(poly_a, poly_b):
    """Join two polygons by automatically removing their closest facing paths."""
    a_points = poly_a["points_source"]
    b_points = poly_b["points_source"]
    a_start, a_end = nearest_two_vertex_indices(a_points, b_points)
    b_start, b_end = nearest_two_vertex_indices(b_points, a_points)

    a_vertices = normalize_points(a_points)
    b_vertices = normalize_points(b_points)
    a_start_vertex = a_vertices[a_start].astype(float).tolist()
    a_end_vertex = a_vertices[a_end].astype(float).tolist()
    b_start_vertex = b_vertices[b_start].astype(float).tolist()
    b_end_vertex = b_vertices[b_end].astype(float).tolist()

    a_keep, a_path_info = choose_contact_and_keep_paths(
        a_points,
        a_start,
        a_end,
        b_start_vertex,
        b_end_vertex,
    )
    b_keep, b_path_info = choose_contact_and_keep_paths(
        b_points,
        b_start,
        b_end,
        a_start_vertex,
        a_end_vertex,
    )

    candidates = [
        remove_consecutive_duplicates(a_keep + b_keep),
        remove_consecutive_duplicates(a_keep + list(reversed(b_keep))),
    ]
    candidates = [candidate for candidate in candidates if len(candidate) >= 3]
    if not candidates:
        raise ValueError("Auto Merge 결과 polygon의 점이 부족합니다.")
    merged_points = max(candidates, key=lambda item: abs(cv2.contourArea(np.array(item, dtype=np.float32))))
    if abs(cv2.contourArea(np.array(merged_points, dtype=np.float32))) <= 1.0:
        raise ValueError("Auto Merge 결과 polygon 면적이 너무 작습니다.")

    return merged_points, {
        "source_polygon_ids": [poly_a["polygon_id"], poly_b["polygon_id"]],
        "a_vertex_indices": [a_start, a_end],
        "b_vertex_indices": [b_start, b_end],
        "a_vertices": [a_start_vertex, a_end_vertex],
        "b_vertices": [b_start_vertex, b_end_vertex],
        "removed_paths": {
            "polygon_a": a_path_info,
            "polygon_b": b_path_info,
        },
    }


def distance_between_polygons(poly_a, poly_b):
    """Return the closest vertex distance between two polygons."""
    points_a = normalize_points(poly_a["points_source"])
    points_b = normalize_points(poly_b["points_source"])
    return float(np.min(np.linalg.norm(points_a[:, None, :] - points_b[None, :, :], axis=2)))


def build_auto_merged_polygon(polygons):
    """Merge multiple polygons by splicing existing vertex paths without contour extraction."""
    if len(polygons) < 2:
        raise ValueError("Auto Merge에는 최소 2개의 polygon이 필요합니다.")

    remaining = list(polygons[1:])
    current = {
        **polygons[0],
        "points_source": normalize_points(polygons[0]["points_source"]).astype(float).tolist(),
    }
    pair_merges = []

    while remaining:
        next_index = min(
            range(len(remaining)),
            key=lambda index: distance_between_polygons(current, remaining[index]),
        )
        next_poly = remaining.pop(next_index)
        merged_points, pair_geometry = build_auto_spliced_pair(current, next_poly)
        pair_merges.append(pair_geometry)
        current = {
            "polygon_id": f"auto_partial_{len(pair_merges):03d}",
            "points_source": merged_points,
        }

    points = remove_consecutive_duplicates(current["points_source"])
    if len(points) < 3:
        raise ValueError("Auto Merge 결과 polygon의 점이 부족합니다.")

    return points, {
        "method": "vertex_path_splice",
        "simplified": False,
        "contour_extracted": False,
        "pair_merges": pair_merges,
    }


def build_spliced_merge_polygon(poly_a, poly_b, clicked_points=None, vertex_indices=None, remove_paths=None):
    """Merge polygons by removing user-selected boundary spans."""
    a_points = poly_a["points_source"]
    b_points = poly_b["points_source"]
    if vertex_indices:
        a_indices = vertex_indices.get("polygon_a", [])
        b_indices = vertex_indices.get("polygon_b", [])
        if len(a_indices) != 2 or len(b_indices) != 2:
            raise ValueError("vertex_indices에는 polygon_a/polygon_b 각각 2개 index가 필요합니다.")
        a_start, a_end = [int(value) for value in a_indices]
        b_start, b_end = [int(value) for value in b_indices]
    else:
        a_start = nearest_vertex_index(a_points, clicked_points[0])
        a_end = nearest_vertex_index(a_points, clicked_points[1])
        b_start = nearest_vertex_index(b_points, clicked_points[2])
        b_end = nearest_vertex_index(b_points, clicked_points[3])

    if a_start == a_end or b_start == b_end:
        raise ValueError("각 polygon에서 서로 다른 vertex 2개를 선택해야 합니다.")

    a_vertices = normalize_points(a_points)
    b_vertices = normalize_points(b_points)
    a_start_vertex = a_vertices[a_start].astype(float).tolist()
    a_end_vertex = a_vertices[a_end].astype(float).tolist()
    b_start_vertex = b_vertices[b_start].astype(float).tolist()
    b_end_vertex = b_vertices[b_end].astype(float).tolist()

    remove_paths = remove_paths or {}
    a_keep, a_path_info = keep_path_from_remove_choice(
        a_points,
        a_start,
        a_end,
        remove_paths.get("polygon_a"),
    )
    b_keep, b_path_info = keep_path_from_remove_choice(
        b_points,
        b_start,
        b_end,
        remove_paths.get("polygon_b"),
    )

    # Try both endpoint pairings and keep the polygon with the larger absolute area.
    candidates = [
        remove_consecutive_duplicates(a_keep + b_keep),
        remove_consecutive_duplicates(a_keep + list(reversed(b_keep))),
    ]
    candidates = [candidate for candidate in candidates if len(candidate) >= 3]
    if not candidates:
        raise ValueError("merge 결과 polygon의 점이 부족합니다.")
    merged_points = max(candidates, key=lambda item: abs(cv2.contourArea(np.array(item, dtype=np.float32))))

    if len(merged_points) < 3:
        raise ValueError("merge 결과 polygon의 점이 부족합니다.")

    return merged_points, {
        "a_start_vertex_index": a_start,
        "a_end_vertex_index": a_end,
        "b_start_vertex_index": b_start,
        "b_end_vertex_index": b_end,
        "a_start_vertex": a_start_vertex,
        "a_end_vertex": a_end_vertex,
        "b_start_vertex": b_start_vertex,
        "b_end_vertex": b_end_vertex,
        "removed_paths": {
            "polygon_a": a_path_info,
            "polygon_b": b_path_info,
        },
    }


def create_app(args):
    """Create the polygon editor Flask app."""
    app = Flask(__name__)
    image_path = Path(args.image).resolve()
    polygons_path = Path(args.polygons).resolve()
    output_path = Path(args.output).resolve()
    final_output_path = Path(args.final_output).resolve() if args.final_output else output_path.with_name("final_polygons.json")
    plane_output_path = Path(args.plane_output).resolve() if args.plane_output else output_path.with_name("scene_planes.json")
    marker_config_path = resolve_marker_config_path(args.marker_config, image_path)
    transform_metadata = load_transform_metadata(marker_config_path)
    layer_z = parse_layer_z(args.layer_z)
    connections_path = Path(args.connections).resolve() if args.connections else None
    source_image = cv2.imread(str(image_path))
    if source_image is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")

    @app.route("/")
    def index():
        """Render the editor page."""
        return render_template("index.html")

    @app.route("/api/project")
    def project():
        """Return project polygons, optional connection candidates, and annotations."""
        polygon_data = load_json(polygons_path)
        connections = None
        if connections_path and connections_path.exists():
            connections = load_json(connections_path)
        return jsonify(
            {
                "image": {
                    "path": str(image_path),
                    "url": "/api/image",
                },
                "polygons_file": str(polygons_path),
                "connections_file": str(connections_path) if connections_path else None,
                "output_file": str(output_path),
                "final_output_file": str(final_output_path),
                "plane_output_file": str(plane_output_path),
                "marker_config_file": str(marker_config_path) if marker_config_path else None,
                "polygon_data": polygon_data,
                "connections": connections,
                "annotations": load_annotations(output_path),
            }
        )

    @app.route("/api/image")
    def image():
        """Serve the source image used as the editor background."""
        return send_file(image_path)

    @app.route("/api/annotations", methods=["GET"])
    def get_annotations():
        """Return saved manual annotations."""
        return jsonify(load_annotations(output_path))

    @app.route("/api/annotations", methods=["POST"])
    def post_annotations():
        """Save manual annotations."""
        data = request.get_json(force=True)
        save_json(data, output_path)
        return jsonify({"saved": True, "output": str(output_path)})

    @app.route("/api/export/final", methods=["POST"])
    def export_final_polygons():
        """Export final polygons after replacing hidden originals with manual polygons."""
        data = request.get_json(silent=True) or {}
        annotations = load_annotations(output_path)
        working_polygons = data.get("working_polygons")
        if working_polygons:
            payload = build_working_final_payload(polygons_path, working_polygons, annotations, transform_metadata)
        else:
            payload = build_final_polygons_payload(polygons_path, annotations, transform_metadata)
        saved_path = save_json(payload, final_output_path)
        return jsonify(
            {
                "saved": True,
                "output": str(saved_path),
                "polygon_count": len(payload["polygons"]),
                "source": payload.get("manual_export", {}).get("source", "annotations"),
            }
        )

    @app.route("/api/export/final_file", methods=["GET"])
    def load_exported_final_polygons():
        """Load the previously exported final polygon file."""
        if not final_output_path.exists():
            return jsonify({"error": f"final export file does not exist: {final_output_path}"}), 404
        payload = load_json(final_output_path)
        payload["source"] = str(final_output_path)
        return jsonify(payload)

    @app.route("/api/export/planes", methods=["POST"])
    def export_planes():
        """Export final polygons to examples/plane1.json-style plane records."""
        data = request.get_json(silent=True) or {}
        annotations = load_annotations(output_path)
        working_polygons = data.get("working_polygons")
        if working_polygons:
            final_payload = build_working_final_payload(polygons_path, working_polygons, annotations, transform_metadata)
            payload = build_plane_payload_from_records(
                final_payload["polygons"],
                final_payload.get("walls", []),
                annotations=annotations,
                transform_metadata=transform_metadata,
                transform_info=final_payload.get("manual_export", {}).get("transform"),
                scale=args.plane_scale,
                default_z=args.default_z,
                layer_z=layer_z,
                invert_y=args.invert_y,
            )
        else:
            payload = build_plane_payload(
                polygons_path,
                annotations,
                transform_metadata,
                scale=args.plane_scale,
                default_z=args.default_z,
                layer_z=layer_z,
                invert_y=args.invert_y,
            )
        saved_path = save_json(payload, plane_output_path)
        return jsonify(
            {
                "saved": True,
                "output": str(saved_path),
                "plane_count": len(payload["planes"]),
                "format": payload.get("metadata", {}).get("format"),
            }
        )

    @app.route("/api/merge", methods=["POST"])
    def merge_polygons():
        """Merge two polygons with a manually drawn bridge polygon."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        polygon_ids = data.get("source_polygon_ids", [])
        if len(polygon_ids) != 2:
            return jsonify({"error": "source_polygon_ids는 2개가 필요합니다."}), 400
        if polygon_ids[0] not in polygon_lookup or polygon_ids[1] not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id가 포함되어 있습니다."}), 400

        clicked_points = data.get("bridge_points_source", [])
        vertex_indices = data.get("vertex_indices")
        remove_paths = data.get("remove_paths")
        if not vertex_indices and len(clicked_points) != 4:
            return jsonify({"error": "bridge_points_source 4개 또는 vertex_indices가 필요합니다."}), 400
        if not remove_paths:
            return jsonify({"error": "remove_paths가 필요합니다."}), 400

        poly_a = polygon_lookup[polygon_ids[0]]
        poly_b = polygon_lookup[polygon_ids[1]]
        try:
            merged_points, merge_geometry = build_spliced_merge_polygon(
                poly_a,
                poly_b,
                clicked_points=clicked_points,
                vertex_indices=vertex_indices,
                remove_paths=remove_paths,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(merged_points)
        merged_id = next_manual_polygon_id(annotations, data.get("working_polygons"))
        color_rgb = poly_a.get("color_rgb") or poly_b.get("color_rgb") or [180, 180, 180]
        merged_polygon = {
            "polygon_id": merged_id,
            "type": "merged_polygon",
            "source_polygon_ids": polygon_ids,
            "color_cluster": poly_a.get("color_cluster"),
            "color_rgb": color_rgb,
            "points_source": merged_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        merge_record = {
            "merge_id": f"merge_{len(annotations.get('manual_merges', [])) + 1:03d}",
            "type": "manual_splice_merge",
            "source_polygon_ids": polygon_ids,
            "clicked_points_source": clicked_points,
            "vertex_indices": vertex_indices,
            "remove_paths": remove_paths,
            "geometry": merge_geometry,
            "created_polygon_id": merged_id,
        }
        return jsonify({"merged_polygon": merged_polygon, "merge_record": merge_record})

    @app.route("/api/auto_merge", methods=["POST"])
    def auto_merge_polygons():
        """Merge selected polygons into one rough polygon for later manual cleanup."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        polygon_ids = data.get("source_polygon_ids", [])
        if len(polygon_ids) < 2:
            return jsonify({"error": "source_polygon_ids는 최소 2개가 필요합니다."}), 400
        missing = [polygon_id for polygon_id in polygon_ids if polygon_id not in polygon_lookup]
        if missing:
            return jsonify({"error": f"존재하지 않는 polygon_id가 포함되어 있습니다: {missing}"}), 400

        source_polygons = [polygon_lookup[polygon_id] for polygon_id in polygon_ids]
        try:
            merged_points, merge_geometry = build_auto_merged_polygon(source_polygons)
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(merged_points)
        merged_id = next_manual_polygon_id(annotations, data.get("working_polygons"))
        color_rgb = source_polygons[0].get("color_rgb") or [180, 180, 180]
        merged_polygon = {
            "polygon_id": merged_id,
            "type": "auto_merged_polygon",
            "source_polygon_ids": polygon_ids,
            "color_cluster": source_polygons[0].get("color_cluster"),
            "color_rgb": color_rgb,
            "points_source": merged_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        merge_record = {
            "merge_id": f"merge_{len(annotations.get('manual_merges', [])) + 1:03d}",
            "type": "auto_merge",
            "source_polygon_ids": polygon_ids,
            "geometry": merge_geometry,
            "created_polygon_id": merged_id,
        }
        return jsonify({"merged_polygon": merged_polygon, "merge_record": merge_record})

    @app.route("/api/straighten", methods=["POST"])
    def straighten_polygon():
        """Create an edited polygon by replacing one selected path with a straight edge."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        vertex_indices = data.get("vertex_indices", [])
        remove_path = data.get("remove_path")
        if not remove_path:
            return jsonify({"error": "remove_path가 필요합니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            edited_points, edit_geometry = build_straightened_polygon(
                source_poly,
                vertex_indices,
                remove_path,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(edited_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "straightened_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": edited_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "straighten_edge",
            "source_polygon_id": polygon_id,
            "vertex_indices": vertex_indices,
            "remove_path": remove_path,
            "geometry": edit_geometry,
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    @app.route("/api/shared_edge", methods=["POST"])
    def shared_edge():
        """Snap two selected polygon edges to shared coordinates and create a wall record."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        polygon_ids = data.get("source_polygon_ids", [])
        if len(polygon_ids) != 2:
            return jsonify({"error": "source_polygon_ids는 2개가 필요합니다."}), 400
        if polygon_ids[0] not in polygon_lookup or polygon_ids[1] not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id가 포함되어 있습니다."}), 400

        poly_a = polygon_lookup[polygon_ids[0]]
        poly_b = polygon_lookup[polygon_ids[1]]
        try:
            a_points, b_points, geometry = build_shared_edge_edit(
                poly_a,
                poly_b,
                data.get("vertex_indices", {}),
                range_directions=data.get("range_directions"),
                replacement_order=data.get("replacement_order", "auto"),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        edit_count = len(annotations.get("manual_edits", []))
        edited_ids = reserve_prefixed_polygon_ids("edited", 2, annotations, data.get("working_polygons"))
        edited_polygons = []
        for source_poly, edited_points, edited_id in [
            (poly_a, a_points, edited_ids[0]),
            (poly_b, b_points, edited_ids[1]),
        ]:
            metrics = polygon_metrics(edited_points)
            edited_polygons.append(
                {
                    "polygon_id": edited_id,
                    "type": "shared_edge_snapped_polygon",
                    "source_polygon_ids": [source_poly["polygon_id"]],
                    "color_cluster": source_poly.get("color_cluster"),
                    "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
                    "points_source": edited_points,
                    "area_source": metrics["area_source"],
                    "bbox_source": metrics["bbox_source"],
                    "centroid_source": metrics["centroid_source"],
                    "semantic": source_poly.get("semantic") or dict(DEFAULT_SEMANTIC),
                }
            )

        wall_id = next_wall_id(annotations)
        wall_record = {
            "wall_id": wall_id,
            "type": "shared_boundary_wall",
            "source_polygon_ids": polygon_ids,
            "snapped_polygon_ids": edited_ids,
            "points_source": geometry["wall_points_source"],
            "height": float(data.get("height", 1.0)),
            "semantic": {
                "layer": None,
                "label": None,
                "confidence": None,
            },
        }
        edit_record = {
            "edit_id": f"edit_{edit_count + 1:03d}",
            "type": "shared_edge_snap",
            "source_polygon_ids": polygon_ids,
            "created_polygon_ids": edited_ids,
            "wall_id": wall_id,
            "geometry": geometry,
        }
        return jsonify(
            {
                "edited_polygons": edited_polygons,
                "edit_record": edit_record,
                "wall_record": wall_record,
            }
        )

    @app.route("/api/move_vertex", methods=["POST"])
    def move_vertex():
        """Create an edited polygon by moving one vertex."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            edited_points, holes, edit_geometry = build_moved_vertex_polygon(
                source_poly,
                data.get("vertex_index"),
                data.get("point"),
                hole_index=data.get("hole_index"),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(edited_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "moved_vertex_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": edited_points,
            "holes_source": holes,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "move_vertex",
            "source_polygon_id": polygon_id,
            "target": edit_geometry["target"],
            "hole_index": edit_geometry["hole_index"],
            "vertex_index": edit_geometry["vertex_index"],
            "from": edit_geometry["from"],
            "to": edit_geometry["to"],
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    @app.route("/api/insert_vertex", methods=["POST"])
    def insert_vertex():
        """Create an edited polygon by inserting one vertex on an edge."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            edited_points, edit_geometry = build_inserted_vertex_polygon(
                source_poly,
                data.get("insert_after_index"),
                data.get("point"),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(edited_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "inserted_vertex_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": edited_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or dict(DEFAULT_SEMANTIC),
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "insert_vertex",
            "source_polygon_id": polygon_id,
            "insert_after_index": edit_geometry["insert_after_index"],
            "inserted_vertex_index": edit_geometry["inserted_vertex_index"],
            "point": edit_geometry["point"],
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    @app.route("/api/simple_keep_vertices", methods=["POST"])
    def simple_keep_vertices():
        """Create an edited polygon by keeping selected vertices only."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            edited_points, edit_geometry = build_simple_keep_vertices_polygon(
                source_poly,
                data.get("kept_vertex_indices", []),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(edited_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "simple_keep_vertices_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": edited_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "simple_keep_vertices",
            "source_polygon_id": polygon_id,
            "kept_vertex_indices": edit_geometry["kept_vertex_indices"],
            "removed_vertex_indices": edit_geometry["removed_vertex_indices"],
            "geometry": edit_geometry,
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    @app.route("/api/add_polygon", methods=["POST"])
    def add_polygon():
        """Create a new manually added polygon."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        source_polygon_id = data.get("source_polygon_id")
        source_poly = polygon_lookup.get(source_polygon_id) if source_polygon_id else None
        try:
            added_points = build_added_polygon(data.get("points_source", []))
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(added_points)
        added_id = next_added_polygon_id(annotations, data.get("working_polygons"))
        added_polygon = {
            "polygon_id": added_id,
            "type": "added_polygon",
            "source_polygon_ids": [],
            "color_cluster": source_poly.get("color_cluster") if source_poly else None,
            "color_rgb": data.get("color_rgb") or (source_poly.get("color_rgb") if source_poly else [180, 180, 180]),
            "points_source": added_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") if source_poly and source_poly.get("semantic") else dict(DEFAULT_SEMANTIC),
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "add_polygon",
            "source_polygon_id": source_polygon_id,
            "created_polygon_id": added_id,
            "point_count": len(added_points),
        }
        return jsonify({"added_polygon": added_polygon, "edit_record": edit_record})

    @app.route("/api/cut_hole", methods=["POST"])
    def cut_hole():
        """Create an edited polygon with a manually drawn hole."""
        data = request.get_json(force=True)
        annotations = load_annotations(output_path)
        polygon_lookup = build_polygon_lookup(polygons_path, annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            outer_points, holes, edit_geometry = build_cut_hole_polygon(
                source_poly,
                data.get("hole_points_source", []),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(outer_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "cut_hole_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": outer_points,
            "holes_source": holes,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or dict(DEFAULT_SEMANTIC),
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "cut_hole",
            "source_polygon_id": polygon_id,
            "geometry": edit_geometry,
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    return app


def parse_args():
    """Parse editor command-line options."""
    parser = argparse.ArgumentParser(description="Run the local polygon correction editor.")
    parser.add_argument("--image", required=True, help="Source image shown behind polygon overlays.")
    parser.add_argument("--polygons", required=True, help="intermediate_polygons.json with points_source.")
    parser.add_argument("--connections", help="Optional connections.json.")
    parser.add_argument("--output", required=True, help="manual_annotations.json output path.")
    parser.add_argument("--final-output", help="Output path for final_polygons.json.")
    parser.add_argument("--plane-output", help="Output path for plane1-compatible scene_planes.json.")
    parser.add_argument("--marker-config", help="Marker config with perspective_matrix for transformed export.")
    parser.add_argument("--plane-scale", type=float, default=0.01)
    parser.add_argument("--default-z", type=float, default=0.0)
    parser.add_argument("--layer-z", help="Layer z mapping. Defaults to 'B1=0,B2=-1,B3=-2,B4=-3'.")
    parser.add_argument("--invert-y", action="store_true")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5050)
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args()


def main():
    """Run the Flask development server."""
    args = parse_args()
    app = create_app(args)
    print(f"editor=http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
