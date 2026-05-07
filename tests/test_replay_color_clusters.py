import argparse
import json
from pathlib import Path
import sys

import cv2
import numpy as np

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.color_clustering import (  # noqa: E402
    DEFAULT_CLOSE_KERNEL,
    DEFAULT_OPEN_KERNEL,
    apply_morphology_to_clusters,
    build_morphology_config,
    extract_color_clusters,
    parse_cluster_ids,
    rebuild_clusters_from_metadata,
)
from pipeline.export_json import save_color_metadata, save_floor_polygons_json  # noqa: E402
from pipeline.marker_detection import get_or_create_marker_config  # noqa: E402
from pipeline.polygon_extraction import DEFAULT_EPSILON_RATIO, DEFAULT_MIN_AREA, extract_polygons_from_mask  # noqa: E402
from pipeline.transform import auto_center_polygons, transform_polygons  # noqa: E402


def load_image(image_path):
    """Load a test image from disk."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")
    return img


def load_json(json_path):
    """Load JSON from disk."""
    with Path(json_path).open("r", encoding="utf-8") as file:
        return json.load(file)


def build_cluster_metadata(cluster_result, selected_cluster_ids, morphology):
    """Build color cluster metadata with selected flags."""
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


def selected_cluster_ids_from_metadata(cluster_metadata):
    """Return selected cluster ids from color cluster metadata."""
    return [cluster["id"] for cluster in cluster_metadata["clusters"] if cluster.get("selected", False)]


def extract_centered_polygons_from_cluster_file(img, image_path, cluster_file, marker_config, refresh_markers, min_area, epsilon_ratio):
    """Read color_clusters.json and extract centered polygons from saved cluster centers."""
    cluster_metadata = load_json(cluster_file)
    rebuilt_cluster_result = rebuild_clusters_from_metadata(img, cluster_metadata)
    rebuilt_cluster_result["clusters"] = apply_morphology_to_clusters(
        rebuilt_cluster_result["clusters"],
        cluster_metadata.get("default_morphology"),
    )
    selected_ids = selected_cluster_ids_from_metadata(cluster_metadata)

    raw_polygons = []
    color_groups = []
    for cluster in rebuilt_cluster_result["clusters"]:
        if cluster["id"] not in selected_ids:
            continue
        cluster_polygons = extract_polygons_from_mask(
            cluster["mask"],
            min_area=min_area,
            epsilon_ratio=epsilon_ratio,
        )
        raw_polygons.extend(cluster_polygons)
        color_groups.append(
            {
                "type": "kmeans_cluster",
                "cluster_id": cluster["id"],
                "color_space": rebuilt_cluster_result["color_space"],
                "center": cluster["center"],
                "pixel_count": cluster["pixel_count"],
                "morphology": cluster.get("morphology"),
                "raw_polygons": cluster_polygons,
            }
        )

    marker_points, matrix, max_w, max_h, _marker_metadata, _markers_refreshed = get_or_create_marker_config(
        img,
        image_path,
        marker_config,
        refresh=refresh_markers,
    )
    if matrix is None or max_w <= 0 or max_h <= 0:
        return marker_points, raw_polygons, [], [], (1000, 1000)

    warped_polygons = transform_polygons(raw_polygons, matrix)
    shifted_polygons, canvas_w, canvas_h = auto_center_polygons(warped_polygons)
    shifted_groups = assign_shifted_polygons_to_groups(color_groups, shifted_polygons)
    return marker_points, raw_polygons, shifted_polygons, shifted_groups, (canvas_w, canvas_h)


def assign_shifted_polygons_to_groups(color_groups, shifted_polygons):
    """Attach shifted polygons back to their cluster groups."""
    cursor = 0
    shifted_groups = []
    for group in color_groups:
        count = len(group["raw_polygons"])
        group_polygons = shifted_polygons[cursor:cursor + count]
        cursor += count
        shifted_group = {key: value for key, value in group.items() if key != "raw_polygons"}
        shifted_group["polygon_count"] = len(group_polygons)
        shifted_group["polygons"] = group_polygons
        shifted_groups.append(shifted_group)
    return shifted_groups


def cluster_preview_color(img, mask):
    """Calculate a visible BGR preview color from a cluster mask."""
    pixels = img[mask > 0]
    if len(pixels) == 0:
        return (0, 255, 0)
    color = np.mean(pixels, axis=0)
    return tuple(int(value) for value in color)


def save_cluster_polygon_images(img, cluster_file, output_dir, min_area, epsilon_ratio):
    """Save one polygon debug image per replayed cluster."""
    cluster_metadata = load_json(cluster_file)
    rebuilt_cluster_result = rebuild_clusters_from_metadata(img, cluster_metadata)
    rebuilt_cluster_result["clusters"] = apply_morphology_to_clusters(
        rebuilt_cluster_result["clusters"],
        cluster_metadata.get("default_morphology"),
    )
    selected_ids = set(selected_cluster_ids_from_metadata(cluster_metadata))

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    for cluster in rebuilt_cluster_result["clusters"]:
        polygons = extract_polygons_from_mask(
            cluster["mask"],
            min_area=min_area,
            epsilon_ratio=epsilon_ratio,
        )
        preview = cv2.bitwise_and(img, img, mask=cluster["mask"])
        contour_color = cluster_preview_color(img, cluster["mask"])
        cv2.drawContours(preview, polygons, -1, contour_color, 2)
        if cluster["id"] in selected_ids:
            cv2.drawContours(preview, polygons, -1, (0, 255, 0), 1)

        selected_suffix = "selected" if cluster["id"] in selected_ids else "unselected"
        image_path = output_path / f"cluster_{cluster['id']:02d}_{selected_suffix}_polygons.png"
        cv2.imwrite(str(image_path), preview)
        saved_paths.append(image_path)

    return saved_paths


def cluster_center_to_bgr(group):
    """Convert a cluster center in its stored color space to a BGR fill color."""
    center = np.array(group["center"], dtype=np.uint8).reshape((1, 1, 3))
    color_space = group.get("color_space", "lab").lower()
    if color_space == "lab":
        bgr = cv2.cvtColor(center, cv2.COLOR_LAB2BGR)[0, 0]
    elif color_space == "hsv":
        bgr = cv2.cvtColor(center, cv2.COLOR_HSV2BGR)[0, 0]
    elif color_space == "bgr":
        bgr = center[0, 0]
    else:
        bgr = np.array([0, 255, 0], dtype=np.uint8)
    return tuple(int(value) for value in bgr)


def save_centered_color_group_images(color_groups, canvas_size, output_dir):
    """Save one centered filled polygon canvas per color group."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    canvas_w, canvas_h = canvas_size
    saved_paths = []
    for group in color_groups:
        canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
        polygons = [np.asarray(poly, dtype=np.int32) for poly in group["polygons"]]
        fill_color = cluster_center_to_bgr(group)
        cv2.fillPoly(canvas, polygons, fill_color)
        cv2.polylines(canvas, polygons, True, (0, 255, 0), 2)

        cluster_id = group.get("cluster_id", "unknown")
        image_path = output_path / f"cluster_{int(cluster_id):02d}_centered_filled.png"
        cv2.imwrite(str(image_path), canvas)
        saved_paths.append(image_path)

    return saved_paths


def parse_args():
    """Parse test script arguments."""
    parser = argparse.ArgumentParser(description="Replay polygon extraction from saved color_clusters.json.")
    parser.add_argument("--image", default="test_marker.png", help="Input image path.")
    parser.add_argument("--output-dir", default="../test_image_output/tests/output_replay_k4", help="Test output directory.")
    parser.add_argument("--marker-config", default="config/marker_config.json", help="Marker detection cache config path.")
    parser.add_argument("--refresh-markers", action="store_true", help="Detect red markers again and overwrite marker config.")
    parser.add_argument("--include-clusters", default="1,2,3", help="Selected cluster ids for the k=4 test.")
    parser.add_argument("--kmeans-k", type=int, default=4, help="K-Means cluster count for this test.")
    parser.add_argument("--min-area", type=float, default=DEFAULT_MIN_AREA, help="Minimum contour area.")
    parser.add_argument("--epsilon-ratio", type=float, default=DEFAULT_EPSILON_RATIO, help="approxPolyDP epsilon ratio.")
    parser.add_argument("--open-kernel", type=int, default=DEFAULT_OPEN_KERNEL, help="Per-cluster MORPH_OPEN kernel size.")
    parser.add_argument("--close-kernel", type=int, default=DEFAULT_CLOSE_KERNEL, help="Per-cluster MORPH_CLOSE kernel size.")
    parser.add_argument("--save-cluster-polygons", action="store_true", help="Save polygon preview images per cluster.")
    parser.add_argument("--cluster-polygons-dir", help="Directory for per-cluster polygon preview images.")
    parser.add_argument(
        "--save-centered-color-polygons",
        action="store_true",
        help="Save centered filled polygon canvases per selected color cluster.",
    )
    parser.add_argument("--centered-color-polygons-dir", help="Directory for centered filled color polygon images.")
    return parser.parse_args()


def main():
    """Create k=4 cluster metadata, read it back, and extract polygons from it."""
    args = parse_args()
    img = load_image(args.image)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    selected_ids = parse_cluster_ids(args.include_clusters)
    morphology = build_morphology_config(args.open_kernel, args.close_kernel)
    cluster_result = extract_color_clusters(img, k=args.kmeans_k, color_space="lab")
    cluster_result["clusters"] = apply_morphology_to_clusters(cluster_result["clusters"], morphology)
    cluster_result["default_morphology"] = morphology
    cluster_metadata = build_cluster_metadata(cluster_result, selected_ids, morphology)

    cluster_file = output_dir / "color_clusters.json"
    save_color_metadata(cluster_metadata, cluster_file)

    marker_points, raw_polygons, shifted_polygons, color_groups, canvas_size = extract_centered_polygons_from_cluster_file(
        img,
        args.image,
        cluster_file,
        marker_config=args.marker_config,
        refresh_markers=args.refresh_markers,
        min_area=args.min_area,
        epsilon_ratio=args.epsilon_ratio,
    )

    extraction_metadata = {
        "mode": "kmeans_replay",
        "color_space": cluster_metadata["color_space"],
        "selected_clusters": selected_cluster_ids_from_metadata(cluster_metadata),
        "min_area": args.min_area,
        "epsilon_ratio": args.epsilon_ratio,
        "color_metadata_file": str(cluster_file),
        "morphology": morphology,
    }
    floor_polygons_file = output_dir / "floor_polygons_from_clusters.json"
    save_floor_polygons_json(
        shifted_polygons,
        extraction_metadata,
        floor_polygons_file,
        color_groups=color_groups,
    )

    cluster_polygon_paths = []
    if args.save_cluster_polygons:
        cluster_polygons_dir = args.cluster_polygons_dir or output_dir / "cluster_polygons"
        cluster_polygon_paths = save_cluster_polygon_images(
            img,
            cluster_file,
            output_dir=cluster_polygons_dir,
            min_area=args.min_area,
            epsilon_ratio=args.epsilon_ratio,
        )

    centered_color_polygon_paths = []
    if args.save_centered_color_polygons:
        centered_color_polygons_dir = args.centered_color_polygons_dir or output_dir / "centered_color_polygons"
        centered_color_polygon_paths = save_centered_color_group_images(
            color_groups,
            canvas_size,
            output_dir=centered_color_polygons_dir,
        )

    print(f"kmeans_k={args.kmeans_k}")
    print(f"morphology={morphology}")
    print(f"selected_clusters={extraction_metadata['selected_clusters']}")
    print(f"markers={len(marker_points)}, polygons={len(raw_polygons)}")
    print(f"canvas_size={canvas_size[0]}x{canvas_size[1]}")
    print(f"color_metadata={cluster_file}")
    print(f"floor_polygons={floor_polygons_file}")
    if cluster_polygon_paths:
        print(f"cluster_polygon_images={len(cluster_polygon_paths)}")
        print(f"cluster_polygon_dir={Path(cluster_polygon_paths[0]).parent}")
    if centered_color_polygon_paths:
        print(f"centered_color_polygon_images={len(centered_color_polygon_paths)}")
        print(f"centered_color_polygon_dir={Path(centered_color_polygon_paths[0]).parent}")


if __name__ == "__main__":
    main()
