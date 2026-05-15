from pathlib import Path

import cv2
import numpy as np

from editor.geometry import normalize_points, polygon_metrics, transformed_polygon_metrics
from editor.model import DEFAULT_LAYER_Z, DEFAULT_SEMANTIC, load_json


def transform_connection_points(connections, transform_metadata=None, transform_info=None):
    """Attach transformed endpoint coordinates to manual connection records."""
    output = [dict(connection) for connection in connections]
    if not transform_metadata or not transform_info:
        return output
    matrix = transform_metadata["perspective_matrix"]
    shift = transform_info["auto_center_shift"]
    for connection in output:
        if connection.get("from_point_source"):
            connection["from_point_transformed"] = transform_source_points(
                [connection["from_point_source"]],
                matrix,
                shift=shift,
            )[0]
        if connection.get("to_point_source"):
            connection["to_point_transformed"] = transform_source_points(
                [connection["to_point_source"]],
                matrix,
                shift=shift,
            )[0]
    return output


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
    connections = transform_connection_points(
        annotations.get("manual_connections", []),
        transform_metadata=transform_metadata,
        transform_info=transform_info,
    )
    return {
        "image": polygon_data.get("image", {}),
        "extraction": polygon_data.get("extraction", {}),
        "manual_export": {
            "hidden_polygon_count": len(annotations.get("hidden_polygon_ids", [])),
            "manual_polygon_count": len(annotations.get("manual_polygons", [])),
            "manual_wall_count": len(walls),
            "manual_connection_count": len(connections),
            "final_polygon_count": len(polygons),
            "transform": transform_info,
        },
        "polygons": polygons,
        "walls": walls,
        "connections": connections,
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
    connections = transform_connection_points(
        annotations.get("manual_connections", []),
        transform_metadata=transform_metadata,
        transform_info=transform_info,
    )

    return {
        "image": polygon_data.get("image", {}),
        "extraction": polygon_data.get("extraction", {}),
        "manual_export": {
            "source": "editor_working_polygons",
            "hidden_polygon_count": 0,
            "manual_polygon_count": len(polygons),
            "manual_wall_count": len(walls),
            "manual_connection_count": len(connections),
            "final_polygon_count": len(polygons),
            "transform": transform_info,
        },
        "polygons": polygons,
        "walls": walls,
        "connections": connections,
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
    connection_records = []
    for connection in annotations.get("manual_connections", []):
        from_point = connection.get("from_point_source")
        to_point = connection.get("to_point_source")
        if not from_point or not to_point:
            continue
        from_layer = connection.get("from_layer")
        to_layer = connection.get("to_layer")
        from_xy = scene_xy_from_point(
            from_point,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_y=invert_y,
        )
        to_xy = scene_xy_from_point(
            to_point,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_y=invert_y,
        )
        from_offset = alignment_offsets.get(from_layer, [0.0, 0.0])
        to_offset = alignment_offsets.get(to_layer, [0.0, 0.0])
        from_z = layer_z.get(from_layer, default_z)
        to_z = layer_z.get(to_layer, default_z)
        connection_records.append(
            {
                "connection_id": connection.get("connection_id"),
                "type": connection.get("type", "connection"),
                "asset_type": connection.get("asset_type", connection.get("type", "connection")),
                "label": connection.get("label"),
                "bidirectional": bool(connection.get("bidirectional", True)),
                "from": {
                    "polygon_id": connection.get("from_polygon_id"),
                    "layer": from_layer,
                    "point_source": from_point,
                    "position": [
                        float(from_xy[0]) + from_offset[0],
                        float(from_xy[1]) + from_offset[1],
                        float(from_z),
                    ],
                    "alignment_offset_xy": from_offset,
                },
                "to": {
                    "polygon_id": connection.get("to_polygon_id"),
                    "layer": to_layer,
                    "point_source": to_point,
                    "position": [
                        float(to_xy[0]) + to_offset[0],
                        float(to_xy[1]) + to_offset[1],
                        float(to_z),
                    ],
                    "alignment_offset_xy": to_offset,
                },
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
        "connections": connection_records,
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

