from pathlib import Path

import cv2
import numpy as np

from editor.geometry import normalize_points, polygon_metrics, transformed_polygon_metrics
from editor.model import DEFAULT_LAYER_INDEX, DEFAULT_LAYER_Z, DEFAULT_SEMANTIC, load_json


COLOR_BIN_SIZE = 24


def image_path_from_polygon_data(polygon_data):
    """Return the source image path stored in an intermediate polygon payload."""
    image = polygon_data.get("image") or {}
    return image.get("path")


def dominant_polygon_color_rgb(image, points, holes=None, bin_size=COLOR_BIN_SIZE):
    """Return the dominant similar RGB color inside one source-space polygon."""
    if image is None or not points or len(points) < 3:
        return None
    height, width = image.shape[:2]
    mask = np.zeros((height, width), dtype=np.uint8)
    contour = np.round(normalize_points(points)).astype(np.int32)
    cv2.fillPoly(mask, [contour], 255)
    for hole in holes or []:
        if hole and len(hole) >= 3:
            cv2.fillPoly(mask, [np.round(normalize_points(hole)).astype(np.int32)], 0)

    pixels = image[mask > 0]
    if pixels.size == 0:
        return None

    quantized = (pixels // bin_size).astype(np.int16)
    bins, counts = np.unique(quantized, axis=0, return_counts=True)
    dominant_bin = bins[int(np.argmax(counts))]
    selected = pixels[np.all(quantized == dominant_bin, axis=1)]
    if selected.size == 0:
        selected = pixels
    mean_bgr = np.mean(selected, axis=0)
    return [int(round(mean_bgr[2])), int(round(mean_bgr[1])), int(round(mean_bgr[0]))]


def recalculate_polygon_colors(polygons, polygon_data):
    """Update each polygon color_rgb from the dominant similar source-image color."""
    image_path = image_path_from_polygon_data(polygon_data)
    image = cv2.imread(str(image_path)) if image_path else None
    if image is None:
        return polygons
    for poly in polygons:
        color = dominant_polygon_color_rgb(
            image,
            poly.get("points_source"),
            holes=poly.get("holes_source"),
        )
        if not color:
            continue
        poly["color_rgb"] = color
        poly["color_recalculated"] = {
            "source": "dominant_similar_color",
            "color_space": "bgr_quantized",
            "bin_size": COLOR_BIN_SIZE,
        }
    return polygons


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
        if connection.get("from_points_source"):
            connection["from_points_transformed"] = transform_source_points(
                connection["from_points_source"],
                matrix,
                shift=shift,
            )
        if connection.get("to_points_source"):
            connection["to_points_transformed"] = transform_source_points(
                connection["to_points_source"],
                matrix,
                shift=shift,
            )
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
    recalculate_polygon_colors(final_polygons, polygon_data)

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
        "station_metadata": annotations.get("station_metadata") or {},
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
        "zones": annotations.get("manual_zones", []),
        "connections": connections,
        "platforms": annotations.get("manual_platforms", []),
    }


def build_working_final_payload(polygons_path, working_polygons, annotations, transform_metadata=None):
    """Build final_polygons.json directly from the editor working polygon set."""
    polygon_path = Path(polygons_path) if polygons_path else None
    if polygon_path and polygon_path.exists():
        polygon_data = load_json(polygon_path)
    else:
        polygon_data = {
            "image": {},
            "extraction": {"source": "editor_working_polygons"},
            "polygons": working_polygons,
        }
    polygons = [dict(poly) for poly in working_polygons]
    layers = annotations.get("polygon_layers", {})
    for poly in polygons:
        poly.setdefault("semantic", dict(DEFAULT_SEMANTIC))
        if layers.get(poly.get("polygon_id")):
            poly["semantic"]["layer"] = layers[poly["polygon_id"]]
    recalculate_polygon_colors(polygons, polygon_data)

    if transform_metadata:
        matrix = transform_metadata["perspective_matrix"]
        source_polygons = polygon_data.get("polygons", [])
        raw_transformed = [
            cv2.perspectiveTransform(normalize_points(poly["points_source"]).reshape((-1, 1, 2)), matrix).reshape((-1, 2))
            for poly in source_polygons
            if poly.get("points_source")
        ]
        shift = calculate_auto_center_shift_from_points(raw_transformed) if raw_transformed else [0.0, 0.0]
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
        "station_metadata": annotations.get("station_metadata") or {},
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
        "zones": annotations.get("manual_zones", []),
        "connections": connections,
        "platforms": annotations.get("manual_platforms", []),
    }


def parse_layer_z(value):
    """Parse optional explicit layer z mapping such as 'B1=0,B2=-5'."""
    mapping = {}
    if not value:
        return mapping
    for item in value.split(","):
        if not item.strip():
            continue
        key, z_value = item.split("=", 1)
        mapping[key.strip()] = float(z_value.strip())
    return mapping


def layer_z_from_height(layer, default_z=0.0, floor_height=5.0, layer_z=None):
    """Return z from explicit layer_z override or layer index multiplied by floor height."""
    layer_z = layer_z or {}
    if layer in layer_z:
        return float(layer_z[layer])
    if layer in DEFAULT_LAYER_INDEX:
        return float(default_z) + float(DEFAULT_LAYER_INDEX[layer]) * float(floor_height)
    if layer in DEFAULT_LAYER_Z:
        return float(default_z) + float(DEFAULT_LAYER_Z[layer]) * float(floor_height)
    return float(default_z)


def polygon_layer(poly, annotations=None):
    """Return layer value from a polygon semantic field."""
    annotations = annotations or {}
    polygon_id = poly.get("polygon_id")
    annotation_layer = annotations.get("polygon_layers", {}).get(polygon_id)
    if annotation_layer:
        return annotation_layer
    return (poly.get("semantic") or {}).get("layer")


def polygon_z_value(poly, annotations=None, layer_z=None, default_z=0.0, floor_height=5.0):
    """Return the scene z value for a polygon, honoring per-polygon overrides."""
    annotations = annotations or {}
    layer_z = layer_z or {}
    polygon_id = poly.get("polygon_id")
    layer = polygon_layer(poly, annotations=annotations)
    base_z = layer_z_from_height(layer, default_z=default_z, floor_height=floor_height, layer_z=layer_z)
    z_offsets = annotations.get("polygon_z_offsets") or {}
    if polygon_id in z_offsets and z_offsets[polygon_id] not in (None, ""):
        return base_z + float(z_offsets[polygon_id])
    z_values = annotations.get("polygon_z_values") or {}
    if polygon_id in z_values and z_values[polygon_id] not in (None, ""):
        return float(z_values[polygon_id])
    return base_z


def polygon_id_z_value(polygon_id, layer, annotations=None, layer_z=None, default_z=0.0, floor_height=5.0):
    """Return z for a referenced polygon id and fallback layer."""
    annotations = annotations or {}
    base_z = layer_z_from_height(layer, default_z=default_z, floor_height=floor_height, layer_z=layer_z)
    z_offsets = annotations.get("polygon_z_offsets") or {}
    if polygon_id in z_offsets and z_offsets[polygon_id] not in (None, ""):
        return base_z + float(z_offsets[polygon_id])
    z_values = annotations.get("polygon_z_values") or {}
    if polygon_id in z_values and z_values[polygon_id] not in (None, ""):
        return float(z_values[polygon_id])
    return base_z


def point_in_polygon_xy(point, points):
    """Return true when an XY point is inside a polygon ring."""
    if not point or not points or len(points) < 3:
        return False
    x, y = float(point[0]), float(point[1])
    inside = False
    j = len(points) - 1
    for i in range(len(points)):
        xi, yi = float(points[i][0]), float(points[i][1])
        xj, yj = float(points[j][0]), float(points[j][1])
        if ((yi > y) != (yj > y)) and (x < ((xj - xi) * (y - yi)) / ((yj - yi) or 1e-9) + xi):
            inside = not inside
        j = i
    return inside


def polygon_contains_source_point(poly, point):
    """Return true when a source point is inside a polygon and outside holes."""
    if not point_in_polygon_xy(point, poly.get("points_source")):
        return False
    for hole in poly.get("holes_source") or []:
        if point_in_polygon_xy(point, hole):
            return False
    return True


def point_to_bbox_distance(point, bbox):
    """Return distance from a point to a source bbox."""
    if not point or not bbox or len(bbox) < 4:
        return float("inf")
    x, y = float(point[0]), float(point[1])
    bx, by, bw, bh = [float(value) for value in bbox[:4]]
    dx = max(bx - x, 0.0, x - (bx + bw))
    dy = max(by - y, 0.0, y - (by + bh))
    return float(np.hypot(dx, dy))


def nearest_polygon_to_source_point(polygons, point):
    """Return the polygon whose source bbox is nearest to a point."""
    best = None
    for poly in polygons or []:
        distance = point_to_bbox_distance(point, poly.get("bbox_source"))
        if best is None or distance < best[0]:
            best = (distance, poly)
    return best


def icon_polygon_context(icon, polygons, annotations=None, layer_z=None, default_z=0.0, floor_height=5.0):
    """Find containing polygon/layer/z context for an icon center."""
    center = icon.get("center")
    if not center:
        return None, None, default_z, "default", None
    for poly in polygons or []:
        if polygon_contains_source_point(poly, center):
            layer = polygon_layer(poly, annotations=annotations)
            z_value = polygon_z_value(
                poly,
                annotations=annotations,
                layer_z=layer_z,
                default_z=default_z,
                floor_height=floor_height,
            )
            return poly.get("polygon_id"), layer, z_value, "contains", 0.0
    nearest = nearest_polygon_to_source_point(polygons, center)
    if nearest:
        distance, poly = nearest
        layer = polygon_layer(poly, annotations=annotations)
        z_value = polygon_z_value(
            poly,
            annotations=annotations,
            layer_z=layer_z,
            default_z=default_z,
            floor_height=floor_height,
        )
        return poly.get("polygon_id"), layer, z_value, "nearest_plane", distance
    return None, None, default_z, "default", None


def source_bbox_to_scene_size(bbox, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Convert a source bbox to approximate scene XY size."""
    if not bbox or len(bbox) < 4:
        return [1.0, 1.0]
    x, y, w, h = [float(value) for value in bbox[:4]]
    p1 = scene_xy_from_point([x, y], transform_metadata, transform_info, scale=scale, invert_x=invert_x, invert_y=invert_y)
    p2 = scene_xy_from_point([x + w, y + h], transform_metadata, transform_info, scale=scale, invert_x=invert_x, invert_y=invert_y)
    return [abs(float(p2[0]) - float(p1[0])), abs(float(p2[1]) - float(p1[1]))]


def build_scene_icon_records(icon_matches, polygons, annotations=None, transform_metadata=None, transform_info=None, scale=0.01, layer_z=None, floor_height=5.0, default_z=0.0, invert_x=False, invert_y=False, alignment_transforms=None):
    """Build exportable icon records from icon matching results."""
    if not icon_matches:
        return []
    records = []
    for icon in icon_matches.get("icons", []):
        center = icon.get("center")
        if not center:
            continue
        polygon_id, layer, z_value, match_method, plane_distance = icon_polygon_context(
            icon,
            polygons,
            annotations=annotations,
            layer_z=layer_z,
            default_z=default_z,
            floor_height=floor_height,
        )
        xy = scene_xy_from_point(
            center,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        layer_transform = (alignment_transforms or {}).get(layer)
        if layer_transform is not None:
            xy = apply_xy_transform(xy, layer_transform)
        scene_size = source_bbox_to_scene_size(
            icon.get("bbox"),
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        record = dict(icon)
        record.update(
            {
                "polygon_id": polygon_id,
                "layer": layer,
                "center_source": center,
                "position": [float(xy[0]), float(xy[1]), float(z_value)],
                "location": [float(xy[0]), float(xy[1]), float(z_value)],
                "scale_xyz": [float(scene_size[0]), float(scene_size[1]), 1.0],
                "plane_match": {
                    "method": match_method,
                    "source_distance": plane_distance,
                },
            }
        )
        records.append(record)
    return records


def gate_instances_along_path(path_points, gate_count, z_value, asset_id):
    """Return per-gate locations and rotations along one transformed gate path."""
    if not path_points or len(path_points) < 2:
        return []
    count = max(1, int(gate_count or 1))
    segments = []
    total_length = 0.0
    for start, end in zip(path_points, path_points[1:]):
        dx = float(end[0]) - float(start[0])
        dy = float(end[1]) - float(start[1])
        length = float(np.hypot(dx, dy))
        if length <= 0:
            continue
        segments.append((start, end, length, total_length))
        total_length += length
    if total_length <= 0 or not segments:
        return []

    gates = []
    for index in range(count):
        target = total_length * ((index + 0.5) / count)
        segment = segments[-1]
        for candidate in segments:
            if candidate[3] + candidate[2] >= target:
                segment = candidate
                break
        start, end, length, offset = segment
        ratio = (target - offset) / length if length > 0 else 0.0
        x = float(start[0]) + (float(end[0]) - float(start[0])) * ratio
        y = float(start[1]) + (float(end[1]) - float(start[1])) * ratio
        rotation_z = float(np.degrees(np.arctan2(float(end[1]) - float(start[1]), float(end[0]) - float(start[0]))))
        gates.append(
            {
                "gate_id": f"{asset_id}_gate_{index + 1:03d}" if asset_id else f"gate_{index + 1:03d}",
                "index": index + 1,
                "location": [x, y, float(z_value)],
                "rotation_z": rotation_z,
            }
        )
    return gates


def build_manual_asset_records(annotations=None, transform_metadata=None, transform_info=None, scale=0.01, layer_z=None, floor_height=5.0, default_z=0.0, invert_x=False, invert_y=False, alignment_transforms=None, local_shift_offsets=None):
    """Build Blender assets from manually placed editor asset markers."""
    assets = []
    for asset in (annotations or {}).get("manual_assets", []):
        asset_type = asset.get("type") or "subway"
        if asset_type not in {"subway", "moving_walkway", "ticket_gate", "exit", "toilet"} or not asset.get("point_source"):
            continue
        layer = asset.get("layer")
        polygon_id = asset.get("polygon_id")
        z_value = polygon_id_z_value(
            polygon_id,
            layer,
            annotations=annotations,
            layer_z=layer_z,
            default_z=default_z,
            floor_height=floor_height,
        )
        xy = scene_xy_for_polygon_point(
            asset.get("point_source"),
            layer,
            polygon_id=polygon_id,
            alignment_transforms=alignment_transforms,
            local_shift_offsets=local_shift_offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        rotation_z = float(asset.get("rotation_z", 0.0))
        scale_value = asset.get("scale") or [8.0, 1.0, 1.0]
        path_source = asset.get("points_source") or []
        start_source = asset.get("start_point_source")
        end_source = asset.get("end_point_source")
        start_position = None
        end_position = None
        if asset_type == "ticket_gate" and path_source and len(path_source) >= 2:
            transformed_path = [
                scene_xy_for_polygon_point(
                    point,
                    layer,
                    polygon_id=polygon_id,
                    alignment_transforms=alignment_transforms,
                    local_shift_offsets=local_shift_offsets,
                    transform_metadata=transform_metadata,
                    transform_info=transform_info,
                    scale=scale,
                    invert_x=invert_x,
                    invert_y=invert_y,
                )
                for point in path_source
            ]
            gates = gate_instances_along_path(
                transformed_path,
                int(asset.get("gate_count") or 1),
                z_value,
                asset.get("asset_id"),
            )
            if gates:
                first = gates[0]["location"]
                last = gates[-1]["location"]
                dx = float(last[0]) - float(first[0])
                dy = float(last[1]) - float(first[1])
                rotation_z = gates[0]["rotation_z"]
                scale_value = [float(max(1, len(gates))), 1.0, 1.0]
        elif start_source and end_source:
            start_xy = scene_xy_for_polygon_point(
                start_source,
                layer,
                polygon_id=polygon_id,
                alignment_transforms=alignment_transforms,
                local_shift_offsets=local_shift_offsets,
                transform_metadata=transform_metadata,
                transform_info=transform_info,
                scale=scale,
                invert_x=invert_x,
                invert_y=invert_y,
            )
            end_xy = scene_xy_for_polygon_point(
                end_source,
                layer,
                polygon_id=polygon_id,
                alignment_transforms=alignment_transforms,
                local_shift_offsets=local_shift_offsets,
                transform_metadata=transform_metadata,
                transform_info=transform_info,
                scale=scale,
                invert_x=invert_x,
                invert_y=invert_y,
            )
            dx = float(end_xy[0]) - float(start_xy[0])
            dy = float(end_xy[1]) - float(start_xy[1])
            rotation_z = float(np.degrees(np.arctan2(dy, dx)))
            scale_value = [float(np.hypot(dx, dy)), 1.0, 1.0]
            gates = None
            start_position = [float(start_xy[0]), float(start_xy[1]), float(z_value)]
            end_position = [float(end_xy[0]), float(end_xy[1]), float(z_value)]
        else:
            gates = None
        facing_position = None
        if asset.get("facing_point_source"):
            facing_xy = scene_xy_for_polygon_point(
                asset["facing_point_source"],
                layer,
                polygon_id=polygon_id,
                alignment_transforms=alignment_transforms,
                local_shift_offsets=local_shift_offsets,
                transform_metadata=transform_metadata,
                transform_info=transform_info,
                scale=scale,
                invert_x=invert_x,
                invert_y=invert_y,
            )
            facing_position = [float(facing_xy[0]), float(facing_xy[1]), float(z_value)]
            rotation_z = float(np.degrees(np.arctan2(facing_position[1] - xy[1], facing_position[0] - xy[0])))
        record = {
            "asset_id": asset.get("asset_id"),
            "type": asset_type,
            "blend": asset.get("blend") or blend_name_for_manual_asset(asset_type),
            "label": asset.get("label"),
            "polygon_id": polygon_id,
            "layer": layer,
            "location": [float(xy[0]), float(xy[1]), float(z_value)],
            "rotation_z": rotation_z,
            "scale": [float(value) for value in scale_value],
            "point_source": asset.get("point_source"),
            "points_source": path_source if path_source else None,
            "start_point_source": start_source,
            "end_point_source": end_source,
            "start": start_position,
            "end": end_position,
            "facing_point_source": asset.get("facing_point_source"),
            "facing_position": facing_position,
            "toilet_gender": asset.get("toilet_gender") if asset_type == "toilet" else None,
            "gate_count": int(asset.get("gate_count") or 1) if asset_type == "ticket_gate" else None,
            "gate_type": asset.get("gate_type") if asset_type == "ticket_gate" else None,
            "navigation": asset.get("navigation") if asset_type in {"ticket_gate", "exit", "toilet"} else None,
            "local_shift_offset": [float(value) for value in polygon_offset(local_shift_offsets, polygon_id)] if polygon_offset(local_shift_offsets, polygon_id) else None,
        }
        if gates is not None:
            record["gates"] = gates
        assets.append(record)
    return assets


def build_elevator_point_records(annotations=None, transform_metadata=None, transform_info=None, scale=0.01, layer_z=None, floor_height=5.0, default_z=0.0, invert_x=False, invert_y=False, alignment_transforms=None, local_shift_offsets=None):
    """Build scene elevator access points grouped by manual elevator_id."""
    records = []
    for item in (annotations or {}).get("manual_elevator_points", []):
        point_source = item.get("point_source")
        if not point_source:
            continue
        layer = item.get("layer")
        polygon_id = item.get("polygon_id")
        z_value = polygon_id_z_value(
            polygon_id,
            layer,
            annotations=annotations,
            layer_z=layer_z,
            default_z=default_z,
            floor_height=floor_height,
        )
        xy = scene_xy_for_polygon_point(
            point_source,
            layer,
            polygon_id=polygon_id,
            alignment_transforms=alignment_transforms,
            local_shift_offsets=local_shift_offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        position = [float(xy[0]), float(xy[1]), float(z_value)]
        facing_position = None
        facing_angle_deg = item.get("facing_angle_deg")
        if item.get("facing_point_source"):
            facing_xy = scene_xy_for_polygon_point(
                item["facing_point_source"],
                layer,
                polygon_id=polygon_id,
                alignment_transforms=alignment_transforms,
                local_shift_offsets=local_shift_offsets,
                transform_metadata=transform_metadata,
                transform_info=transform_info,
                scale=scale,
                invert_x=invert_x,
                invert_y=invert_y,
            )
            facing_position = [float(facing_xy[0]), float(facing_xy[1]), float(z_value)]
            facing_angle_deg = float(np.degrees(np.arctan2(facing_position[1] - position[1], facing_position[0] - position[0])))
        records.append(
            {
                "elevator_point_id": item.get("elevator_point_id"),
                "elevator_id": item.get("elevator_id"),
                "type": "elevator_point",
                "label": item.get("label"),
                "polygon_id": polygon_id,
                "layer": layer,
                "point_source": point_source,
                "facing_point_source": item.get("facing_point_source"),
                "position": position,
                "facing_position": facing_position,
                "facing_angle_deg": facing_angle_deg,
                "exit": bool(item.get("exit")),
                "exit_number": item.get("exit_number"),
                "access_transition": item.get("access_transition") if item.get("exit") else None,
                "local_shift_offset": [float(value) for value in polygon_offset(local_shift_offsets, polygon_id)] if polygon_offset(local_shift_offsets, polygon_id) else None,
            }
        )
    return records


def navigation_node(node_id, node_type, layer, position, polygon_id=None, **extra):
    """Build one navigation node record."""
    record = {
        "node_id": node_id,
        "type": node_type,
        "layer": layer,
        "polygon_id": polygon_id,
        "position": [float(value) for value in position],
    }
    record.update({key: value for key, value in extra.items() if value is not None})
    return record


def navigation_edge(edge_id, from_node, to_node, edge_type, cost=None, bidirectional=True, **extra):
    """Build one navigation edge record."""
    record = {
        "edge_id": edge_id,
        "from": from_node,
        "to": to_node,
        "type": edge_type,
        "bidirectional": bool(bidirectional),
    }
    if cost is not None:
        record["cost"] = float(cost)
    record.update({key: value for key, value in extra.items() if value is not None})
    return record


def distance_3d(a, b):
    """Return Euclidean distance between two 3D points."""
    return float(np.linalg.norm(np.asarray(a, dtype=np.float64) - np.asarray(b, dtype=np.float64)))


def build_platform_records(annotations=None, transform_metadata=None, transform_info=None, scale=0.01, layer_z=None, floor_height=5.0, default_z=0.0, invert_x=False, invert_y=False, alignment_transforms=None, local_shift_offsets=None):
    """Build platform direction records and generated car-door navigation points."""
    records = []
    for platform in (annotations or {}).get("manual_platforms", []):
        platform_id = platform.get("platform_id") or platform.get("label")
        if not platform_id:
            continue
        layer = platform.get("layer")
        polygon_id = platform.get("polygon_id")
        z_value = polygon_id_z_value(
            polygon_id,
            layer,
            annotations=annotations,
            layer_z=layer_z,
            default_z=default_z,
            floor_height=floor_height,
        )
        if platform.get("type") == "platform_point" or platform.get("point_source"):
            point_source = platform.get("point_source")
            if not point_source:
                continue
            xy = scene_xy_for_polygon_point(
                point_source,
                layer,
                polygon_id=polygon_id,
                alignment_transforms=alignment_transforms,
                local_shift_offsets=local_shift_offsets,
                transform_metadata=transform_metadata,
                transform_info=transform_info,
                scale=scale,
                invert_x=invert_x,
                invert_y=invert_y,
            )
            position = [float(xy[0]), float(xy[1]), float(z_value)]
            facing_position = None
            facing_angle_deg = platform.get("facing_angle_deg")
            if platform.get("facing_point_source"):
                facing_xy = scene_xy_for_polygon_point(
                    platform["facing_point_source"],
                    layer,
                    polygon_id=polygon_id,
                    alignment_transforms=alignment_transforms,
                    local_shift_offsets=local_shift_offsets,
                    transform_metadata=transform_metadata,
                    transform_info=transform_info,
                    scale=scale,
                    invert_x=invert_x,
                    invert_y=invert_y,
                )
                facing_position = [float(facing_xy[0]), float(facing_xy[1]), float(z_value)]
                facing_angle_deg = float(np.degrees(np.arctan2(facing_position[1] - position[1], facing_position[0] - position[0])))
            nodes = [
                {
                    "node_id": platform_id,
                    "type": "platform_position",
                    "station_name": platform.get("station_name"),
                    "line_id": platform.get("line_id"),
                    "direction": platform.get("direction"),
                    "car_range": platform.get("car_range"),
                    "position": position,
                    "facing_angle_deg": facing_angle_deg,
                }
            ]
            records.append(
                {
                    "platform_id": platform_id,
                    "type": "platform_point",
                    "label": platform.get("label"),
                    "station_name": platform.get("station_name"),
                    "line_id": platform.get("line_id"),
                    "direction": platform.get("direction"),
                    "car_range": platform.get("car_range"),
                    "layer": layer,
                    "polygon_id": polygon_id,
                    "point_source": point_source,
                    "facing_point_source": platform.get("facing_point_source"),
                    "position": position,
                    "facing_position": facing_position,
                    "facing_angle_deg": facing_angle_deg,
                    "nodes": nodes,
                }
            )
            continue
        car_count = max(1, int(platform.get("car_count") or 1))
        doors_per_car = max(1, int(platform.get("doors_per_car") or 1))
        total_positions = car_count * doors_per_car
        anchors = []
        for anchor in platform.get("anchors") or []:
            if not anchor.get("point_source") or not anchor.get("car") or not anchor.get("door"):
                continue
            ordinal = int((int(anchor["car"]) - 1) * doors_per_car + int(anchor["door"]))
            xy = scene_xy_for_polygon_point(
                anchor["point_source"],
                layer,
                polygon_id=polygon_id,
                alignment_transforms=alignment_transforms,
                local_shift_offsets=local_shift_offsets,
                transform_metadata=transform_metadata,
                transform_info=transform_info,
                scale=scale,
                invert_x=invert_x,
                invert_y=invert_y,
            )
            anchors.append(
                {
                    "car": int(anchor["car"]),
                    "door": int(anchor["door"]),
                    "ordinal": ordinal,
                    "point_source": anchor["point_source"],
                    "position": [float(xy[0]), float(xy[1]), float(z_value)],
                    "near_connection_id": anchor.get("near_connection_id"),
                }
            )
        if not anchors and platform.get("start_point_source") and platform.get("end_point_source"):
            anchors = [
                {
                    "car": 1,
                    "door": 1,
                    "ordinal": 1,
                    "point_source": platform["start_point_source"],
                },
                {
                    "car": car_count,
                    "door": doors_per_car,
                    "ordinal": total_positions,
                    "point_source": platform["end_point_source"],
                },
            ]
            for anchor in anchors:
                xy = scene_xy_for_polygon_point(
                    anchor["point_source"],
                    layer,
                    polygon_id=polygon_id,
                    alignment_transforms=alignment_transforms,
                    local_shift_offsets=local_shift_offsets,
                    transform_metadata=transform_metadata,
                    transform_info=transform_info,
                    scale=scale,
                    invert_x=invert_x,
                    invert_y=invert_y,
                )
                anchor["position"] = [float(xy[0]), float(xy[1]), float(z_value)]
                anchor["near_connection_id"] = None
        anchors = sorted(anchors, key=lambda item: item["ordinal"])
        if len(anchors) < 2:
            continue

        def interpolate_position(ordinal):
            if ordinal <= anchors[0]["ordinal"]:
                left, right = anchors[0], anchors[1]
            elif ordinal >= anchors[-1]["ordinal"]:
                left, right = anchors[-2], anchors[-1]
            else:
                left, right = anchors[0], anchors[-1]
                for index in range(len(anchors) - 1):
                    if anchors[index]["ordinal"] <= ordinal <= anchors[index + 1]["ordinal"]:
                        left, right = anchors[index], anchors[index + 1]
                        break
            span = right["ordinal"] - left["ordinal"]
            t = 0.0 if span == 0 else (ordinal - left["ordinal"]) / span
            return [
                float(left["position"][0]) + (float(right["position"][0]) - float(left["position"][0])) * t,
                float(left["position"][1]) + (float(right["position"][1]) - float(left["position"][1])) * t,
                float(z_value),
            ]

        nodes = []
        for car in range(1, car_count + 1):
            for door in range(1, doors_per_car + 1):
                ordinal = (car - 1) * doors_per_car + door
                position = interpolate_position(ordinal)
                nodes.append(
                    {
                        "node_id": f"{platform_id}_car_{car}_door_{door}",
                        "type": "platform_position",
                        "car": car,
                        "door": door,
                        "car_door": f"{car}-{door}",
                        "ordinal": ordinal,
                        "position": position,
                    }
                )
        records.append(
            {
                "platform_id": platform_id,
                "type": platform.get("type", "platform_direction"),
                "label": platform.get("label"),
                "station_name": platform.get("station_name"),
                "line_id": platform.get("line_id"),
                "direction": platform.get("direction"),
                "car_range": platform.get("car_range"),
                "car_order": platform.get("car_order"),
                "layer": layer,
                "polygon_id": polygon_id,
                "car_count": car_count,
                "doors_per_car": doors_per_car,
                "anchors": anchors,
                "start_point_source": anchors[0]["point_source"],
                "end_point_source": anchors[-1]["point_source"],
                "start_position": anchors[0]["position"],
                "end_position": anchors[-1]["position"],
                "nodes": nodes,
            }
        )
    return records


def zone_type_for_position(position, layer, zone_records=None, default_zone_type="public"):
    """Return the zone type for one scene-space node position."""
    if not position:
        return default_zone_type
    point = [float(position[0]), float(position[1])]
    for zone in zone_records or []:
        if layer and zone.get("layer") and zone.get("layer") != layer:
            continue
        points = zone.get("points_xy") or [[vertex[0], vertex[1]] for vertex in zone.get("vertices", [])]
        if point_in_polygon_xy(point, points):
            return zone.get("zone_type") or default_zone_type
    return default_zone_type


def build_navigation_graph(connection_records, icon_records=None, manual_assets=None, platform_records=None, elevator_point_records=None, zone_records=None, default_zone_type="public"):
    """Build a lightweight graph for Unity NavMesh-assisted routing."""
    nodes = []
    edges = []
    nodes_by_layer = {}

    def add_node(node):
        node.setdefault(
            "zone_type",
            zone_type_for_position(
                node.get("position"),
                node.get("layer"),
                zone_records=zone_records,
                default_zone_type=default_zone_type,
            ),
        )
        nodes.append(node)
        if node.get("layer"):
            nodes_by_layer.setdefault(node["layer"], []).append(node["node_id"])

    for connection in connection_records or []:
        connection_id = connection.get("connection_id")
        if not connection_id:
            continue
        from_data = connection.get("from") or {}
        to_data = connection.get("to") or {}
        from_pos = from_data.get("position")
        to_pos = to_data.get("position")
        if not from_pos or not to_pos:
            continue
        connector_type = connection.get("asset_type") or connection.get("type") or "connector"
        from_node_id = f"{connection_id}_from"
        to_node_id = f"{connection_id}_to"
        add_node(
            navigation_node(
                from_node_id,
                "connector",
                from_data.get("layer"),
                from_pos,
                polygon_id=from_data.get("polygon_id"),
                connector_id=connection_id,
                connector_type=connector_type,
                exit_number=connection.get("exit_number"),
                endpoint="from",
            )
        )
        add_node(
            navigation_node(
                to_node_id,
                "connector",
                to_data.get("layer"),
                to_pos,
                polygon_id=to_data.get("polygon_id"),
                connector_id=connection_id,
                connector_type=connector_type,
                exit_number=connection.get("exit_number"),
                endpoint="to",
            )
        )
        edges.append(
            navigation_edge(
                f"{connection_id}_edge",
                from_node_id,
                to_node_id,
                "exit" if connection.get("type") in {"exit_stair", "exit_escalator"} else "vertical",
                cost=distance_3d(from_pos, to_pos),
                bidirectional=connection.get("bidirectional", True),
                connector_id=connection_id,
                connector_type=connector_type,
                exit_number=connection.get("exit_number"),
            )
        )

    for asset in manual_assets or []:
        if asset.get("type") not in {"subway", "moving_walkway", "ticket_gate", "exit", "toilet"} or not asset.get("location"):
            continue
        asset_id = asset.get("asset_id") or asset.get("label")
        if not asset_id:
            continue
        is_gate = asset.get("type") == "ticket_gate"
        is_exit = asset.get("type") == "exit"
        is_toilet = asset.get("type") == "toilet"
        navigation_extra = asset.get("navigation") or {}
        add_node(
            navigation_node(
                f"{asset_id}_node",
                "gate" if is_gate else ("exit" if is_exit else ("poi" if is_toilet else "asset")),
                asset.get("layer"),
                asset.get("location"),
                polygon_id=asset.get("polygon_id"),
                asset_id=asset_id,
                asset_type=asset.get("type"),
                label=asset.get("label"),
                gate_type=asset.get("gate_type") if is_gate else None,
                poi_type="toilet" if is_toilet else None,
                toilet_gender=asset.get("toilet_gender") if is_toilet else None,
                facing_angle_deg=asset.get("rotation_z") if is_toilet else None,
                access_transition=navigation_extra.get("access_transition") if (is_gate or is_exit) else None,
                cost=navigation_extra.get("cost") if (is_gate or is_exit or is_toilet) else None,
            )
        )

    for icon in icon_records or []:
        icon_id = icon.get("icon_id") or icon.get("id")
        position = icon.get("position") or icon.get("location")
        if not icon_id or not position:
            continue
        icon_type = icon.get("type") or icon.get("category") or icon.get("template_class")
        add_node(
            navigation_node(
                f"{icon_id}_poi",
                "poi",
                icon.get("layer"),
                position,
                polygon_id=icon.get("polygon_id"),
                poi_id=icon_id,
                poi_type=icon_type,
            )
        )

    for platform in platform_records or []:
        previous_node_id = None
        previous_position = None
        for platform_node in platform.get("nodes", []):
            node_id = platform_node.get("node_id")
            position = platform_node.get("position")
            if not node_id or not position:
                continue
            add_node(
                navigation_node(
                    node_id,
                    "platform_position",
                    platform.get("layer"),
                    position,
                    polygon_id=platform.get("polygon_id"),
                    platform_id=platform.get("platform_id"),
                    station_name=platform.get("station_name") or platform_node.get("station_name"),
                    line_id=platform.get("line_id"),
                    direction=platform.get("direction"),
                    car_range=platform.get("car_range") or platform_node.get("car_range"),
                    facing_angle_deg=platform_node.get("facing_angle_deg"),
                    car=platform_node.get("car"),
                    door=platform_node.get("door"),
                    car_door=platform_node.get("car_door"),
                )
            )
            if previous_node_id and previous_position:
                edges.append(
                    navigation_edge(
                        f"{previous_node_id}_to_{node_id}",
                        previous_node_id,
                        node_id,
                        "platform_walk",
                        cost=distance_3d(previous_position, position),
                        bidirectional=True,
                        platform_id=platform.get("platform_id"),
                    )
                )
            previous_node_id = node_id
            previous_position = position

    elevator_groups = {}
    for elevator in elevator_point_records or []:
        elevator_point_id = elevator.get("elevator_point_id")
        position = elevator.get("position")
        if not elevator_point_id or not position:
            continue
        node_id = f"{elevator_point_id}_node"
        is_exit_elevator = bool(elevator.get("exit"))
        add_node(
            navigation_node(
                node_id,
                "exit_elevator" if is_exit_elevator else "elevator",
                elevator.get("layer"),
                position,
                polygon_id=elevator.get("polygon_id"),
                elevator_id=elevator.get("elevator_id"),
                elevator_point_id=elevator_point_id,
                label=elevator.get("label"),
                facing_angle_deg=elevator.get("facing_angle_deg"),
                exit_number=elevator.get("exit_number") if is_exit_elevator else None,
                access_transition=elevator.get("access_transition") if is_exit_elevator else None,
            )
        )
        elevator_groups.setdefault(elevator.get("elevator_id") or "elevator", []).append((node_id, position))
    for elevator_id, items in elevator_groups.items():
        for index in range(len(items)):
            for next_index in range(index + 1, len(items)):
                from_node, from_position = items[index]
                to_node, to_position = items[next_index]
                edges.append(
                    navigation_edge(
                        f"{elevator_id}_{index + 1}_to_{next_index + 1}",
                        from_node,
                        to_node,
                        "elevator",
                        cost=distance_3d(from_position, to_position),
                        bidirectional=True,
                        elevator_id=elevator_id,
                    )
                )

    return {
        "metadata": {
            "format": "navigation_graph",
            "graph_mode": "unity_navmesh_assisted_v1",
            "same_layer_routing": "unity_navmesh",
            "same_layer_edges": "computed_in_unity",
            "vertical_edges": "exported",
            "default_zone_type": default_zone_type,
        },
        "nodes": nodes,
        "edges": edges,
        "nodes_by_layer": nodes_by_layer,
    }


def color_rgba(color_rgb, alpha=1.0):
    """Convert 0-255 RGB into normalized RGBA used by plane_with_color.json."""
    rgb = color_rgb or [180, 180, 180]
    return [float(rgb[0]) / 255.0, float(rgb[1]) / 255.0, float(rgb[2]) / 255.0, float(alpha)]


def scene_xy_from_point(point, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Convert a source-space point into scene export XY coordinates."""
    x, y = point
    if transform_metadata and transform_info:
        transformed = transform_source_points(
            [[x, y]],
            transform_metadata["perspective_matrix"],
            shift=transform_info["auto_center_shift"],
        )[0]
        x, y = transformed
    out_x = -float(x) if invert_x else float(x)
    out_y = -float(y) if invert_y else float(y)
    return [out_x * scale, out_y * scale]


def calibrated_scene_scale(annotations, transform_metadata=None, transform_info=None, base_scale=0.01, invert_x=False, invert_y=False):
    """Return the scene scale adjusted by an optional measured line calibration."""
    calibration = (annotations or {}).get("scale_calibration") or {}
    points = calibration.get("points_source") or []
    real_length = calibration.get("real_length")
    if len(points) != 2 or not real_length:
        return float(base_scale), None
    p1 = scene_xy_from_point(points[0], transform_metadata, transform_info, scale=1.0, invert_x=invert_x, invert_y=invert_y)
    p2 = scene_xy_from_point(points[1], transform_metadata, transform_info, scale=1.0, invert_x=invert_x, invert_y=invert_y)
    pixel_length = float(np.hypot(p2[0] - p1[0], p2[1] - p1[1]))
    if pixel_length <= 1e-9:
        return float(base_scale), None
    effective_scale = float(real_length) / pixel_length
    return effective_scale, {
        "mode": "line_length",
        "points_source": points,
        "real_length": float(real_length),
        "unit": calibration.get("unit") or "scene_unit",
        "pixel_length_transformed": pixel_length,
        "base_scale": float(base_scale),
        "effective_scale": effective_scale,
    }


def identity_xy_transform():
    """Return an identity 2D homogeneous transform."""
    return np.eye(3, dtype=np.float64)


def xy_transform_to_list(matrix):
    """Convert a 3x3 transform matrix to plain JSON values."""
    return [[float(value) for value in row] for row in np.asarray(matrix, dtype=np.float64)]


def invert_xy_transform(matrix):
    """Return the inverse of a 2D homogeneous transform."""
    return np.linalg.inv(np.asarray(matrix, dtype=np.float64))


def apply_xy_transform(point, matrix):
    """Apply a 2D homogeneous transform to one XY point."""
    x, y = point
    result = np.asarray(matrix, dtype=np.float64) @ np.array([float(x), float(y), 1.0], dtype=np.float64)
    return [float(result[0]), float(result[1])]


def apply_layer_transform_to_vertices(vertices, matrix):
    """Apply a layer XY transform to 3D vertices while preserving z."""
    if matrix is None:
        return vertices
    transformed = []
    for x, y, z in vertices:
        out_x, out_y = apply_xy_transform([x, y], matrix)
        transformed.append([out_x, out_y, float(z)])
    return transformed


def scene_xy_from_transformed_point(point, scale=0.01, invert_x=False, invert_y=False):
    """Convert one transformed 2D point to scene XY before layer alignment."""
    x, y = point
    out_x = -float(x) if invert_x else float(x)
    out_y = -float(y) if invert_y else float(y)
    return [out_x * float(scale), out_y * float(scale)]


def axis_correction_scene_points(correction, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Return local-axis correction reference points in scene XY."""
    raw_points = [
        correction.get("origin"),
        correction.get("x_axis_point"),
        correction.get("y_axis_point") or correction.get("z_axis_point"),
    ]
    if any(not point or len(point) < 2 for point in raw_points):
        return None
    scene_points = [
        scene_xy_from_point(
            point,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        for point in raw_points
    ]
    return scene_points


def orthogonal_target_basis(origin, x_point, y_point):
    """Build a 90-degree target basis from two clicked local axes."""
    origin = np.asarray(origin, dtype=np.float64)
    x_point = np.asarray(x_point, dtype=np.float64)
    y_point = np.asarray(y_point, dtype=np.float64)
    vx = x_point - origin
    vy = y_point - origin
    len_x = float(np.linalg.norm(vx))
    len_y = float(np.linalg.norm(vy))
    if len_x <= 1e-9 or len_y <= 1e-9:
        return None
    unit_x = vx / len_x
    perp = np.array([-unit_x[1], unit_x[0]], dtype=np.float64)
    if float(np.dot(perp, vy)) < 0:
        perp = -perp
    return unit_x * len_x, perp * len_y


def apply_local_axis_correction_to_scene_xy(points_xy, correction_points):
    """Rectify scene XY points using a 3-point local orthogonal axis correction."""
    if not correction_points or len(correction_points) != 3:
        return points_xy, None
    origin, x_point, y_point = [np.asarray(point, dtype=np.float64) for point in correction_points]
    source_x = x_point - origin
    source_y = y_point - origin
    source_basis = np.column_stack([source_x, source_y])
    if abs(float(np.linalg.det(source_basis))) <= 1e-9:
        return points_xy, None
    target_basis = orthogonal_target_basis(origin, x_point, y_point)
    if target_basis is None:
        return points_xy, None
    target_x, target_y = target_basis
    inverse_source = np.linalg.inv(source_basis)
    corrected = []
    for point in points_xy:
        point_array = np.asarray(point, dtype=np.float64)
        local = inverse_source @ (point_array - origin)
        out = origin + (target_x * local[0]) + (target_y * local[1])
        corrected.append([float(out[0]), float(out[1])])
    return corrected, {
        "type": "orthogonal_3point",
        "origin_scene_xy": [float(origin[0]), float(origin[1])],
        "x_axis_scene_xy": [float(x_point[0]), float(x_point[1])],
        "y_axis_scene_xy": [float(y_point[0]), float(y_point[1])],
        "target_angle_degrees": 90.0,
    }


def signed_area_xy(vertices):
    """Return signed XY area for 2D/3D vertices."""
    if not vertices or len(vertices) < 3:
        return 0.0
    area = 0.0
    for index, point in enumerate(vertices):
        next_point = vertices[(index + 1) % len(vertices)]
        area += float(point[0]) * float(next_point[1]) - float(next_point[0]) * float(point[1])
    return area / 2.0


def ensure_winding(vertices, clockwise=False):
    """Return vertices ordered clockwise or counter-clockwise in XY."""
    if not vertices or len(vertices) < 3:
        return vertices
    area = signed_area_xy(vertices)
    if clockwise:
        return vertices if area < 0 else list(reversed(vertices))
    return vertices if area > 0 else list(reversed(vertices))


def valid_source_line(points):
    """Return true when a source line has two 2D points."""
    return isinstance(points, list) and len(points) == 2 and all(isinstance(point, list) and len(point) >= 2 for point in points)


def scene_xy_for_connection_point(point, layer, alignment_transforms=None, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Convert one manual connection point to aligned scene XY."""
    xy = scene_xy_from_point(
        point,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=scale,
        invert_x=invert_x,
        invert_y=invert_y,
    )
    layer_transform = (alignment_transforms or {}).get(layer)
    return apply_xy_transform(xy, layer_transform) if layer_transform is not None else xy


def scene_line_from_source_points(points, layer, z_value, polygon_id=None, alignment_transforms=None, local_shift_offsets=None, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Convert a two-point source line to scene XYZ coordinates."""
    if not valid_source_line(points):
        return None
    line = []
    for point in points:
        xy = scene_xy_for_polygon_point(
            point,
            layer,
            polygon_id=polygon_id,
            alignment_transforms=alignment_transforms,
            local_shift_offsets=local_shift_offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        line.append([float(xy[0]), float(xy[1]), float(z_value)])
    return line


def synthesize_connection_line(center, other_center, width=1.0):
    """Build a small line around a legacy two-point connection endpoint."""
    dx = float(other_center[0]) - float(center[0])
    dy = float(other_center[1]) - float(center[1])
    length = float(np.hypot(dx, dy))
    if length <= 1e-9:
        perp_x, perp_y = 0.0, 1.0
    else:
        perp_x, perp_y = -dy / length, dx / length
    half = float(width) / 2.0
    return [
        [float(center[0]) - perp_x * half, float(center[1]) - perp_y * half, float(center[2])],
        [float(center[0]) + perp_x * half, float(center[1]) + perp_y * half, float(center[2])],
    ]


def order_vertical_connection_lines_for_blender(start_line, end_line):
    """Return connection line pairs ordered from low z to high z."""
    if not start_line or not end_line:
        return start_line, end_line
    start_z = sum(float(point[2]) for point in start_line) / len(start_line)
    end_z = sum(float(point[2]) for point in end_line) / len(end_line)
    if start_z > end_z:
        start_line, end_line = end_line, start_line
    return start_line, end_line


def estimate_xy_transform(source_points, target_points):
    """Estimate a source-to-target XY transform from alignment correspondences."""
    if not source_points or not target_points:
        return identity_xy_transform(), "identity", 0
    src = np.asarray(source_points, dtype=np.float64)
    dst = np.asarray(target_points, dtype=np.float64)
    count = min(len(src), len(dst))
    src = src[:count]
    dst = dst[:count]
    if count == 1:
        delta = dst[0] - src[0]
        matrix = identity_xy_transform()
        matrix[0, 2] = float(delta[0])
        matrix[1, 2] = float(delta[1])
        return matrix, "translation", count
    eps = 1e-6
    src_x = src[:, 0]
    src_y = src[:, 1]
    dst_x = dst[:, 0]
    dst_y = dst[:, 1]
    if float(np.max(src_x) - np.min(src_x)) > eps:
        sx, tx = np.polyfit(src_x, dst_x, 1)
    else:
        sx = 1.0
        tx = float(np.mean(dst_x - src_x))
    if float(np.max(src_y) - np.min(src_y)) > eps:
        sy, ty = np.polyfit(src_y, dst_y, 1)
    else:
        sy = 1.0
        ty = float(np.mean(dst_y - src_y))
    if sx < 0:
        sx = abs(float(sx))
        tx = float(np.mean(dst_x - sx * src_x))
    if sy < 0:
        sy = abs(float(sy))
        ty = float(np.mean(dst_y - sy * src_y))
    return np.array(
        [
            [float(sx), 0.0, float(tx)],
            [0.0, float(sy), float(ty)],
            [0.0, 0.0, 1.0],
        ],
        dtype=np.float64,
    ), "scale_translate_xy", count


def grouped_alignment_pairs(alignment_pairs, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Group alignment point correspondences by unordered layer pair."""
    groups = {}
    for pair in alignment_pairs or []:
        from_layer = pair.get("from_layer")
        to_layer = pair.get("to_layer")
        from_point = pair.get("from_point_source") or pair.get("from_point")
        to_point = pair.get("to_point_source") or pair.get("to_point")
        if not from_layer or not to_layer or not from_point or not to_point or from_layer == to_layer:
            continue
        key = tuple(sorted([from_layer, to_layer]))
        item = groups.setdefault(key, {key[0]: [], key[1]: []})
        item[from_layer].append(scene_xy_from_point(from_point, transform_metadata, transform_info, scale=scale, invert_x=invert_x, invert_y=invert_y))
        item[to_layer].append(scene_xy_from_point(to_point, transform_metadata, transform_info, scale=scale, invert_x=invert_x, invert_y=invert_y))
    return groups


def build_layer_alignment_transforms(alignment_pairs, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False, reference_layer=None):
    """Build cumulative layer XY transforms from alignment point pairs."""
    pairs = alignment_pairs or []
    if not pairs:
        return {}, None, []

    graph = {}
    layers = set()
    pair_metadata = []
    for (layer_a, layer_b), points_by_layer in grouped_alignment_pairs(
        pairs,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=scale,
        invert_x=invert_x,
        invert_y=invert_y,
    ).items():
        points_a = points_by_layer[layer_a]
        points_b = points_by_layer[layer_b]
        if not points_a or not points_b:
            continue
        b_to_a, method, count = estimate_xy_transform(points_b, points_a)
        a_to_b = invert_xy_transform(b_to_a)
        graph.setdefault(layer_a, []).append((layer_b, b_to_a))
        graph.setdefault(layer_b, []).append((layer_a, a_to_b))
        layers.update([layer_a, layer_b])
        pair_metadata.append(
            {
                "layers": [layer_a, layer_b],
                "method": method,
                "point_count": count,
                "transform_b_to_a": xy_transform_to_list(b_to_a),
                "transform_a_to_b": xy_transform_to_list(a_to_b),
            }
        )

    if not graph:
        return {}, None, []
    root = reference_layer if reference_layer in graph else ("B1" if "B1" in graph else sorted(layers)[0])
    transforms = {root: identity_xy_transform()}
    queue = [root]
    while queue:
        layer = queue.pop(0)
        for next_layer, next_to_layer in graph.get(layer, []):
            if next_layer in transforms:
                continue
            transforms[next_layer] = transforms[layer] @ next_to_layer
            queue.append(next_layer)
    return transforms, root, pair_metadata


def apply_xy_offset_to_vertices(vertices, offset):
    """Apply a 2D offset to 3D vertices."""
    if not offset:
        return vertices
    return [[float(x) + offset[0], float(y) + offset[1], float(z)] for x, y, z in vertices]


def add_xy_offset(point, offset):
    """Return a 2D point shifted by an optional XY offset."""
    if not offset:
        return [float(point[0]), float(point[1])]
    return [float(point[0]) + float(offset[0]), float(point[1]) + float(offset[1])]


def polygon_offset(local_shift_offsets, polygon_id):
    """Return the accumulated local shift offset for one polygon id."""
    return (local_shift_offsets or {}).get(polygon_id)


def scene_xy_for_polygon_point(point, layer, polygon_id=None, alignment_transforms=None, local_shift_offsets=None, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Convert one source point to scene XY with layer alignment and optional local polygon shift."""
    xy = scene_xy_for_connection_point(
        point,
        layer,
        alignment_transforms=alignment_transforms,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=scale,
        invert_x=invert_x,
        invert_y=invert_y,
    )
    return add_xy_offset(xy, polygon_offset(local_shift_offsets, polygon_id))


def build_local_shift_offsets(corrections, alignment_transforms=None, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Build accumulated scene-space local shift offsets keyed by polygon id."""
    offsets = {}
    metadata = []
    for correction in corrections or []:
        reference = correction.get("reference") or {}
        moving = correction.get("moving") or {}
        reference_point = reference.get("point_source")
        moving_point = moving.get("point_source")
        reference_polygon_id = reference.get("polygon_id")
        moving_polygon_id = moving.get("polygon_id")
        apply_to_polygon_ids = correction.get("apply_to_polygon_ids") or []
        if not reference_point or not moving_point or not apply_to_polygon_ids:
            continue
        reference_xy = scene_xy_for_polygon_point(
            reference_point,
            reference.get("layer"),
            polygon_id=reference_polygon_id,
            alignment_transforms=alignment_transforms,
            local_shift_offsets=offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        moving_xy = scene_xy_for_polygon_point(
            moving_point,
            moving.get("layer"),
            polygon_id=moving_polygon_id,
            alignment_transforms=alignment_transforms,
            local_shift_offsets=offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        delta = [float(reference_xy[0]) - float(moving_xy[0]), float(reference_xy[1]) - float(moving_xy[1])]
        for polygon_id in apply_to_polygon_ids:
            current = offsets.get(polygon_id, [0.0, 0.0])
            offsets[polygon_id] = [float(current[0]) + delta[0], float(current[1]) + delta[1]]
        metadata.append(
            {
                "correction_id": correction.get("correction_id"),
                "label": correction.get("label"),
                "type": "local_shift",
                "reference_polygon_id": reference_polygon_id,
                "moving_polygon_id": moving_polygon_id,
                "apply_to_polygon_ids": apply_to_polygon_ids,
                "delta_scene_xy": delta,
            }
        )
    return offsets, metadata


def build_zone_records(annotations=None, transform_metadata=None, transform_info=None, scale=0.01, layer_z=None, floor_height=5.0, default_z=0.0, invert_x=False, invert_y=False, alignment_transforms=None, local_shift_offsets=None):
    """Build scene-space zone regions used to tag navigation nodes."""
    annotations = annotations or {}
    records = []
    for zone in annotations.get("manual_zones", []) or []:
        points = zone.get("points_source") or []
        if len(points) < 3:
            continue
        layer = zone.get("layer")
        polygon_id = zone.get("polygon_id")
        z_value = polygon_id_z_value(
            polygon_id,
            layer,
            annotations=annotations,
            layer_z=layer_z,
            default_z=default_z,
            floor_height=floor_height,
        )
        points_xy = [
            scene_xy_for_polygon_point(
                point,
                layer,
                polygon_id=polygon_id,
                alignment_transforms=alignment_transforms,
                local_shift_offsets=local_shift_offsets,
                transform_metadata=transform_metadata,
                transform_info=transform_info,
                scale=scale,
                invert_x=invert_x,
                invert_y=invert_y,
            )
            for point in points
        ]
        records.append(
            {
                "zone_id": zone.get("zone_id"),
                "type": "zone_region",
                "zone_type": zone.get("zone_type") or "paid",
                "default_outside_zone_type": zone.get("default_outside_zone_type") or "public",
                "label": zone.get("label"),
                "layer": layer,
                "polygon_id": polygon_id,
                "source": zone.get("source"),
                "points_source": points,
                "points_xy": points_xy,
                "vertices": [[float(point[0]), float(point[1]), float(z_value)] for point in points_xy],
            }
        )
    return records


def build_plane_payload_from_records(polygons, walls, annotations=None, transform_metadata=None, transform_info=None, scale=0.01, default_z=0.0, layer_z=None, floor_height=5.0, invert_x=False, invert_y=False, icon_matches=None):
    """Build examples/plane_with_color.json-style planes from polygon records."""
    annotations = annotations or {}
    layer_z = layer_z or {}
    effective_scale, scale_calibration = calibrated_scene_scale(
        annotations,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        base_scale=scale,
        invert_x=invert_x,
        invert_y=invert_y,
    )
    alignment_transforms, reference_layer, alignment_pair_metadata = build_layer_alignment_transforms(
        annotations.get("layer_alignment_pairs", []),
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=effective_scale,
        invert_x=invert_x,
        invert_y=invert_y,
        reference_layer=annotations.get("layer_alignment_reference"),
    )
    local_shift_offsets, local_shift_metadata = build_local_shift_offsets(
        annotations.get("local_shift_corrections", []),
        alignment_transforms=alignment_transforms,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=effective_scale,
        invert_x=invert_x,
        invert_y=invert_y,
    )
    planes = []
    axis_corrections = annotations.get("polygon_axis_corrections") or {}
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
        z_value = polygon_z_value(poly, annotations=annotations, layer_z=layer_z, default_z=default_z, floor_height=floor_height)
        scene_xy_points = [
            scene_xy_from_transformed_point(point, scale=effective_scale, invert_x=invert_x, invert_y=invert_y)
            for point in points
        ]
        axis_metadata = None
        correction = axis_corrections.get(poly.get("polygon_id"))
        correction_points = axis_correction_scene_points(
            correction,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=effective_scale,
            invert_x=invert_x,
            invert_y=invert_y,
        ) if correction else None
        if correction_points:
            scene_xy_points, axis_metadata = apply_local_axis_correction_to_scene_xy(scene_xy_points, correction_points)
        vertices = [[float(x), float(y), float(z_value)] for x, y in scene_xy_points]
        layer_transform = alignment_transforms.get(layer)
        vertices = apply_layer_transform_to_vertices(vertices, layer_transform)
        local_shift_offset = polygon_offset(local_shift_offsets, poly.get("polygon_id"))
        vertices = apply_xy_offset_to_vertices(vertices, local_shift_offset)
        vertices = ensure_winding(vertices, clockwise=False)
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
        holes = []
        for hole in hole_sets:
            if len(hole) < 3:
                continue
            hole_xy = [
                scene_xy_from_transformed_point(point, scale=effective_scale, invert_x=invert_x, invert_y=invert_y)
                for point in hole
            ]
            if correction_points:
                hole_xy, _ = apply_local_axis_correction_to_scene_xy(hole_xy, correction_points)
            hole_vertices = [[float(x), float(y), float(z_value)] for x, y in hole_xy]
            hole_vertices = apply_layer_transform_to_vertices(hole_vertices, layer_transform)
            hole_vertices = apply_xy_offset_to_vertices(hole_vertices, local_shift_offset)
            holes.append(
                ensure_winding(
                    hole_vertices,
                    clockwise=True,
                )
            )
        planes.append(
            {
                "name": f"{layer}_{poly['polygon_id']}" if layer else poly["polygon_id"],
                "polygon_id": poly.get("polygon_id"),
                "source_polygon_ids": poly.get("source_polygon_ids"),
                "layer": layer,
                "z_value": z_value,
                "z_offset": (annotations.get("polygon_z_offsets") or {}).get(poly.get("polygon_id")),
                "z_override": (annotations.get("polygon_z_values") or {}).get(poly.get("polygon_id")),
                "color_rgb": poly.get("color_rgb"),
                "color": color_rgba(poly.get("color_rgb")),
                "vertices": vertices,
                "holes": holes,
                "local_axis_correction": axis_metadata,
                "alignment_transform": xy_transform_to_list(layer_transform) if layer_transform is not None else None,
                "local_shift_offset": [float(local_shift_offset[0]), float(local_shift_offset[1])] if local_shift_offset else None,
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
        z_value = layer_z_from_height(layer, default_z=default_z, floor_height=floor_height, layer_z=layer_z)
        height = float(wall.get("height", 1.0))
        layer_transform = alignment_transforms.get(layer)
        wall_polygon_id = (wall.get("source_polygon_ids") or [None])[0]
        wall_shift_offset = polygon_offset(local_shift_offsets, wall_polygon_id)
        for segment_index, (p1, p2) in enumerate(zip(wall_points, wall_points[1:]), start=1):
            y1 = -float(p1[1]) if invert_y else float(p1[1])
            y2 = -float(p2[1]) if invert_y else float(p2[1])
            x1 = -float(p1[0]) if invert_x else float(p1[0])
            x2 = -float(p2[0]) if invert_x else float(p2[0])
            wall_id = wall.get("wall_id")
            segment_id = wall_id if len(wall_points) == 2 else f"{wall_id}_seg_{segment_index:03d}"
            wall_vertices = apply_layer_transform_to_vertices(
                [
                    [x1 * effective_scale, y1 * effective_scale, z_value],
                    [x2 * effective_scale, y2 * effective_scale, z_value],
                    [x2 * effective_scale, y2 * effective_scale, z_value + height],
                    [x1 * effective_scale, y1 * effective_scale, z_value + height],
                ],
                layer_transform,
            )
            wall_vertices = apply_xy_offset_to_vertices(wall_vertices, wall_shift_offset)
            wall_records.append(
                {
                    "name": segment_id,
                    "wall_id": wall_id,
                    "segment_id": segment_id,
                    "segment_index": segment_index,
                    "source_polygon_ids": wall.get("source_polygon_ids"),
                    "type": wall.get("type", "shared_boundary_wall"),
                    "height": height,
                    "color": [0.8, 0.1, 0.1, 1.0],
                    "points_source": wall.get("points_source"),
                    "vertices": wall_vertices,
                    "alignment_transform": xy_transform_to_list(layer_transform) if layer_transform is not None else None,
                    "local_shift_offset": [float(wall_shift_offset[0]), float(wall_shift_offset[1])] if wall_shift_offset else None,
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
        from_xy = scene_xy_for_polygon_point(
            from_point,
            from_layer,
            polygon_id=connection.get("from_polygon_id"),
            alignment_transforms=alignment_transforms,
            local_shift_offsets=local_shift_offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=effective_scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        to_xy = scene_xy_for_polygon_point(
            to_point,
            to_layer,
            polygon_id=connection.get("to_polygon_id"),
            alignment_transforms=alignment_transforms,
            local_shift_offsets=local_shift_offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=effective_scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        from_transform = alignment_transforms.get(from_layer)
        to_transform = alignment_transforms.get(to_layer)
        from_z = polygon_id_z_value(connection.get("from_polygon_id"), from_layer, annotations=annotations, layer_z=layer_z, default_z=default_z, floor_height=floor_height)
        to_z = polygon_id_z_value(connection.get("to_polygon_id"), to_layer, annotations=annotations, layer_z=layer_z, default_z=default_z, floor_height=floor_height)
        if connection.get("type") in {"exit_stair", "exit_escalator"}:
            to_z = from_z + float(connection.get("exit_rise", floor_height))
        start_line = scene_line_from_source_points(
            connection.get("from_points_source"),
            from_layer,
            from_z,
            polygon_id=connection.get("from_polygon_id"),
            alignment_transforms=alignment_transforms,
            local_shift_offsets=local_shift_offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=effective_scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        end_line = scene_line_from_source_points(
            connection.get("to_points_source"),
            to_layer,
            to_z,
            polygon_id=connection.get("to_polygon_id"),
            alignment_transforms=alignment_transforms,
            local_shift_offsets=local_shift_offsets,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=effective_scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        from_position = [float(from_xy[0]), float(from_xy[1]), float(from_z)]
        to_position = [float(to_xy[0]), float(to_xy[1]), float(to_z)]
        if not start_line or not end_line:
            width = float(connection.get("line_width") or connection.get("width") or 1.0)
            start_line = synthesize_connection_line(from_position, to_position, width=width)
            end_line = synthesize_connection_line(to_position, from_position, width=width)
        connection_records.append(
            {
                "connection_id": connection.get("connection_id"),
                "type": connection.get("type", "connection"),
                "asset_type": connection.get("asset_type", connection.get("type", "connection")),
                "connection_schema": connection.get("connection_schema", "edge_pair_v2" if connection.get("from_points_source") and connection.get("to_points_source") else "legacy_center_points"),
                "label": connection.get("label"),
                "exit_number": connection.get("exit_number"),
                "exit_length_source": connection.get("exit_length_source"),
                "exit_rise": connection.get("exit_rise"),
                "direction_point_source": connection.get("direction_point_source"),
                "bidirectional": bool(connection.get("bidirectional", True)),
                "start_line": start_line,
                "end_line": end_line,
                "from": {
                    "polygon_id": connection.get("from_polygon_id"),
                    "layer": from_layer,
                    "point_source": from_point,
                    "line_source": connection.get("from_points_source"),
                    "position": [
                        from_position[0],
                        from_position[1],
                        from_position[2],
                    ],
                    "alignment_transform": xy_transform_to_list(from_transform) if from_transform is not None else None,
                    "local_shift_offset": [float(value) for value in polygon_offset(local_shift_offsets, connection.get("from_polygon_id"))] if polygon_offset(local_shift_offsets, connection.get("from_polygon_id")) else None,
                },
                "to": {
                    "polygon_id": connection.get("to_polygon_id"),
                    "layer": to_layer,
                    "point_source": to_point,
                    "line_source": connection.get("to_points_source"),
                    "position": [
                        to_position[0],
                        to_position[1],
                        to_position[2],
                    ],
                    "alignment_transform": xy_transform_to_list(to_transform) if to_transform is not None else None,
                    "local_shift_offset": [float(value) for value in polygon_offset(local_shift_offsets, connection.get("to_polygon_id"))] if polygon_offset(local_shift_offsets, connection.get("to_polygon_id")) else None,
                },
            }
        )
    icon_records = build_scene_icon_records(
        icon_matches,
        polygons,
        annotations=annotations,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=effective_scale,
        layer_z=layer_z,
        floor_height=floor_height,
        default_z=default_z,
        invert_x=invert_x,
        invert_y=invert_y,
        alignment_transforms=alignment_transforms,
    )
    connection_assets = build_assets_from_connections(connection_records)
    manual_assets = build_manual_asset_records(
        annotations=annotations,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=effective_scale,
        layer_z=layer_z,
        floor_height=floor_height,
        default_z=default_z,
        invert_x=invert_x,
        invert_y=invert_y,
        alignment_transforms=alignment_transforms,
        local_shift_offsets=local_shift_offsets,
    )
    elevator_point_records = build_elevator_point_records(
        annotations=annotations,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=effective_scale,
        layer_z=layer_z,
        floor_height=floor_height,
        default_z=default_z,
        invert_x=invert_x,
        invert_y=invert_y,
        alignment_transforms=alignment_transforms,
        local_shift_offsets=local_shift_offsets,
    )
    platform_records = build_platform_records(
        annotations=annotations,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=effective_scale,
        layer_z=layer_z,
        floor_height=floor_height,
        default_z=default_z,
        invert_x=invert_x,
        invert_y=invert_y,
        alignment_transforms=alignment_transforms,
        local_shift_offsets=local_shift_offsets,
    )
    zone_records = build_zone_records(
        annotations=annotations,
        transform_metadata=transform_metadata,
        transform_info=transform_info,
        scale=effective_scale,
        layer_z=layer_z,
        floor_height=floor_height,
        default_z=default_z,
        invert_x=invert_x,
        invert_y=invert_y,
        alignment_transforms=alignment_transforms,
        local_shift_offsets=local_shift_offsets,
    )
    asset_records = connection_assets + manual_assets
    blender_assets = build_blender_scene_assets(
        connection_assets=connection_assets,
        manual_assets=manual_assets,
        elevator_point_records=elevator_point_records,
    )
    assets_by_connection_id = {
        asset.get("connection_id"): asset
        for asset in connection_assets
        if asset.get("connection_id")
    }
    for connection in connection_records:
        asset = assets_by_connection_id.get(connection.get("connection_id"))
        if not asset:
            continue
        connection["blend"] = asset.get("blend")
        connection["location"] = asset.get("location")
        connection["rotation_z"] = asset.get("rotation_z")
        connection["scale"] = asset.get("scale")
        connection["target_height"] = asset.get("target_height")
        connection["start_line"] = asset.get("start_line", connection.get("start_line"))
        connection["end_line"] = asset.get("end_line", connection.get("end_line"))
        connection["same_layer"] = asset.get("same_layer")

    payload = {
        "metadata": {
            "format": "plane1-compatible",
            "rotation_unit": "degree",
            "coordinate_source": "points_transformed" if transform_info else "points_source",
            "scale": effective_scale,
            "base_scale": scale,
            "scale_calibration": scale_calibration,
            "default_z": default_z,
            "floor_height": floor_height,
            "layer_index": DEFAULT_LAYER_INDEX,
            "layer_z": layer_z,
            "polygon_z_offsets": annotations.get("polygon_z_offsets") or {},
            "polygon_z_values": annotations.get("polygon_z_values") or {},
            "polygon_axis_corrections": annotations.get("polygon_axis_corrections") or {},
            "station_metadata": annotations.get("station_metadata") or {},
            "icon_matches": {
                "source_image": icon_matches.get("source_image") if icon_matches else None,
                "match_count": len(icon_records),
            },
            "invert_y": invert_y,
            "invert_x": invert_x,
            "transform": transform_info,
            "layer_alignment": {
                "reference_layer": reference_layer,
                "transforms": {
                    layer: xy_transform_to_list(matrix)
                    for layer, matrix in alignment_transforms.items()
                },
                "pair_transforms": alignment_pair_metadata,
                "pair_count": len(annotations.get("layer_alignment_pairs", [])),
                "mode": "xy_scale_translate_by_layer",
            },
            "local_shift_corrections": {
                "mode": "export_only_polygon_translation",
                "corrections": local_shift_metadata,
                "offsets_by_polygon": {
                    polygon_id: [float(offset[0]), float(offset[1])]
                    for polygon_id, offset in local_shift_offsets.items()
                },
            },
        },
        "planes": planes,
        "station_metadata": annotations.get("station_metadata") or {},
        "walls": wall_records,
        "connections": connection_records,
        "platforms": platform_records,
        "elevator_points": elevator_point_records,
        "icons": icon_records,
        "manual_assets": manual_assets,
        "zone_regions": zone_records,
    }
    payload["assets"] = blender_assets
    payload["asset_records"] = asset_records
    payload["navigation"] = build_navigation_graph(
        connection_records,
        icon_records=icon_records,
        manual_assets=manual_assets,
        platform_records=platform_records,
        elevator_point_records=elevator_point_records,
        zone_records=zone_records,
        default_zone_type="public",
    )
    return payload


def blend_name_for_connection(connection):
    """Return the Blender asset filename for one manual connection."""
    asset_type = connection.get("asset_type") or connection.get("type") or "connection"
    if asset_type == "stair":
        return "Stair.blend"
    if asset_type == "escalator":
        return "Escalator.blend"
    if asset_type in {"moving_walkway", "moving-walkway"}:
        return "MovingWalkway.blend"
    return f"{asset_type}.blend"


def blend_name_for_manual_asset(asset_type):
    """Return the Blender asset filename for one manual map asset."""
    if asset_type == "ticket_gate":
        return "TicketGate.blend"
    if asset_type == "moving_walkway":
        return "MovingWalkway.blend"
    if asset_type == "exit":
        return "ExitMarker.blend"
    if asset_type == "toilet":
        return "Toilet.blend"
    if asset_type == "subway":
        return "Subway.blend"
    return f"{asset_type}.blend"


def build_assets_from_connections(connections):
    """Convert scene connection records to examples/assets.json-style assets."""
    assets = []
    for connection in connections or []:
        from_pos = (connection.get("from") or {}).get("position")
        to_pos = (connection.get("to") or {}).get("position")
        if not from_pos or not to_pos or len(from_pos) < 3 or len(to_pos) < 3:
            continue
        dx = float(to_pos[0]) - float(from_pos[0])
        dy = float(to_pos[1]) - float(from_pos[1])
        dz = float(to_pos[2]) - float(from_pos[2])
        xy_length = float(np.hypot(dx, dy))
        z_length = abs(dz)
        asset_type = connection.get("asset_type") or connection.get("type", "connection")
        asset = {
            "asset_id": connection.get("connection_id"),
            "connection_id": connection.get("connection_id"),
            "type": connection.get("type", "connection"),
            "blend": blend_name_for_connection(connection),
            "same_layer": (connection.get("from") or {}).get("layer") == (connection.get("to") or {}).get("layer"),
            "from": connection.get("from"),
            "to": connection.get("to"),
        }
        if asset_type in {"stair", "escalator"} and connection.get("start_line") and connection.get("end_line"):
            start_line, end_line = order_vertical_connection_lines_for_blender(
                connection.get("start_line"),
                connection.get("end_line"),
            )
            asset.update(
                {
                    "target_height": z_length,
                    "start_line": start_line,
                    "end_line": end_line,
                }
            )
        else:
            asset.update(
                {
                    "location": [
                        (float(from_pos[0]) + float(to_pos[0])) / 2.0,
                        (float(from_pos[1]) + float(to_pos[1])) / 2.0,
                        (float(from_pos[2]) + float(to_pos[2])) / 2.0,
                    ],
                    "rotation_z": float(np.degrees(np.arctan2(dy, dx))),
                    "target_height": z_length,
                    "scale": [
                        xy_length,
                        1.0,
                        z_length,
                    ],
                }
            )
        assets.append(asset)
    return assets


def toilet_blend_name(toilet_gender):
    """Return the Blender toilet asset filename for one toilet marker."""
    if toilet_gender == "male":
        return "Toilet_Men.blend"
    if toilet_gender == "female":
        return "Toilet_Women.blend"
    return "Toilet_Both.blend"


def blender_asset_from_connection_asset(asset):
    """Convert one internal connection asset to blender-map-generator scene.json schema."""
    blend = asset.get("blend")
    if blend in {"Stair.blend", "Escalator.blend"} and asset.get("start_line") and asset.get("end_line"):
        record = {
            "name": asset.get("asset_id") or asset.get("connection_id"),
            "blend": blend,
            "start_line": asset.get("start_line"),
            "end_line": asset.get("end_line"),
        }
        if blend == "Stair.blend":
            record["target_height"] = float(asset.get("target_height") or 5.0)
        return record
    return None


def blender_asset_from_manual_asset(asset):
    """Convert one internal manual asset to blender-map-generator scene.json schema."""
    asset_type = asset.get("type")
    name = asset.get("asset_id") or asset.get("label")
    if asset_type == "ticket_gate":
        gates = asset.get("gates") or []
        if gates:
            return [
                {
                    "name": gate.get("gate_id"),
                    "blend": "Gate.blend",
                    "location": gate.get("location"),
                    "rotation_z": float(gate.get("rotation_z") or 0.0),
                    "scale": [1.0, 1.0, 1.0],
                }
                for gate in gates
                if gate.get("location")
            ]
        if asset.get("location"):
            return {
                "name": name,
                "blend": "Gate.blend",
                "location": asset.get("location"),
                "rotation_z": float(asset.get("rotation_z") or 0.0),
                "scale": [1.0, 1.0, 1.0],
            }
    if asset_type == "toilet" and asset.get("location"):
        return {
            "name": name,
            "blend": toilet_blend_name(asset.get("toilet_gender")),
            "location": asset.get("location"),
            "rotation_z": float(asset.get("rotation_z") or 0.0),
            "scale": [1.0, 1.0, 1.0],
        }
    if asset_type in {"subway", "moving_walkway"} and asset.get("start") and asset.get("end"):
        return {
            "name": name,
            "blend": "MovingWalkway.blend" if asset_type == "moving_walkway" else "Subway.blend",
            "start": asset.get("start"),
            "end": asset.get("end"),
            "rotation_z": float(asset.get("rotation_z") or 0.0),
            "scale": [float(value) for value in (asset.get("scale") or [1.0, 1.0, 1.0])],
        }
    return None


def blender_asset_from_elevator_point(elevator):
    """Convert one elevator point record to blender-map-generator scene.json schema."""
    if not elevator.get("position"):
        return None
    return {
        "name": elevator.get("elevator_point_id") or elevator.get("label"),
        "blend": "Elevator.blend",
        "location": elevator.get("position"),
        "rotation_z": float(elevator.get("facing_angle_deg") or 0.0),
        "scale": [1.0, 1.0, 1.0],
        "elevator_id": elevator.get("elevator_id"),
    }


def build_blender_scene_assets(connection_assets=None, manual_assets=None, elevator_point_records=None):
    """Build the exact assets array consumed by blender-map-generator/scene.py."""
    output = []
    for asset in connection_assets or []:
        record = blender_asset_from_connection_asset(asset)
        if record:
            output.append(record)
    for asset in manual_assets or []:
        record = blender_asset_from_manual_asset(asset)
        if isinstance(record, list):
            output.extend(item for item in record if item)
        elif record:
            output.append(record)
    for elevator in elevator_point_records or []:
        record = blender_asset_from_elevator_point(elevator)
        if record:
            output.append(record)
    return output


def build_assets_payload(scene_payload):
    """Build an assets.json payload from a scene_planes payload."""
    return {
        "metadata": {
            "format": "assets",
            "rotation_unit": "degree",
            "location_source": "connection_midpoint",
            "scale": {
                "x": "connection_xy_length",
                "y": "asset_width_ratio",
                "z": "connection_abs_z_delta",
            },
            "station_metadata": scene_payload.get("station_metadata") or scene_payload.get("metadata", {}).get("station_metadata") or {},
        },
        "assets": scene_payload.get("assets") or build_assets_from_connections(scene_payload.get("connections", [])),
    }


def build_plane_payload(polygons_path, annotations, transform_metadata=None, scale=0.01, default_z=0.0, layer_z=None, floor_height=5.0, invert_x=False, invert_y=False, icon_matches=None):
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
        floor_height=floor_height,
        invert_x=invert_x,
        invert_y=invert_y,
        icon_matches=icon_matches,
    )
