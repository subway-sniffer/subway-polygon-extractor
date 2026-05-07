import cv2
import numpy as np


DEFAULT_LOWER_BLUE = np.array([90, 50, 50])
DEFAULT_UPPER_BLUE = np.array([110, 255, 255])
DEFAULT_MIN_AREA = 2000
DEFAULT_EPSILON_RATIO = 0.001


def extract_polygons_by_hsv(img, lower_hsv, upper_hsv, min_area=DEFAULT_MIN_AREA, epsilon_ratio=DEFAULT_EPSILON_RATIO):
    """Create an HSV color mask and extract simplified polygons from it."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, lower_hsv, upper_hsv)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return extract_polygons_from_mask(mask, min_area=min_area, epsilon_ratio=epsilon_ratio)


def extract_polygons_from_mask(mask, min_area=DEFAULT_MIN_AREA, epsilon_ratio=DEFAULT_EPSILON_RATIO):
    """Extract contours from a mask using area filtering and approxPolyDP."""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    polygons = []
    for cnt in contours:
        if cv2.contourArea(cnt) > min_area:
            epsilon = epsilon_ratio * cv2.arcLength(cnt, True)
            polygons.append(cv2.approxPolyDP(cnt, epsilon, True))

    return polygons
