import argparse
from pathlib import Path
from types import SimpleNamespace

import cv2
import numpy as np

try:
    from pipeline.color_clustering import (
        DEFAULT_CLOSE_KERNEL,
        DEFAULT_OPEN_KERNEL,
        apply_morphology_to_clusters,
        build_morphology_config,
        extract_color_clusters,
        parse_cluster_ids,
    )
    from pipeline.connection_detection import detect_connections_from_pipeline_result
    from pipeline.export_json import (
        build_extraction_metadata,
        load_color_ranges,
        save_color_metadata,
        save_floor_polygons_json,
    )
    from pipeline.marker_detection import MARKER_HSV_RANGES, get_or_create_marker_config
    from pipeline.mask_bridge import (
        apply_bridge_correction_to_mask,
        combine_masks_by_ids,
        parse_bridge_angles,
        save_mask_bridge_debug,
    )
    from pipeline.polygon_extraction import (
        DEFAULT_LOWER_BLUE,
        DEFAULT_UPPER_BLUE,
        DEFAULT_EPSILON_RATIO,
        DEFAULT_MIN_AREA,
        extract_polygons_by_hsv,
        extract_polygons_from_mask,
    )
    from pipeline.polygon_grouping import (
        build_adjacency_graph,
        build_polygon_groups,
        connected_components,
        draw_polygon_groups_debug,
        group_polygons_payload,
        load_input_polygons,
        load_json,
        save_json,
        select_edges_for_target_groups,
    )
    from pipeline.preprocessing import (
        apply_icon_bridge_correction_to_mask,
        inpaint_icons_from_matches,
        load_json as load_preprocess_json,
        parse_angles,
    )
    from pipeline.transform import auto_center_polygons, transform_polygons
    from pipeline.visualization import (
        draw_debug_original,
        draw_polygons_canvas,
        save_debug_images,
        save_cluster_debug_images,
        show_debug_images,
    )
except ModuleNotFoundError:
    from color_clustering import (
        DEFAULT_CLOSE_KERNEL,
        DEFAULT_OPEN_KERNEL,
        apply_morphology_to_clusters,
        build_morphology_config,
        extract_color_clusters,
        parse_cluster_ids,
    )
    from connection_detection import detect_connections_from_pipeline_result
    from export_json import build_extraction_metadata, load_color_ranges, save_color_metadata, save_floor_polygons_json
    from marker_detection import MARKER_HSV_RANGES, get_or_create_marker_config
    from mask_bridge import (
        apply_bridge_correction_to_mask,
        combine_masks_by_ids,
        parse_bridge_angles,
        save_mask_bridge_debug,
    )
    from polygon_extraction import (
        DEFAULT_LOWER_BLUE,
        DEFAULT_UPPER_BLUE,
        DEFAULT_EPSILON_RATIO,
        DEFAULT_MIN_AREA,
        extract_polygons_by_hsv,
        extract_polygons_from_mask,
    )
    from polygon_grouping import (
        build_adjacency_graph,
        build_polygon_groups,
        connected_components,
        draw_polygon_groups_debug,
        group_polygons_payload,
        load_input_polygons,
        load_json,
        save_json,
        select_edges_for_target_groups,
    )
    from preprocessing import (
        apply_icon_bridge_correction_to_mask,
        inpaint_icons_from_matches,
        load_json as load_preprocess_json,
        parse_angles,
    )
    from transform import auto_center_polygons, transform_polygons
    from visualization import (
        draw_debug_original,
        draw_polygons_canvas,
        save_debug_images,
        save_cluster_debug_images,
        show_debug_images,
    )


def load_image(image_path):
    """Load an image from disk and raise a clear error when it fails."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")
    return img


def prepare_polygon_image(
    image_path,
    polygon_image_path=None,
    inpaint_icons_matches=None,
    inpaint_output_dir=None,
    inpaint_padding=0,
    inpaint_dilate_kernel=5,
    inpaint_radius=5,
    inpaint_method="directional",
    inpaint_min_score=None,
    inpaint_roi_padding=15,
):
    """Load or create the image used for polygon extraction."""
    if polygon_image_path:
        return load_image(polygon_image_path), {
            "source": "polygon_image",
            "path": polygon_image_path,
        }

    if inpaint_icons_matches:
        output_dir = inpaint_output_dir or "../test_image_output/icon_inpainting"
        result = inpaint_icons_from_matches(
            image_path,
            inpaint_icons_matches,
            output_dir,
            padding=inpaint_padding,
            dilate_kernel=inpaint_dilate_kernel,
            radius=inpaint_radius,
            method=inpaint_method,
            min_score=inpaint_min_score,
            roi_padding=inpaint_roi_padding,
        )
        return result["inpainted"], {
            "source": "icon_inpaint",
            "path": str(result["debug_paths"]["icon_inpainted"]),
            "icon_matches": inpaint_icons_matches,
            "selected_icon_count": len(result["selected_icons"]),
            "padding": inpaint_padding,
            "dilate_kernel": inpaint_dilate_kernel,
            "radius": inpaint_radius,
            "method": inpaint_method,
            "min_score": inpaint_min_score,
            "roi_padding": inpaint_roi_padding,
        }

    return load_image(image_path), {
        "source": "original",
        "path": image_path,
    }


def parse_args():
    """Parse command-line arguments for the polygon extraction pipeline."""
    parser = argparse.ArgumentParser(description="Extract floor polygons from an isometric subway map.")
    parser.add_argument("--image", default="test_marker.png", help="Input image path.")
    parser.add_argument("--polygon-image", help="Optional preprocessed image used only for polygon extraction.")
    parser.add_argument("--mode", choices=["hsv", "kmeans"], default="hsv", help="Polygon extraction mode.")
    parser.add_argument("--kmeans-k", type=int, default=6, help="Number of K-Means color clusters.")
    parser.add_argument(
        "--include-clusters",
        help="Comma-separated 1-based K-Means cluster ids to include, for example '1,3,5'.",
    )
    parser.add_argument("--color-config", default="config/color_ranges.json", help="HSV color range config path.")
    parser.add_argument("--color-range", default="floor_blue", help="Color range name to use in HSV mode.")
    parser.add_argument("--marker-config", default="config/marker_config.json", help="Marker detection cache config path.")
    parser.add_argument(
        "--marker-color",
        choices=sorted(MARKER_HSV_RANGES.keys()),
        default="red",
        help="Marker color to detect when marker config is refreshed or missing.",
    )
    parser.add_argument("--refresh-markers", action="store_true", help="Detect markers again and overwrite marker config.")
    parser.add_argument("--output-dir", default="../test_image_output/output", help="Directory for JSON output files.")
    parser.add_argument("--min-area", type=float, default=DEFAULT_MIN_AREA, help="Minimum contour area.")
    parser.add_argument("--epsilon-ratio", type=float, default=DEFAULT_EPSILON_RATIO, help="approxPolyDP epsilon ratio.")
    parser.add_argument("--open-kernel", type=int, default=DEFAULT_OPEN_KERNEL, help="Per-cluster MORPH_OPEN kernel size.")
    parser.add_argument("--close-kernel", type=int, default=DEFAULT_CLOSE_KERNEL, help="Per-cluster MORPH_CLOSE kernel size.")
    parser.add_argument("--debug", action="store_true", help="Draw and save debug images.")
    parser.add_argument("--show", action="store_true", help="Show OpenCV windows for debug images.")
    parser.add_argument("--debug-dir", help="Directory for saved debug images. Defaults to <output-dir>/debug.")
    parser.add_argument("--inpaint-icons-matches", help="icon_matches.json used to inpaint icons before polygon extraction.")
    parser.add_argument("--inpaint-padding", type=int, default=0)
    parser.add_argument("--inpaint-dilate-kernel", type=int, default=5)
    parser.add_argument("--inpaint-radius", type=int, default=5)
    parser.add_argument("--inpaint-method", choices=["telea", "ns", "directional"], default="directional")
    parser.add_argument("--inpaint-roi-padding", type=int, default=15)
    parser.add_argument("--inpaint-min-score", type=float)
    parser.add_argument("--icon-bridge-matches", help="icon_matches.json used to bridge selected cluster masks.")
    parser.add_argument("--icon-bridge-types", help="Comma-separated icon types to use for mask bridging.")
    parser.add_argument("--icon-bridge-min-score", type=float, help="Minimum icon match score for mask bridging.")
    parser.add_argument("--icon-bridge-search-radius", type=int, default=60)
    parser.add_argument("--icon-bridge-thickness", type=int, default=8)
    parser.add_argument("--icon-bridge-angles", default="0,15,30,45,60,75,90,105,120,135,150,165")
    parser.add_argument(
        "--bridge-clusters",
        help="Comma-separated K-Means cluster ids treated as blockers to bridge across, for example '4,5,6'.",
    )
    parser.add_argument("--bridge-contact-radius", type=int, default=10)
    parser.add_argument("--bridge-search-radius", type=int, default=40)
    parser.add_argument("--bridge-scan-step", type=int, default=4)
    parser.add_argument("--bridge-line-thickness", type=int, default=4)
    parser.add_argument("--bridge-min-area", type=float, default=20)
    parser.add_argument(
        "--bridge-angles",
        help="Optional comma-separated scan angles. Omit this to estimate directions from each bridge component.",
    )
    parser.add_argument("--run-grouping", action="store_true", help="Run polygon grouping after floor_polygons.json is saved.")
    parser.add_argument("--grouping-output", help="Path for polygon_groups.json. Defaults to <output-dir>/polygon_groups.json.")
    parser.add_argument("--grouping-debug-image", help="Path for grouping debug PNG. Defaults to <debug-dir>/polygon_groups.png.")
    parser.add_argument("--adjacency-mode", choices=["contact_area", "distance"], default="contact_area")
    parser.add_argument("--adjacency-distance", type=float, default=25)
    parser.add_argument("--same-color-distance", type=float, default=100)
    parser.add_argument("--contact-distance", type=int, default=8)
    parser.add_argument("--min-contact-area", type=int, default=700)
    parser.add_argument("--target-groups", type=int, default=None)
    parser.add_argument("--target-layers", type=int, default=None)
    parser.add_argument("--target-group-strategy", choices=["centroid_y", "strongest_edges"], default="centroid_y")
    parser.add_argument("--grouping-canvas-width", type=int, default=1400)
    parser.add_argument("--grouping-canvas-height", type=int, default=900)
    parser.add_argument("--detect-connections", action="store_true", help="Detect bridge connection candidates after polygon extraction.")
    parser.add_argument("--connection-bridge-clusters", help="Comma-separated K-Means cluster ids used as connection bridge candidates.")
    parser.add_argument("--connection-output", help="Path for connections.json. Defaults to <output-dir>/connections.json.")
    parser.add_argument("--connection-debug-image", help="Path for connection debug PNG. Defaults to <debug-dir>/connections.png.")
    parser.add_argument("--connection-search-distance", type=float, default=80)
    parser.add_argument("--connection-max-nearby", type=int, default=6)
    parser.add_argument("--connection-min-area", type=float, default=300)
    parser.add_argument("--connection-canvas-width", type=int, default=1400)
    parser.add_argument("--connection-canvas-height", type=int, default=900)
    return parser.parse_args()


def resolve_hsv_color_range(config_path, color_range_name):
    """Load the selected HSV range from config or fall back to the default range."""
    color_ranges = load_color_ranges(config_path)
    selected_range = color_ranges.get(color_range_name)
    if selected_range is None:
        selected_range = {
            "color_space": "hsv",
            "lower": DEFAULT_LOWER_BLUE,
            "upper": DEFAULT_UPPER_BLUE,
        }

    lower_hsv = np.array(selected_range["lower"], dtype=np.uint8)
    upper_hsv = np.array(selected_range["upper"], dtype=np.uint8)
    return {
        "name": color_range_name,
        "color_space": selected_range.get("color_space", "hsv"),
        "lower": lower_hsv,
        "upper": upper_hsv,
    }


def build_kmeans_color_metadata(cluster_result, selected_cluster_ids, morphology):
    """Build serializable metadata for K-Means cluster centers and selection state."""
    selected_ids = selected_cluster_ids or [cluster["id"] for cluster in cluster_result["clusters"]]
    return {
        "mode": "kmeans",
        "color_space": cluster_result["color_space"],
        "default_morphology": morphology,
        "clusters": [
            {
                "id": cluster["id"],
                "center": cluster["center"],
                "pixel_count": cluster["pixel_count"],
                "selected": cluster["id"] in selected_ids,
                "morphology": cluster.get("morphology", morphology),
            }
            for cluster in cluster_result["clusters"]
        ],
    }


def extract_raw_polygons(
    img,
    mode="hsv",
    kmeans_k=6,
    include_clusters=None,
    color_config="config/color_ranges.json",
    color_range="floor_blue",
    min_area=DEFAULT_MIN_AREA,
    epsilon_ratio=DEFAULT_EPSILON_RATIO,
    open_kernel=DEFAULT_OPEN_KERNEL,
    close_kernel=DEFAULT_CLOSE_KERNEL,
    icon_bridge_matches=None,
    icon_bridge_types=None,
    icon_bridge_min_score=None,
    icon_bridge_search_radius=60,
    icon_bridge_thickness=8,
    icon_bridge_angles=None,
    icon_bridge_debug_dir=None,
    bridge_clusters=None,
    bridge_contact_radius=10,
    bridge_search_radius=40,
    bridge_scan_step=4,
    bridge_line_thickness=4,
    bridge_min_area=20,
    bridge_angles=None,
    bridge_debug_dir=None,
):
    """Extract raw polygons with either the fixed HSV mask or selected K-Means clusters."""
    cluster_result = None
    selected_hsv_range = None
    include_cluster_ids = None
    icon_matches = load_preprocess_json(icon_bridge_matches) if icon_bridge_matches else None
    icon_bridge_corrections = []
    if mode == "hsv":
        selected_hsv_range = resolve_hsv_color_range(color_config, color_range)
        raw_polygons = extract_polygons_by_hsv(
            img,
            selected_hsv_range["lower"],
            selected_hsv_range["upper"],
            min_area=min_area,
            epsilon_ratio=epsilon_ratio,
        )
        polygon_groups = [
            {
                "type": "hsv_range",
                "name": selected_hsv_range["name"],
                "color_space": selected_hsv_range["color_space"],
                "lower": selected_hsv_range["lower"],
                "upper": selected_hsv_range["upper"],
                "raw_polygons": raw_polygons,
            }
        ]
        return raw_polygons, cluster_result, selected_hsv_range, include_cluster_ids, polygon_groups

    morphology = build_morphology_config(open_kernel, close_kernel)
    cluster_result = extract_color_clusters(img, k=kmeans_k, color_space="lab")
    cluster_result["clusters"] = apply_morphology_to_clusters(cluster_result["clusters"], morphology)
    cluster_result["default_morphology"] = morphology
    include_cluster_ids = parse_cluster_ids(include_clusters)
    selected_ids = include_cluster_ids or [cluster["id"] for cluster in cluster_result["clusters"]]
    bridge_cluster_ids = parse_cluster_ids(bridge_clusters)
    bridge_cluster_mask = combine_masks_by_ids(cluster_result["clusters"], bridge_cluster_ids) if bridge_cluster_ids else None
    bridge_scan_angles = parse_bridge_angles(bridge_angles)

    raw_polygons = []
    polygon_groups = []
    mask_bridge_corrections = []
    for cluster in cluster_result["clusters"]:
        if cluster["id"] not in selected_ids:
            continue
        extraction_mask = cluster["mask"]
        cluster_bridge_connection_mask = None
        cluster_bridge_corrections = []
        if bridge_cluster_mask is not None:
            extraction_mask, cluster_bridge_connection_mask, cluster_bridge_corrections = apply_bridge_correction_to_mask(
                extraction_mask,
                bridge_cluster_mask,
                contact_radius=bridge_contact_radius,
                search_radius=bridge_search_radius,
                scan_step=bridge_scan_step,
                line_thickness=bridge_line_thickness,
                min_component_area=bridge_min_area,
                angles=bridge_scan_angles,
            )
            mask_bridge_corrections.append(
                {
                    "cluster_id": cluster["id"],
                    "bridge_clusters": bridge_cluster_ids,
                    "correction_count": len(cluster_bridge_corrections),
                    "corrections": cluster_bridge_corrections,
                }
            )
            if bridge_debug_dir:
                save_mask_bridge_debug(
                    cluster["id"],
                    cluster["mask"],
                    bridge_cluster_mask,
                    cluster_bridge_connection_mask,
                    extraction_mask,
                    bridge_debug_dir,
                )
        bridge_corrections = []
        if icon_matches is not None:
            extraction_mask, icon_bridge_mask, bridge_corrections = apply_icon_bridge_correction_to_mask(
                extraction_mask,
                icon_matches,
                icon_types=icon_bridge_types,
                min_score=icon_bridge_min_score,
                search_radius=icon_bridge_search_radius,
                line_thickness=icon_bridge_thickness,
                angles=parse_angles(icon_bridge_angles),
            )
            icon_bridge_corrections.append(
                {
                    "cluster_id": cluster["id"],
                    "correction_count": len(bridge_corrections),
                    "corrections": bridge_corrections,
                }
            )
            if icon_bridge_debug_dir:
                save_icon_bridge_cluster_debug(
                    cluster["id"],
                    cluster["mask"],
                    icon_bridge_mask,
                    extraction_mask,
                    icon_bridge_debug_dir,
                )
        cluster_polygons = extract_polygons_from_mask(
            extraction_mask,
            min_area=min_area,
            epsilon_ratio=epsilon_ratio,
        )
        raw_polygons.extend(cluster_polygons)
        polygon_groups.append(
            {
                "type": "kmeans_cluster",
                "cluster_id": cluster["id"],
                "color_space": cluster_result["color_space"],
                "center": cluster["center"],
                "pixel_count": cluster["pixel_count"],
                "morphology": cluster.get("morphology", morphology),
                "mask_bridge_corrections": cluster_bridge_corrections,
                "icon_bridge_corrections": bridge_corrections,
                "raw_polygons": cluster_polygons,
            }
        )

    if mask_bridge_corrections:
        cluster_result["mask_bridge_corrections"] = mask_bridge_corrections
    if icon_bridge_corrections:
        cluster_result["icon_bridge_corrections"] = icon_bridge_corrections

    return raw_polygons, cluster_result, selected_hsv_range, include_cluster_ids, polygon_groups


def save_icon_bridge_cluster_debug(cluster_id, original_mask, bridge_mask, corrected_mask, output_dir):
    """Save before/bridge/after masks for one cluster."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_mask_before_icon_bridge.png"), original_mask)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_icon_bridge_mask.png"), bridge_mask)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_mask_after_icon_bridge.png"), corrected_mask)


def assign_shifted_polygons_to_groups(polygon_groups, shifted_polygons):
    """Attach transformed polygons back to their color groups without merging colors."""
    cursor = 0
    shifted_groups = []
    for group in polygon_groups:
        count = len(group["raw_polygons"])
        group_polygons = shifted_polygons[cursor:cursor + count]
        cursor += count

        shifted_group = {
            key: value
            for key, value in group.items()
            if key != "raw_polygons"
        }
        shifted_group["polygon_count"] = len(group_polygons)
        shifted_group["polygons"] = group_polygons
        shifted_groups.append(shifted_group)

    return shifted_groups


def normalize_polygon_points(points):
    """Normalize OpenCV contour-like polygon points into [[x, y], ...]."""
    arr = np.array(points, dtype=np.float32).reshape((-1, 2))
    return [[float(x), float(y)] for x, y in arr]


def color_center_to_rgb(group):
    """Convert a group color center into RGB for editor overlays."""
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


def polygon_metrics(points):
    """Calculate area, bbox, and centroid for normalized polygon points."""
    contour = np.array(points, dtype=np.float32)
    x, y, w, h = cv2.boundingRect(contour)
    moments = cv2.moments(contour)
    if moments["m00"] != 0:
        centroid = [float(moments["m10"] / moments["m00"]), float(moments["m01"] / moments["m00"])]
    else:
        centroid = [float(np.mean(contour[:, 0])), float(np.mean(contour[:, 1]))]
    return {
        "area": float(abs(cv2.contourArea(contour))),
        "bbox": [int(x), int(y), int(w), int(h)],
        "centroid": centroid,
    }


def assign_source_polygons_to_groups(polygon_groups):
    """Attach source-image polygons back to their color groups without merging colors."""
    source_groups = []
    for group in polygon_groups:
        source_group = {
            key: value
            for key, value in group.items()
            if key != "raw_polygons"
        }
        source_group["polygon_count"] = len(group["raw_polygons"])
        source_group["polygons_source"] = [normalize_polygon_points(poly) for poly in group["raw_polygons"]]
        source_groups.append(source_group)
    return source_groups


def build_intermediate_polygons(source_groups, transformed_groups):
    """Build flat polygon records with source and transformed coordinates."""
    records = []
    polygon_index = 1
    for source_group, transformed_group in zip(source_groups, transformed_groups):
        color_cluster = source_group.get("cluster_id")
        color_rgb = color_center_to_rgb(source_group)
        source_polygons = source_group.get("polygons_source", [])
        transformed_polygons = transformed_group.get("polygons", [])
        for cluster_polygon_index, (source_points, transformed_points) in enumerate(
            zip(source_polygons, transformed_polygons),
            start=1,
        ):
            transformed_points = normalize_polygon_points(transformed_points)
            source_metrics = polygon_metrics(source_points)
            transformed_metrics = polygon_metrics(transformed_points)
            records.append(
                {
                    "polygon_id": f"poly_{polygon_index:03d}",
                    "source": {
                        "type": source_group.get("type", "unknown"),
                        "cluster_id": color_cluster,
                        "cluster_polygon_index": cluster_polygon_index,
                    },
                    "color_cluster": color_cluster,
                    "color_rgb": color_rgb,
                    "area_source": source_metrics["area"],
                    "bbox_source": source_metrics["bbox"],
                    "centroid_source": source_metrics["centroid"],
                    "points_source": source_points,
                    "area_transformed": transformed_metrics["area"],
                    "bbox_transformed": transformed_metrics["bbox"],
                    "centroid_transformed": transformed_metrics["centroid"],
                    "points_transformed": transformed_points,
                    "semantic": {
                        "layer": None,
                        "line": None,
                        "zone_type": None,
                        "label": None,
                        "confidence": None,
                    },
                }
            )
            polygon_index += 1
    return records


def calculate_auto_center_shift(polygons, margin=50):
    """Calculate the same shift used by auto_center_polygons."""
    if not polygons:
        return 0.0, 0.0
    all_points = np.vstack(polygons)
    x_min, y_min = np.min(all_points, axis=0).flatten()
    return float(-x_min + margin), float(-y_min + margin)


def save_extraction_outputs(
    mode,
    shifted_polygons,
    cluster_result,
    selected_hsv_range,
    selected_cluster_ids,
    output_dir,
    min_area,
    epsilon_ratio,
    color_groups=None,
    source_color_groups=None,
    intermediate_polygons=None,
    image_metadata=None,
    morphology=None,
    bridge_correction=None,
):
    """Save color metadata and final floor polygon JSON files."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if mode == "hsv":
        color_metadata_file = output_path / "extraction_colors.json"
        color_metadata = {
            "mode": "hsv",
            "selected_color_ranges": [
                {
                    "name": selected_hsv_range["name"],
                    "color_space": selected_hsv_range["color_space"],
                    "lower": selected_hsv_range["lower"],
                    "upper": selected_hsv_range["upper"],
                }
            ],
        }
        save_color_metadata(color_metadata, color_metadata_file)
        extraction_metadata = build_extraction_metadata(
            mode="hsv",
            color_space="hsv",
            selected_color_ranges=color_metadata["selected_color_ranges"],
            min_area=min_area,
            epsilon_ratio=epsilon_ratio,
            color_metadata_file=color_metadata_file,
        )
    else:
        color_metadata_file = output_path / "color_clusters.json"
        morphology = morphology or cluster_result.get("default_morphology")
        color_metadata = build_kmeans_color_metadata(cluster_result, selected_cluster_ids, morphology)
        save_color_metadata(color_metadata, color_metadata_file)
        selected_clusters = [
            cluster["id"]
            for cluster in color_metadata["clusters"]
            if cluster["selected"]
        ]
        extraction_metadata = build_extraction_metadata(
            mode="kmeans",
            color_space=color_metadata["color_space"],
            selected_clusters=selected_clusters,
            min_area=min_area,
            epsilon_ratio=epsilon_ratio,
            color_metadata_file=color_metadata_file,
            morphology=morphology,
            bridge_correction=bridge_correction,
        )

    floor_polygons_file = output_path / "floor_polygons.json"
    save_floor_polygons_json(
        shifted_polygons,
        extraction_metadata,
        floor_polygons_file,
        color_groups=color_groups,
        source_color_groups=source_color_groups,
        intermediate_polygons=intermediate_polygons,
        image_metadata=image_metadata,
    )
    intermediate_polygons_file = None
    if intermediate_polygons is not None:
        intermediate_polygons_file = output_path / "intermediate_polygons.json"
        save_color_metadata(
            {
                "image": image_metadata,
                "extraction": extraction_metadata,
                "polygons": intermediate_polygons,
            },
            intermediate_polygons_file,
        )
    return {
        "color_metadata_file": color_metadata_file,
        "floor_polygons_file": floor_polygons_file,
        "intermediate_polygons_file": intermediate_polygons_file,
        "extraction_metadata": extraction_metadata,
    }


def run_polygon_grouping(
    floor_polygons_file,
    output_path,
    debug_image_path,
    adjacency_mode="contact_area",
    adjacency_distance=25,
    same_color_distance=100,
    contact_distance=8,
    min_contact_area=700,
    target_groups=None,
    target_layers=None,
    target_group_strategy="centroid_y",
    canvas_width=1400,
    canvas_height=900,
):
    """Run polygon grouping from a saved floor_polygons.json file."""
    source_data = load_json(floor_polygons_file)
    polygons = load_input_polygons(source_data)
    graph = build_adjacency_graph(
        polygons,
        adjacency_distance,
        same_color_distance,
        adjacency_mode,
        contact_distance,
        min_contact_area,
    )
    target_group_count = target_groups if target_groups is not None else target_layers
    graph, target_metadata = select_edges_for_target_groups(
        polygons,
        graph,
        target_group_count,
        target_group_strategy,
    )
    components = connected_components(graph)
    groups, polygons_with_groups = build_polygon_groups(polygons, components)
    grouping_args = SimpleNamespace(
        adjacency_mode=adjacency_mode,
        adjacency_distance=adjacency_distance,
        same_color_distance=same_color_distance,
        contact_distance=contact_distance,
        min_contact_area=min_contact_area,
    )
    payload = group_polygons_payload(
        source_data,
        floor_polygons_file,
        polygons,
        graph,
        groups,
        polygons_with_groups,
        grouping_args,
        target_metadata,
    )
    output_path = save_json(payload, output_path)
    debug_image_path = draw_polygon_groups_debug(
        polygons_with_groups,
        groups,
        debug_image_path,
        canvas_width=canvas_width,
        canvas_height=canvas_height,
    )
    return {
        "output_file": output_path,
        "debug_image": debug_image_path,
        "group_count": len(groups),
        "edge_count": len(graph["edges"]),
        "polygon_count": len(polygons),
    }


def run_pipeline(
    image_path,
    polygon_image=None,
    mode="hsv",
    kmeans_k=6,
    include_clusters=None,
    color_config="config/color_ranges.json",
    color_range="floor_blue",
    marker_config="config/marker_config.json",
    marker_color="red",
    refresh_markers=False,
    output_dir="../test_image_output/output",
    min_area=DEFAULT_MIN_AREA,
    epsilon_ratio=DEFAULT_EPSILON_RATIO,
    open_kernel=DEFAULT_OPEN_KERNEL,
    close_kernel=DEFAULT_CLOSE_KERNEL,
    debug=False,
    show=False,
    debug_dir=None,
    inpaint_icons_matches=None,
    inpaint_padding=0,
    inpaint_dilate_kernel=5,
    inpaint_radius=5,
    inpaint_method="directional",
    inpaint_min_score=None,
    inpaint_roi_padding=15,
    icon_bridge_matches=None,
    icon_bridge_types=None,
    icon_bridge_min_score=None,
    icon_bridge_search_radius=60,
    icon_bridge_thickness=8,
    icon_bridge_angles="0,15,30,45,60,75,90,105,120,135,150,165",
    bridge_clusters=None,
    bridge_contact_radius=10,
    bridge_search_radius=40,
    bridge_scan_step=4,
    bridge_line_thickness=4,
    bridge_min_area=20,
    bridge_angles=None,
    run_grouping=False,
    grouping_output=None,
    grouping_debug_image=None,
    adjacency_mode="contact_area",
    adjacency_distance=25,
    same_color_distance=100,
    contact_distance=8,
    min_contact_area=700,
    target_groups=None,
    target_layers=None,
    target_group_strategy="centroid_y",
    grouping_canvas_width=1400,
    grouping_canvas_height=900,
    detect_connections=False,
    connection_bridge_clusters=None,
    connection_output=None,
    connection_debug_image=None,
    connection_search_distance=80,
    connection_max_nearby=6,
    connection_min_area=300,
    connection_canvas_width=1400,
    connection_canvas_height=900,
):
    """Run marker detection, polygon extraction, vertex transform, and visualization."""
    img = load_image(image_path)
    resolved_debug_dir = debug_dir or str(Path(output_dir) / "debug")
    polygon_img, polygon_image_metadata = prepare_polygon_image(
        image_path,
        polygon_image_path=polygon_image,
        inpaint_icons_matches=inpaint_icons_matches,
        inpaint_output_dir=str(Path(resolved_debug_dir) / "icon_inpainting") if debug else str(Path(output_dir) / "icon_inpainting"),
        inpaint_padding=inpaint_padding,
        inpaint_dilate_kernel=inpaint_dilate_kernel,
        inpaint_radius=inpaint_radius,
        inpaint_method=inpaint_method,
        inpaint_min_score=inpaint_min_score,
        inpaint_roi_padding=inpaint_roi_padding,
    )

    marker_points, matrix, max_w, max_h, marker_metadata, markers_refreshed = get_or_create_marker_config(
        img,
        image_path,
        marker_config,
        refresh=refresh_markers,
        marker_color=marker_color,
    )
    raw_polygons, cluster_result, selected_hsv_range, selected_cluster_ids, polygon_groups = extract_raw_polygons(
        polygon_img,
        mode=mode,
        kmeans_k=kmeans_k,
        include_clusters=include_clusters,
        color_config=color_config,
        color_range=color_range,
        min_area=min_area,
        epsilon_ratio=epsilon_ratio,
        open_kernel=open_kernel,
        close_kernel=close_kernel,
        icon_bridge_matches=icon_bridge_matches,
        icon_bridge_types=icon_bridge_types,
        icon_bridge_min_score=icon_bridge_min_score,
        icon_bridge_search_radius=icon_bridge_search_radius,
        icon_bridge_thickness=icon_bridge_thickness,
        icon_bridge_angles=icon_bridge_angles,
        icon_bridge_debug_dir=str(Path(resolved_debug_dir) / "icon_bridge") if debug and icon_bridge_matches else None,
        bridge_clusters=bridge_clusters,
        bridge_contact_radius=bridge_contact_radius,
        bridge_search_radius=bridge_search_radius,
        bridge_scan_step=bridge_scan_step,
        bridge_line_thickness=bridge_line_thickness,
        bridge_min_area=bridge_min_area,
        bridge_angles=bridge_angles,
        bridge_debug_dir=str(Path(resolved_debug_dir) / "mask_bridge") if debug and bridge_clusters else None,
    )

    shifted_polygons = []
    color_groups = []
    source_color_groups = []
    intermediate_polygons = []
    transform_shift = (0.0, 0.0)
    canvas_w, canvas_h = 1000, 1000
    canvas = None

    if matrix is not None and max_w > 0 and max_h > 0:
        warped_polygons = transform_polygons(raw_polygons, matrix)
        transform_shift = calculate_auto_center_shift(warped_polygons)
        shifted_polygons, canvas_w, canvas_h = auto_center_polygons(warped_polygons)
        color_groups = assign_shifted_polygons_to_groups(polygon_groups, shifted_polygons)
        source_color_groups = assign_source_polygons_to_groups(polygon_groups)
        intermediate_polygons = build_intermediate_polygons(source_color_groups, color_groups)
        canvas = draw_polygons_canvas(shifted_polygons, canvas_w, canvas_h, (255, 0, 0))

    debug_paths = None
    if debug:
        debug_dir = resolved_debug_dir
        debug_original = draw_debug_original(img, marker_points, raw_polygons)
        if canvas is None:
            canvas = draw_polygons_canvas([], canvas_w, canvas_h, (255, 0, 0))
        debug_paths = save_debug_images(debug_original, canvas, debug_dir)
        if cluster_result is not None:
            save_cluster_debug_images(polygon_img, cluster_result["clusters"], debug_dir)
        if show:
            show_debug_images(debug_original, canvas)

    output_paths = save_extraction_outputs(
        mode=mode,
        shifted_polygons=shifted_polygons,
        cluster_result=cluster_result,
        selected_hsv_range=selected_hsv_range,
        selected_cluster_ids=selected_cluster_ids,
        output_dir=output_dir,
        min_area=min_area,
        epsilon_ratio=epsilon_ratio,
        color_groups=color_groups,
        source_color_groups=source_color_groups,
        intermediate_polygons=intermediate_polygons,
        image_metadata={
            "path": image_path,
            "polygon_image": polygon_image_metadata,
            "width": int(img.shape[1]),
            "height": int(img.shape[0]),
            "transformed_canvas_width": int(canvas_w),
            "transformed_canvas_height": int(canvas_h),
        },
        morphology=build_morphology_config(open_kernel, close_kernel) if mode == "kmeans" else None,
        bridge_correction={
            "bridge_clusters": parse_cluster_ids(bridge_clusters),
            "contact_radius": bridge_contact_radius,
            "search_radius": bridge_search_radius,
            "scan_step": bridge_scan_step,
            "line_thickness": bridge_line_thickness,
            "min_area": bridge_min_area,
            "angles": parse_bridge_angles(bridge_angles),
        } if mode == "kmeans" and bridge_clusters else None,
    )

    grouping_result = None
    if run_grouping:
        grouping_output = grouping_output or str(Path(output_dir) / "polygon_groups.json")
        grouping_debug_image = grouping_debug_image or str(Path(resolved_debug_dir) / "polygon_groups.png")
        grouping_result = run_polygon_grouping(
            output_paths["floor_polygons_file"],
            grouping_output,
            grouping_debug_image,
            adjacency_mode=adjacency_mode,
            adjacency_distance=adjacency_distance,
            same_color_distance=same_color_distance,
            contact_distance=contact_distance,
            min_contact_area=min_contact_area,
            target_groups=target_groups,
            target_layers=target_layers,
            target_group_strategy=target_group_strategy,
            canvas_width=grouping_canvas_width,
            canvas_height=grouping_canvas_height,
        )

    connection_result = None
    if detect_connections:
        if mode != "kmeans":
            raise ValueError("connection detection은 kmeans mode에서만 사용할 수 있습니다.")
        connection_bridge_cluster_ids = parse_cluster_ids(connection_bridge_clusters)
        if not connection_bridge_cluster_ids:
            raise ValueError("--detect-connections 사용 시 --connection-bridge-clusters가 필요합니다.")
        connection_output = connection_output or str(Path(output_dir) / "connections.json")
        connection_debug_image = connection_debug_image or str(Path(resolved_debug_dir) / "connections.png")
        connection_result = detect_connections_from_pipeline_result(
            image_path,
            output_paths["extraction_metadata"],
            color_groups,
            cluster_result,
            connection_bridge_cluster_ids,
            matrix,
            transform_shift,
            connection_output,
            debug_image_path=connection_debug_image if debug else None,
            search_distance=connection_search_distance,
            max_nearby=connection_max_nearby,
            min_component_area=connection_min_area,
            canvas_width=connection_canvas_width,
            canvas_height=connection_canvas_height,
        )

    return {
        "mode": mode,
        "markers": marker_points,
        "marker_metadata": marker_metadata,
        "markers_refreshed": markers_refreshed,
        "raw_polygons": raw_polygons,
        "shifted_polygons": shifted_polygons,
        "color_groups": color_groups,
        "source_color_groups": source_color_groups,
        "intermediate_polygons": intermediate_polygons,
        "canvas_size": (canvas_w, canvas_h),
        "debug_paths": debug_paths,
        "cluster_result": cluster_result,
        "output_paths": output_paths,
        "grouping_result": grouping_result,
        "connection_result": connection_result,
    }


def main():
    """Execute the command-line pipeline."""
    args = parse_args()
    result = run_pipeline(
        args.image,
        polygon_image=args.polygon_image,
        mode=args.mode,
        kmeans_k=args.kmeans_k,
        include_clusters=args.include_clusters,
        color_config=args.color_config,
        color_range=args.color_range,
        marker_config=args.marker_config,
        marker_color=args.marker_color,
        refresh_markers=args.refresh_markers,
        output_dir=args.output_dir,
        min_area=args.min_area,
        epsilon_ratio=args.epsilon_ratio,
        open_kernel=args.open_kernel,
        close_kernel=args.close_kernel,
        debug=args.debug,
        show=args.show,
        debug_dir=args.debug_dir,
        inpaint_icons_matches=args.inpaint_icons_matches,
        inpaint_padding=args.inpaint_padding,
        inpaint_dilate_kernel=args.inpaint_dilate_kernel,
        inpaint_radius=args.inpaint_radius,
        inpaint_method=args.inpaint_method,
        inpaint_min_score=args.inpaint_min_score,
        inpaint_roi_padding=args.inpaint_roi_padding,
        icon_bridge_matches=args.icon_bridge_matches,
        icon_bridge_types=args.icon_bridge_types,
        icon_bridge_min_score=args.icon_bridge_min_score,
        icon_bridge_search_radius=args.icon_bridge_search_radius,
        icon_bridge_thickness=args.icon_bridge_thickness,
        icon_bridge_angles=args.icon_bridge_angles,
        bridge_clusters=args.bridge_clusters,
        bridge_contact_radius=args.bridge_contact_radius,
        bridge_search_radius=args.bridge_search_radius,
        bridge_scan_step=args.bridge_scan_step,
        bridge_line_thickness=args.bridge_line_thickness,
        bridge_min_area=args.bridge_min_area,
        bridge_angles=args.bridge_angles,
        run_grouping=args.run_grouping,
        grouping_output=args.grouping_output,
        grouping_debug_image=args.grouping_debug_image,
        adjacency_mode=args.adjacency_mode,
        adjacency_distance=args.adjacency_distance,
        same_color_distance=args.same_color_distance,
        contact_distance=args.contact_distance,
        min_contact_area=args.min_contact_area,
        target_groups=args.target_groups,
        target_layers=args.target_layers,
        target_group_strategy=args.target_group_strategy,
        grouping_canvas_width=args.grouping_canvas_width,
        grouping_canvas_height=args.grouping_canvas_height,
        detect_connections=args.detect_connections,
        connection_bridge_clusters=args.connection_bridge_clusters,
        connection_output=args.connection_output,
        connection_debug_image=args.connection_debug_image,
        connection_search_distance=args.connection_search_distance,
        connection_max_nearby=args.connection_max_nearby,
        connection_min_area=args.connection_min_area,
        connection_canvas_width=args.connection_canvas_width,
        connection_canvas_height=args.connection_canvas_height,
    )
    print(f"markers={len(result['markers'])}, polygons={len(result['raw_polygons'])}")
    print(f"marker_config={args.marker_config}, marker_color={args.marker_color}, refreshed={result['markers_refreshed']}")
    if result["cluster_result"] is not None:
        for cluster in result["cluster_result"]["clusters"]:
            center = [round(float(value), 2) for value in cluster["center"]]
            print(f"cluster={cluster['id']}, pixels={cluster['pixel_count']}, center_lab={center}")
    if result["debug_paths"]:
        original_path, canvas_path = result["debug_paths"]
        print(f"debug_original={original_path}")
        print(f"debug_canvas={canvas_path}")
    print(f"color_metadata={result['output_paths']['color_metadata_file']}")
    print(f"floor_polygons={result['output_paths']['floor_polygons_file']}")
    if result["output_paths"].get("intermediate_polygons_file"):
        print(f"intermediate_polygons={result['output_paths']['intermediate_polygons_file']}")
    if result["grouping_result"]:
        grouping = result["grouping_result"]
        print(
            "polygon_groups="
            f"{grouping['output_file']}, groups={grouping['group_count']}, edges={grouping['edge_count']}"
        )
        print(f"grouping_debug_image={grouping['debug_image']}")
    if result["connection_result"]:
        connections = result["connection_result"]
        print(
            "connections="
            f"{connections['output_file']}, count={connections['connection_count']}, "
            f"bridge_components={connections['component_count']}"
        )
        if connections["debug_image"]:
            print(f"connection_debug_image={connections['debug_image']}")


if __name__ == "__main__":
    main()
