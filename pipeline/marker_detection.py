import cv2
import numpy as np


TARGET_WIDTH = 1000


def order_points(pts):
    """Order marker points as top-left, top-right, bottom-right, bottom-left."""
    pts = np.asarray(pts, dtype="float32")
    x_sorted = pts[np.argsort(pts[:, 0]), :]

    left_most = x_sorted[:2, :]
    right_most = x_sorted[2:, :]

    left_most = left_most[np.argsort(left_most[:, 1]), :]
    tl, bl = left_most

    right_most = right_most[np.argsort(right_most[:, 1]), :]
    tr, br = right_most

    return np.array([tl, tr, br, bl], dtype="float32")


def detect_red_markers(img):
    """Detect red marker centroids with HSV thresholding and compactness filtering."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_red1 = np.array([0, 100, 100])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([160, 100, 100])
    upper_red2 = np.array([179, 255, 255])

    red_mask = cv2.inRange(hsv, lower_red1, upper_red1) + cv2.inRange(hsv, lower_red2, upper_red2)
    contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    points = []
    shape_threshold = 40
    for cnt in contours:
        area = cv2.contourArea(cnt)
        perimeter = cv2.arcLength(cnt, True)
        if area > 10 and perimeter > 0:
            shape_ratio = (perimeter * perimeter) / area
            if shape_ratio < shape_threshold:
                moments = cv2.moments(cnt)
                if moments["m00"] != 0:
                    points.append(
                        [
                            int(moments["m10"] / moments["m00"]),
                            int(moments["m01"] / moments["m00"]),
                        ]
                    )

    return points


def get_perspective_matrix(points):
    """Calculate the perspective matrix and target canvas size from four markers."""
    if len(points) != 4:
        print(f"오류: 마커가 정확히 4개가 아닙니다! 찾은 점 개수: {len(points)}개")
        return None, 0, 0

    src_pts = order_points(np.array(points))
    tl, tr, br, bl = src_pts

    width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    max_width = max(int(width_a), int(width_b))

    height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    max_height = max(int(height_a), int(height_b))

    if max_width == 0:
        max_width = 1
    if max_height == 0:
        max_height = 1

    target_height = int(TARGET_WIDTH / (max_width / max_height))
    dst_pts = np.array(
        [
            [0, 0],
            [TARGET_WIDTH - 1, 0],
            [TARGET_WIDTH - 1, target_height - 1],
            [0, target_height - 1],
        ],
        dtype="float32",
    )

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    return matrix, TARGET_WIDTH, target_height
