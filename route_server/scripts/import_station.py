import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from route_server.app.importer import import_station_package
from route_server.app.json_utils import load_json


def parse_args():
    """Parse station import CLI arguments."""
    parser = argparse.ArgumentParser(description="Import one station route package into route_server/data.")
    parser.add_argument("--station-id", required=True)
    parser.add_argument("--station-name", required=True)
    parser.add_argument("--line-id", action="append", default=[])
    parser.add_argument("--version", default="v001")
    parser.add_argument("--navigation-graph", required=True)
    parser.add_argument("--route-video-edges")
    parser.add_argument("--scene-planes")
    return parser.parse_args()


def main():
    """Run the import CLI."""
    args = parse_args()
    metadata = {
        "station_id": args.station_id,
        "station_name": args.station_name,
        "line_ids": args.line_id,
        "version": args.version,
    }
    files = import_station_package(
        metadata,
        load_json(args.navigation_graph),
        route_video_edges=load_json(args.route_video_edges) if args.route_video_edges else None,
        scene_planes=load_json(args.scene_planes) if args.scene_planes else None,
    )
    print(f"saved: {files['root']}")


if __name__ == "__main__":
    main()
