import argparse
from pathlib import Path

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
    from pipeline.marker_detection import detect_red_markers, get_perspective_matrix
    from pipeline.polygon_extraction import (
        DEFAULT_LOWER_BLUE,
        DEFAULT_UPPER_BLUE,
        DEFAULT_EPSILON_RATIO,
        DEFAULT_MIN_AREA,
        extract_polygons_by_hsv,
        extract_polygons_from_mask,
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
    from marker_detection import detect_red_markers, get_perspective_matrix
    from polygon_extraction import (
        DEFAULT_LOWER_BLUE,
        DEFAULT_UPPER_BLUE,
        DEFAULT_EPSILON_RATIO,
        DEFAULT_MIN_AREA,
        extract_polygons_by_hsv,
        extract_polygons_from_mask,
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
    parser.add_argument("--output-dir", default="../test_image_output/output", help="Directory for JSON output files.")
    parser.add_argument("--min-area", type=float, default=DEFAULT_MIN_AREA, help="Minimum contour area.")
    parser.add_argument("--epsilon-ratio", type=float, default=DEFAULT_EPSILON_RATIO, help="approxPolyDP epsilon ratio.")
    parser.add_argument("--open-kernel", type=int, default=DEFAULT_OPEN_KERNEL, help="Per-cluster MORPH_OPEN kernel size.")
    parser.add_argument("--close-kernel", type=int, default=DEFAULT_CLOSE_KERNEL, help="Per-cluster MORPH_CLOSE kernel size.")
    parser.add_argument("--debug", action="store_true", help="Draw and save debug images.")
    parser.add_argument("--show", action="store_true", help="Show OpenCV windows for debug images.")
    parser.add_argument("--debug-dir", help="Directory for saved debug images. Defaults to <output-dir>/debug.")
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


def run_pipeline(
    image_path,
    mode="hsv",
    kmeans_k=6,
    include_clusters=None,
    color_config="config/color_ranges.json",
    color_range="floor_blue",
    output_dir="../test_image_output/output",
    min_area=DEFAULT_MIN_AREA,
    epsilon_ratio=DEFAULT_EPSILON_RATIO,
    open_kernel=DEFAULT_OPEN_KERNEL,
    close_kernel=DEFAULT_CLOSE_KERNEL,
    debug=False,
    show=False,
    debug_dir=None,
):
    """Run marker detection, polygon extraction, vertex transform, and visualization."""
    img = load_image(image_path)

    marker_points = detect_red_markers(img)
    matrix, max_w, max_h = get_perspective_matrix(marker_points)
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

    return {
        "mode": mode,
        "markers": marker_points,
        "raw_polygons": raw_polygons,
        "shifted_polygons": shifted_polygons,
        "color_groups": color_groups,
        "canvas_size": (canvas_w, canvas_h),
        "debug_paths": debug_paths,
        "cluster_result": cluster_result,
        "output_paths": output_paths,
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
        output_dir=args.output_dir,
        min_area=args.min_area,
        epsilon_ratio=args.epsilon_ratio,
        open_kernel=args.open_kernel,
        close_kernel=args.close_kernel,
        debug=args.debug,
        show=args.show,
        debug_dir=args.debug_dir,
    )
    print(f"markers={len(result['markers'])}, polygons={len(result['raw_polygons'])}")
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


if __name__ == "__main__":
    main()
