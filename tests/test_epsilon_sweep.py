import argparse
import json
from pathlib import Path
import sys

import cv2

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.export_json import save_color_metadata  # noqa: E402
from pipeline.main import run_pipeline  # noqa: E402
from pipeline.visualization import draw_polygons_canvas  # noqa: E402


def parse_ratios(value):
    """Parse comma-separated epsilon ratios."""
    return [float(item.strip()) for item in value.split(",") if item.strip()]


def ratio_dir_name(ratio):
    """Convert a ratio into a filesystem-friendly directory suffix."""
    return f"epsilon_{ratio:g}".replace(".", "_")


def polygon_edge_counts(polygons):
    """Return edge counts for OpenCV-style polygon arrays/lists."""
    return [len(poly) for poly in polygons]


def build_summary_item(ratio, output_dir, result):
    """Build one epsilon sweep summary record."""
    edge_counts = polygon_edge_counts(result["shifted_polygons"])
    return {
        "epsilon_ratio": ratio,
        "output_dir": str(output_dir),
        "mode": result["mode"],
        "polygon_count": len(result["shifted_polygons"]),
        "edge_counts": edge_counts,
        "min_edges": min(edge_counts) if edge_counts else 0,
        "max_edges": max(edge_counts) if edge_counts else 0,
        "total_edges": sum(edge_counts),
        "color_metadata_file": str(result["output_paths"]["color_metadata_file"]),
        "floor_polygons_file": str(result["output_paths"]["floor_polygons_file"]),
        "polygon_canvas_file": str(output_dir / "polygon_canvas.png"),
    }


def parse_args():
    """Parse epsilon sweep test arguments."""
    parser = argparse.ArgumentParser(description="Run polygon extraction with multiple epsilon ratios.")
    parser.add_argument("--image", default="test_marker.png", help="Input image path.")
    parser.add_argument("--output-dir", default="../test_image_output/tests/output_epsilon_sweep", help="Sweep output directory.")
    parser.add_argument("--ratios", default="0.001,0.003,0.005,0.01", help="Comma-separated epsilon ratios.")
    parser.add_argument("--mode", choices=["hsv", "kmeans"], default="kmeans", help="Extraction mode.")
    parser.add_argument("--kmeans-k", type=int, default=4, help="K-Means cluster count.")
    parser.add_argument("--include-clusters", default="1,3", help="Selected K-Means cluster ids.")
    parser.add_argument("--open-kernel", type=int, default=3, help="Per-cluster MORPH_OPEN kernel size.")
    parser.add_argument("--close-kernel", type=int, default=5, help="Per-cluster MORPH_CLOSE kernel size.")
    parser.add_argument("--debug", action="store_true", help="Save debug images for every ratio.")
    return parser.parse_args()


def main():
    """Run the epsilon ratio sweep and save per-ratio outputs plus a summary."""
    args = parse_args()
    sweep_dir = Path(args.output_dir)
    sweep_dir.mkdir(parents=True, exist_ok=True)

    summary = []
    for ratio in parse_ratios(args.ratios):
        ratio_output_dir = sweep_dir / ratio_dir_name(ratio)
        result = run_pipeline(
            args.image,
            mode=args.mode,
            kmeans_k=args.kmeans_k,
            include_clusters=args.include_clusters,
            output_dir=ratio_output_dir,
            epsilon_ratio=ratio,
            open_kernel=args.open_kernel,
            close_kernel=args.close_kernel,
            debug=args.debug,
        )
        item = build_summary_item(ratio, ratio_output_dir, result)
        summary.append(item)

        edge_counts_file = ratio_output_dir / "edge_counts.json"
        save_color_metadata(item, edge_counts_file)

        canvas_w, canvas_h = result["canvas_size"]
        canvas = draw_polygons_canvas(result["shifted_polygons"], canvas_w, canvas_h, (255, 0, 0))
        cv2.imwrite(item["polygon_canvas_file"], canvas)

        print(
            f"epsilon_ratio={ratio:g}, polygons={item['polygon_count']}, "
            f"total_edges={item['total_edges']}, edge_counts={item['edge_counts']}, "
            f"polygon_canvas={item['polygon_canvas_file']}"
        )

    summary_file = sweep_dir / "summary.json"
    with summary_file.open("w", encoding="utf-8") as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)

    print(f"summary={summary_file}")


if __name__ == "__main__":
    main()
