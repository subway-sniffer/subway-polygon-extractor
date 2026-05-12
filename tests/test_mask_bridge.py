import argparse
from pathlib import Path
import sys

import cv2
import numpy as np

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.color_clustering import (  # noqa: E402
    apply_morphology_to_clusters,
    build_morphology_config,
    extract_color_clusters,
    parse_cluster_ids,
)
from pipeline.mask_bridge import (  # noqa: E402
    apply_bridge_correction_to_mask,
    combine_masks_by_ids,
    parse_bridge_angles,
)
from pipeline.polygon_extraction import DEFAULT_EPSILON_RATIO, DEFAULT_MIN_AREA, extract_polygons_from_mask  # noqa: E402


def parse_args():
    """Parse mask bridge test options."""
    parser = argparse.ArgumentParser(description="Test bridge-cluster mask correction.")
    parser.add_argument("--image", default="test1.png")
    parser.add_argument("--output-dir", default="../test_image_output/tests/output_mask_bridge")
    parser.add_argument("--kmeans-k", type=int, default=6)
    parser.add_argument("--include-clusters", default="1,2,3")
    parser.add_argument("--bridge-clusters", default="4,5,6")
    parser.add_argument("--min-area", type=float, default=DEFAULT_MIN_AREA)
    parser.add_argument("--epsilon-ratio", type=float, default=DEFAULT_EPSILON_RATIO)
    parser.add_argument("--open-kernel", type=int, default=3)
    parser.add_argument("--close-kernel", type=int, default=5)
    parser.add_argument("--bridge-contact-radius", type=int, default=10)
    parser.add_argument("--bridge-search-radius", type=int, default=40)
    parser.add_argument("--bridge-scan-step", type=int, default=4)
    parser.add_argument("--bridge-line-thickness", type=int, default=4)
    parser.add_argument("--bridge-min-area", type=float, default=20)
    parser.add_argument("--bridge-angles")
    parser.add_argument("--show", action="store_true")
    parser.add_argument("--show-ms", type=int, default=3000)
    return parser.parse_args()


def draw_mask_polygons(mask, polygons, color=(0, 180, 255)):
    """Draw a binary mask and its extracted polygon outlines."""
    canvas = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    canvas[mask > 0] = (50, 50, 50)
    cv2.drawContours(canvas, polygons, -1, color, 2)
    return canvas


def draw_compare_canvas(before_mask, connection_mask, after_mask):
    """Build a side-by-side before/connection/after debug canvas."""
    before = cv2.cvtColor(before_mask, cv2.COLOR_GRAY2BGR)
    connection = cv2.cvtColor(connection_mask, cv2.COLOR_GRAY2BGR)
    after = cv2.cvtColor(after_mask, cv2.COLOR_GRAY2BGR)
    before[before_mask > 0] = (80, 80, 80)
    connection[connection_mask > 0] = (0, 220, 255)
    after[after_mask > 0] = (80, 80, 80)
    after[connection_mask > 0] = (0, 220, 255)
    return np.hstack([before, connection, after])


def save_cluster_outputs(output_dir, cluster_id, before_mask, connection_mask, after_mask, before_polygons, after_polygons):
    """Save mask bridge debug images for one cluster."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_before_mask.png"), before_mask)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_connection_mask.png"), connection_mask)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_after_mask.png"), after_mask)
    cv2.imwrite(
        str(output_path / f"cluster_{cluster_id:02d}_before_polygons.png"),
        draw_mask_polygons(before_mask, before_polygons, color=(0, 0, 255)),
    )
    cv2.imwrite(
        str(output_path / f"cluster_{cluster_id:02d}_after_polygons.png"),
        draw_mask_polygons(after_mask, after_polygons, color=(0, 220, 255)),
    )
    cv2.imwrite(
        str(output_path / f"cluster_{cluster_id:02d}_compare.png"),
        draw_compare_canvas(before_mask, connection_mask, after_mask),
    )


def main():
    """Run a K-Means bridge-cluster correction test."""
    args = parse_args()
    img = cv2.imread(args.image)
    if img is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {args.image}")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    morphology = build_morphology_config(args.open_kernel, args.close_kernel)
    cluster_result = extract_color_clusters(img, k=args.kmeans_k, color_space="lab")
    clusters = apply_morphology_to_clusters(cluster_result["clusters"], morphology)
    selected_ids = parse_cluster_ids(args.include_clusters)
    bridge_ids = parse_cluster_ids(args.bridge_clusters)
    bridge_mask = combine_masks_by_ids(clusters, bridge_ids)
    cv2.imwrite(str(output_dir / "bridge_cluster_mask.png"), bridge_mask)

    angles = parse_bridge_angles(args.bridge_angles)
    show_canvases = []
    for cluster in clusters:
        if cluster["id"] not in selected_ids:
            continue

        before_mask = cluster["mask"]
        after_mask, connection_mask, corrections = apply_bridge_correction_to_mask(
            before_mask,
            bridge_mask,
            contact_radius=args.bridge_contact_radius,
            search_radius=args.bridge_search_radius,
            scan_step=args.bridge_scan_step,
            line_thickness=args.bridge_line_thickness,
            min_component_area=args.bridge_min_area,
            angles=angles,
        )
        before_polygons = extract_polygons_from_mask(
            before_mask,
            min_area=args.min_area,
            epsilon_ratio=args.epsilon_ratio,
        )
        after_polygons = extract_polygons_from_mask(
            after_mask,
            min_area=args.min_area,
            epsilon_ratio=args.epsilon_ratio,
        )
        save_cluster_outputs(
            output_dir,
            cluster["id"],
            before_mask,
            connection_mask,
            after_mask,
            before_polygons,
            after_polygons,
        )
        show_canvases.append((f"cluster_{cluster['id']:02d}_bridge", draw_compare_canvas(before_mask, connection_mask, after_mask)))
        print(
            f"cluster={cluster['id']}, before_polygons={len(before_polygons)}, "
            f"after_polygons={len(after_polygons)}, corrections={len(corrections)}, "
            f"connection_pixels={int(np.count_nonzero(connection_mask))}"
        )

    print(f"output_dir={output_dir}")
    if args.show:
        for name, canvas in show_canvases:
            cv2.imshow(name, canvas)
        cv2.waitKey(args.show_ms)
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
