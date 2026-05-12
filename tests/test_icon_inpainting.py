import argparse
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.preprocessing import (  # noqa: E402
    draw_mask_overlay,
    inpaint_icons_from_matches,
    show_icon_inpaint_debug,
)


def parse_args():
    """Parse icon inpainting test options."""
    parser = argparse.ArgumentParser(description="Test icon masking and inpainting.")
    parser.add_argument("--image", default="test1.png")
    parser.add_argument("--icon-matches", default="../test_image_output/tests/output_icon_matching/icon_matches.json")
    parser.add_argument("--output-dir", default="../test_image_output/tests/output_icon_inpainting")
    parser.add_argument("--padding", type=int, default=0)
    parser.add_argument("--dilate-kernel", type=int, default=5)
    parser.add_argument("--radius", type=int, default=5)
    parser.add_argument("--method", choices=["telea", "ns", "directional"], default="directional")
    parser.add_argument("--roi-padding", type=int, default=15)
    parser.add_argument("--min-score", type=float)
    parser.add_argument("--show", action="store_true")
    parser.add_argument("--show-ms", type=int, default=3000)
    return parser.parse_args()


def main():
    """Run icon inpainting test."""
    args = parse_args()
    result = inpaint_icons_from_matches(
        args.image,
        args.icon_matches,
        args.output_dir,
        padding=args.padding,
        dilate_kernel=args.dilate_kernel,
        radius=args.radius,
        method=args.method,
        min_score=args.min_score,
        roi_padding=args.roi_padding,
    )

    print(f"selected_icons={len(result['selected_icons'])}")
    for name, path in result["debug_paths"].items():
        print(f"{name}={path}")

    if args.show:
        overlay = draw_mask_overlay(result["image"], result["inpaint_mask"])
        show_icon_inpaint_debug(result["image"], overlay, result["inpainted"], wait_ms=args.show_ms)


if __name__ == "__main__":
    main()
