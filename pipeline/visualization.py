from pathlib import Path

import cv2
import numpy as np


def draw_debug_original(img, marker_points, polygons):
    """Draw marker centers and raw polygons on the original image."""
    debug_img = img.copy()
    for pt in marker_points:
        cv2.circle(debug_img, (pt[0], pt[1]), 15, (255, 0, 255), -1)
    cv2.drawContours(debug_img, polygons, -1, (0, 255, 0), 3)
    return debug_img


def draw_polygons_canvas(polygons, canvas_w, canvas_h, fill_color):
    """Draw centered polygons on a blank canvas."""
    blank_canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
    cv2.fillPoly(blank_canvas, polygons, fill_color)
    cv2.polylines(blank_canvas, polygons, True, (0, 255, 0), 2)
    return blank_canvas


def save_debug_images(debug_original, polygon_canvas, output_dir):
    """Save debug images to disk and return the saved paths."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    original_path = output_path / "debug_original.png"
    canvas_path = output_path / "debug_canvas.png"

    cv2.imwrite(str(original_path), debug_original)
    cv2.imwrite(str(canvas_path), polygon_canvas)

    return original_path, canvas_path


def show_debug_images(debug_original, polygon_canvas):
    """Show debug images with OpenCV windows."""
    cv2.imshow("1. Debug: What did OpenCV find?", debug_original)
    cv2.imshow("2. Final Canvas (Auto-Centered)", polygon_canvas)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
