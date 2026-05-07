import cv2
import numpy as np


def transform_polygons(polygons, matrix):
    """Apply perspectiveTransform to polygon vertices only."""
    transformed = []
    for poly in polygons:
        poly_float = np.array(poly, dtype=np.float32)
        transformed.append(cv2.perspectiveTransform(poly_float, matrix))
    return transformed


def auto_center_polygons(polygons, margin=50):
    """Shift transformed polygons into a positive coordinate canvas."""
    if not polygons:
        return [], 1000, 1000

    all_points = np.vstack(polygons)
    x_min, y_min = np.min(all_points, axis=0).flatten()
    x_max, y_max = np.max(all_points, axis=0).flatten()

    shift_x = -x_min + margin
    shift_y = -y_min + margin

    shifted_polygons = []
    for poly in polygons:
        shifted_poly = poly + [shift_x, shift_y]
        shifted_polygons.append(np.int32(np.round(shifted_poly)))

    canvas_w = int(x_max - x_min + (margin * 2))
    canvas_h = int(y_max - y_min + (margin * 2))

    if canvas_w < 100 or canvas_h < 100:
        print("경고: 계산된 캔버스가 너무 작습니다.")
        canvas_w, canvas_h = 1000, 1000

    return shifted_polygons, canvas_w, canvas_h
