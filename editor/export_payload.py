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
    recalculate_polygon_colors(polygons, polygon_data)

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


def build_manual_asset_records(annotations=None, transform_metadata=None, transform_info=None, scale=0.01, layer_z=None, floor_height=5.0, default_z=0.0, invert_x=False, invert_y=False, alignment_transforms=None):
    """Build Blender assets from manually placed editor asset markers."""
    assets = []
    for asset in (annotations or {}).get("manual_assets", []):
        if asset.get("type") != "subway" or not asset.get("point_source"):
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
        xy = scene_xy_for_connection_point(
            asset.get("point_source"),
            layer,
            alignment_transforms=alignment_transforms,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        rotation_z = float(asset.get("rotation_z", 0.0))
        scale_value = asset.get("scale") or [8.0, 1.0, 1.0]
        start_source = asset.get("start_point_source")
        end_source = asset.get("end_point_source")
        if start_source and end_source:
            start_xy = scene_xy_for_connection_point(
                start_source,
                layer,
                alignment_transforms=alignment_transforms,
                transform_metadata=transform_metadata,
                transform_info=transform_info,
                scale=scale,
                invert_x=invert_x,
                invert_y=invert_y,
            )
            end_xy = scene_xy_for_connection_point(
                end_source,
                layer,
                alignment_transforms=alignment_transforms,
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
        assets.append(
            {
                "asset_id": asset.get("asset_id"),
                "type": "subway",
                "blend": asset.get("blend") or "Subway.blend",
                "label": asset.get("label"),
                "polygon_id": polygon_id,
                "layer": layer,
                "location": [float(xy[0]), float(xy[1]), float(z_value)],
                "rotation_z": rotation_z,
                "scale": [float(value) for value in scale_value],
                "point_source": asset.get("point_source"),
                "start_point_source": start_source,
                "end_point_source": end_source,
            }
        )
    return assets


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


def scene_line_from_source_points(points, layer, z_value, alignment_transforms=None, transform_metadata=None, transform_info=None, scale=0.01, invert_x=False, invert_y=False):
    """Convert a two-point source line to scene XYZ coordinates."""
    if not valid_source_line(points):
        return None
    line = []
    for point in points:
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


def order_stair_lines_for_blender(start_line, end_line):
    """Return low-to-high stair lines normalized for the existing Blender stair script."""
    if not start_line or not end_line:
        return start_line, end_line
    start_z = sum(float(point[2]) for point in start_line) / len(start_line)
    end_z = sum(float(point[2]) for point in end_line) / len(end_line)
    if start_z > end_z:
        start_line, end_line = end_line, start_line

    # Layer alignment can scale each floor differently, so a line pair that was
    # parallel in editor/source space may no longer be parallel in scene space.
    # The current Blender stair script uses start_line as the stair width and
    # start_center -> end_center as the run direction, so normalize end_line
    # to the same width vector after every export transform has been applied.
    dx = float(start_line[1][0]) - float(start_line[0][0])
    dy = float(start_line[1][1]) - float(start_line[0][1])
    end_center = [
        (float(end_line[0][0]) + float(end_line[1][0])) / 2.0,
        (float(end_line[0][1]) + float(end_line[1][1])) / 2.0,
        (float(end_line[0][2]) + float(end_line[1][2])) / 2.0,
    ]
    normalized_end_line = [
        [end_center[0] - dx / 2.0, end_center[1] - dy / 2.0, end_center[2]],
        [end_center[0] + dx / 2.0, end_center[1] + dy / 2.0, end_center[2]],
    ]
    return start_line, normalized_end_line


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
        z_value = polygon_z_value(poly, annotations=annotations, layer_z=layer_z, default_z=default_z, floor_height=floor_height)
        vertices = []
        for x, y in points:
            out_x = -float(x) if invert_x else float(x)
            out_y = -float(y) if invert_y else float(y)
            vertices.append([out_x * effective_scale, out_y * effective_scale, float(z_value)])
        layer_transform = alignment_transforms.get(layer)
        vertices = apply_layer_transform_to_vertices(vertices, layer_transform)
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
        holes = [
            ensure_winding(
                apply_layer_transform_to_vertices(
                    [
                        [(-float(x) if invert_x else float(x)) * effective_scale, (-float(y) if invert_y else float(y)) * effective_scale, float(z_value)]
                        for x, y in hole
                    ],
                    layer_transform,
                ),
                clockwise=True,
            )
            for hole in hole_sets
            if len(hole) >= 3
        ]
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
                "alignment_transform": xy_transform_to_list(layer_transform) if layer_transform is not None else None,
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
        p1, p2 = wall_points[:2]
        y1 = -float(p1[1]) if invert_y else float(p1[1])
        y2 = -float(p2[1]) if invert_y else float(p2[1])
        x1 = -float(p1[0]) if invert_x else float(p1[0])
        x2 = -float(p2[0]) if invert_x else float(p2[0])
        layer_transform = alignment_transforms.get(layer)
        wall_records.append(
            {
                "name": wall.get("wall_id"),
                "wall_id": wall.get("wall_id"),
                "source_polygon_ids": wall.get("source_polygon_ids"),
                "type": wall.get("type", "shared_boundary_wall"),
                "height": height,
                "color": [0.8, 0.1, 0.1, 1.0],
                "vertices": apply_layer_transform_to_vertices(
                    [
                        [x1 * effective_scale, y1 * effective_scale, z_value],
                        [x2 * effective_scale, y2 * effective_scale, z_value],
                        [x2 * effective_scale, y2 * effective_scale, z_value + height],
                        [x1 * effective_scale, y1 * effective_scale, z_value + height],
                    ],
                    layer_transform,
                ),
                "alignment_transform": xy_transform_to_list(layer_transform) if layer_transform is not None else None,
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
        from_xy = scene_xy_for_connection_point(
            from_point,
            from_layer,
            alignment_transforms=alignment_transforms,
            transform_metadata=transform_metadata,
            transform_info=transform_info,
            scale=effective_scale,
            invert_x=invert_x,
            invert_y=invert_y,
        )
        to_xy = scene_xy_for_connection_point(
            to_point,
            to_layer,
            alignment_transforms=alignment_transforms,
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
        start_line = scene_line_from_source_points(
            connection.get("from_points_source"),
            from_layer,
            from_z,
            alignment_transforms=alignment_transforms,
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
            alignment_transforms=alignment_transforms,
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
    )
    assets = connection_assets + manual_assets
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
        },
        "planes": planes,
        "walls": wall_records,
        "connections": connection_records,
        "icons": icon_records,
        "manual_assets": manual_assets,
    }
    payload["assets"] = assets
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
        if asset_type == "stair" and connection.get("start_line") and connection.get("end_line"):
            start_line, end_line = order_stair_lines_for_blender(
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
