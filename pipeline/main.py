import argparse

import cv2

try:
    from pipeline.marker_detection import detect_red_markers, get_perspective_matrix
    from pipeline.polygon_extraction import DEFAULT_LOWER_BLUE, DEFAULT_UPPER_BLUE, extract_polygons_by_hsv
    from pipeline.transform import auto_center_polygons, transform_polygons
    from pipeline.visualization import (
        draw_debug_original,
        draw_polygons_canvas,
        save_debug_images,
        show_debug_images,
    )
except ModuleNotFoundError:
    from marker_detection import detect_red_markers, get_perspective_matrix
    from polygon_extraction import DEFAULT_LOWER_BLUE, DEFAULT_UPPER_BLUE, extract_polygons_by_hsv
    from transform import auto_center_polygons, transform_polygons
    from visualization import draw_debug_original, draw_polygons_canvas, save_debug_images, show_debug_images


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
    parser.add_argument("--debug", action="store_true", help="Draw and save debug images.")
    parser.add_argument("--show", action="store_true", help="Show OpenCV windows for debug images.")
    parser.add_argument("--debug-dir", default="debug_output", help="Directory for saved debug images.")
    return parser.parse_args()


def run_pipeline(image_path, debug=False, show=False, debug_dir="debug_output"):
    """Run marker detection, polygon extraction, vertex transform, and visualization."""
    img = load_image(image_path)

    marker_points = detect_red_markers(img)
    matrix, max_w, max_h = get_perspective_matrix(marker_points)
    raw_polygons = extract_polygons_by_hsv(img, DEFAULT_LOWER_BLUE, DEFAULT_UPPER_BLUE)

    shifted_polygons = []
    canvas_w, canvas_h = 1000, 1000
    canvas = None

    if matrix is not None and max_w > 0 and max_h > 0:
        warped_polygons = transform_polygons(raw_polygons, matrix)
        shifted_polygons, canvas_w, canvas_h = auto_center_polygons(warped_polygons)
        canvas = draw_polygons_canvas(shifted_polygons, canvas_w, canvas_h, (255, 0, 0))

    debug_paths = None
    if debug:
        debug_original = draw_debug_original(img, marker_points, raw_polygons)
        if canvas is None:
            canvas = draw_polygons_canvas([], canvas_w, canvas_h, (255, 0, 0))
        debug_paths = save_debug_images(debug_original, canvas, debug_dir)
        if show:
            show_debug_images(debug_original, canvas)

    return {
        "markers": marker_points,
        "raw_polygons": raw_polygons,
        "shifted_polygons": shifted_polygons,
        "canvas_size": (canvas_w, canvas_h),
        "debug_paths": debug_paths,
    }


def main():
    """Execute the command-line pipeline."""
    args = parse_args()
    result = run_pipeline(args.image, debug=args.debug, show=args.show, debug_dir=args.debug_dir)
    print(f"markers={len(result['markers'])}, polygons={len(result['raw_polygons'])}")
    if result["debug_paths"]:
        original_path, canvas_path = result["debug_paths"]
        print(f"debug_original={original_path}")
        print(f"debug_canvas={canvas_path}")


if __name__ == "__main__":
    main()
