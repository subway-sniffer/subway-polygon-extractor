import argparse
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.main import run_pipeline  # noqa: E402


def parse_args():
    """Parse connection detection test options."""
    parser = argparse.ArgumentParser(description="Test bridge connection candidate detection.")
    parser.add_argument("--image", default="test1.png")
    parser.add_argument("--polygon-image")
    parser.add_argument("--inpaint-icons-matches")
    parser.add_argument("--output-dir", default="../test_image_output/tests/output_connection_detection")
    parser.add_argument("--debug-dir", default="../test_image_output/tests/output_connection_detection/debug")
    parser.add_argument("--kmeans-k", type=int, default=6)
    parser.add_argument("--include-clusters", default="1,2,3")
    parser.add_argument("--connection-bridge-clusters", default="4,5,6")
    parser.add_argument("--marker-color", default="magenta")
    parser.add_argument("--marker-config", default="config/test1_marker_config.json")
    parser.add_argument("--connection-search-distance", type=float, default=80)
    parser.add_argument("--connection-max-nearby", type=int, default=6)
    parser.add_argument("--connection-min-area", type=float, default=300)
    parser.add_argument("--run-grouping", action="store_true")
    return parser.parse_args()


def main():
    """Run the full pipeline and save connection candidates."""
    args = parse_args()
    output_dir = Path(args.output_dir)
    debug_dir = Path(args.debug_dir)
    result = run_pipeline(
        args.image,
        polygon_image=args.polygon_image,
        mode="kmeans",
        kmeans_k=args.kmeans_k,
        include_clusters=args.include_clusters,
        marker_color=args.marker_color,
        marker_config=args.marker_config,
        output_dir=str(output_dir),
        debug=True,
        debug_dir=str(debug_dir),
        inpaint_icons_matches=args.inpaint_icons_matches,
        run_grouping=args.run_grouping,
        detect_connections=True,
        connection_bridge_clusters=args.connection_bridge_clusters,
        connection_output=str(output_dir / "connections.json"),
        connection_debug_image=str(debug_dir / "connections.png"),
        connection_search_distance=args.connection_search_distance,
        connection_max_nearby=args.connection_max_nearby,
        connection_min_area=args.connection_min_area,
    )

    connection_result = result["connection_result"]
    print(f"floor_polygons={result['output_paths']['floor_polygons_file']}")
    print(f"connections={connection_result['output_file']}")
    print(f"connection_debug_image={connection_result['debug_image']}")
    print(f"connection_count={connection_result['connection_count']}")
    print(f"bridge_components={connection_result['component_count']}")


if __name__ == "__main__":
    main()
