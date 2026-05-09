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
    from pipeline.export_json import (
        build_extraction_metadata,
        load_color_ranges,
        save_color_metadata,
        save_floor_polygons_json,
    )
    from pipeline.marker_detection import MARKER_HSV_RANGES, get_or_create_marker_config
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
    from export_json import build_extraction_metadata, load_color_ranges, save_color_metadata, save_floor_polygons_json
    from marker_detection import MARKER_HSV_RANGES, get_or_create_marker_config
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


def parse_args():
    """Parse command-line arguments for the polygon extraction pipeline."""
    parser = argparse.ArgumentParser(description="Extract floor polygons from an isometric subway map.")
    parser.add_argument("--image", default="test_marker.png", help="Input image path.")
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
):
    """Extract raw polygons with either the fixed HSV mask or selected K-Means clusters."""
    cluster_result = None
    selected_hsv_range = None
    include_cluster_ids = None
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

    raw_polygons = []
    polygon_groups = []
    for cluster in cluster_result["clusters"]:
        if cluster["id"] not in selected_ids:
            continue
        cluster_polygons = extract_polygons_from_mask(
            cluster["mask"],
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
                "raw_polygons": cluster_polygons,
            }
        )

    return raw_polygons, cluster_result, selected_hsv_range, include_cluster_ids, polygon_groups


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
    morphology=None,
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
        )

    floor_polygons_file = output_path / "floor_polygons.json"
    save_floor_polygons_json(
        shifted_polygons,
        extraction_metadata,
        floor_polygons_file,
        color_groups=color_groups,
    )
    return {
        "color_metadata_file": color_metadata_file,
        "floor_polygons_file": floor_polygons_file,
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
):
    """Run marker detection, polygon extraction, vertex transform, and visualization."""
    img = load_image(image_path)

    marker_points, matrix, max_w, max_h, marker_metadata, markers_refreshed = get_or_create_marker_config(
        img,
        image_path,
        marker_config,
        refresh=refresh_markers,
        marker_color=marker_color,
    )
    raw_polygons, cluster_result, selected_hsv_range, selected_cluster_ids, polygon_groups = extract_raw_polygons(
        img,
        mode=mode,
        kmeans_k=kmeans_k,
        include_clusters=include_clusters,
        color_config=color_config,
        color_range=color_range,
        min_area=min_area,
        epsilon_ratio=epsilon_ratio,
        open_kernel=open_kernel,
        close_kernel=close_kernel,
    )

    shifted_polygons = []
    color_groups = []
    canvas_w, canvas_h = 1000, 1000
    canvas = None

    if matrix is not None and max_w > 0 and max_h > 0:
        warped_polygons = transform_polygons(raw_polygons, matrix)
        shifted_polygons, canvas_w, canvas_h = auto_center_polygons(warped_polygons)
        color_groups = assign_shifted_polygons_to_groups(polygon_groups, shifted_polygons)
        canvas = draw_polygons_canvas(shifted_polygons, canvas_w, canvas_h, (255, 0, 0))

    debug_paths = None
    if debug:
        debug_dir = debug_dir or str(Path(output_dir) / "debug")
        debug_original = draw_debug_original(img, marker_points, raw_polygons)
        if canvas is None:
            canvas = draw_polygons_canvas([], canvas_w, canvas_h, (255, 0, 0))
        debug_paths = save_debug_images(debug_original, canvas, debug_dir)
        if cluster_result is not None:
            save_cluster_debug_images(img, cluster_result["clusters"], debug_dir)
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
        morphology=build_morphology_config(open_kernel, close_kernel) if mode == "kmeans" else None,
    )

    grouping_result = None
    if run_grouping:
        resolved_debug_dir = debug_dir or str(Path(output_dir) / "debug")
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

    return {
        "mode": mode,
        "markers": marker_points,
        "marker_metadata": marker_metadata,
        "markers_refreshed": markers_refreshed,
        "raw_polygons": raw_polygons,
        "shifted_polygons": shifted_polygons,
        "color_groups": color_groups,
        "canvas_size": (canvas_w, canvas_h),
        "debug_paths": debug_paths,
        "cluster_result": cluster_result,
        "output_paths": output_paths,
        "grouping_result": grouping_result,
    }


def main():
    """Execute the command-line pipeline."""
    args = parse_args()
    result = run_pipeline(
        args.image,
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
    if result["grouping_result"]:
        grouping = result["grouping_result"]
        print(
            "polygon_groups="
            f"{grouping['output_file']}, groups={grouping['group_count']}, edges={grouping['edge_count']}"
        )
        print(f"grouping_debug_image={grouping['debug_image']}")


if __name__ == "__main__":
    main()
