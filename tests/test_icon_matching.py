import argparse
from pathlib import Path
import sys

import cv2

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.icon_matching import (  # noqa: E402
    draw_icon_matches,
    load_icon_templates,
    match_icons,
    normalize_threshold,
    parse_scales,
    save_icon_matches,
)


def parse_args():
    """Parse icon matching test options."""
    parser = argparse.ArgumentParser(description="Test icon template matching on test1.png.")
    parser.add_argument("--image", default="test1.png")
    parser.add_argument("--template-dir", default="templates/icons")
    parser.add_argument("--output", default="../test_image_output/tests/output_icon_matching/icon_matches.json")
    parser.add_argument("--debug-image", default="../test_image_output/tests/output_icon_matching/icon_matches.png")
    parser.add_argument("--threshold", type=float, default=0.83)
    parser.add_argument("--scales", default="0.6,0.75,0.9,1.0,1.15,1.3")
    parser.add_argument("--iou-threshold", type=float, default=0.35)
    parser.add_argument("--use-edges", action="store_true")
    parser.add_argument("--no-flipped", action="store_true", help="Disable horizontally flipped template matching.")
    parser.add_argument("--show", action="store_true")
    parser.add_argument("--show-ms", type=int, default=3000)
    return parser.parse_args()


def main():
    """Run icon matching test."""
    args = parse_args()
    use_edges = args.use_edges
    include_flipped = not args.no_flipped
    templates = load_icon_templates(args.template_dir, use_edges=use_edges, include_flipped=include_flipped)
    result = match_icons(
        args.image,
        args.template_dir,
        threshold=normalize_threshold(args.threshold),
        scales=parse_scales(args.scales),
        use_edges=use_edges,
        iou_threshold=args.iou_threshold,
        include_flipped=include_flipped,
    )
    output_path = save_icon_matches(result, args.output)
    debug_path = draw_icon_matches(args.image, result["icons"], args.debug_image)

    print(f"templates={len(templates)}")
    print(f"raw_matches={result['raw_match_count']}, matches={result['match_count']}")
    print(f"output={output_path}")
    print(f"debug_image={debug_path}")

    if args.show:
        debug_image = cv2.imread(str(debug_path))
        if debug_image is not None:
            cv2.imshow("icon matches", debug_image)
            cv2.waitKey(args.show_ms)
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
