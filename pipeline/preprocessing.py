import json
from pathlib import Path

import cv2
import numpy as np


def load_json(path):
    """Load JSON data from disk."""
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def load_image(image_path):
    """Load an image from disk."""
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")
    return image


def build_icon_mask(image_shape, icon_matches, padding=4, min_score=None):
    """Build a binary mask from icon match bounding boxes."""
    height, width = image_shape[:2]
    mask = np.zeros((height, width), dtype=np.uint8)
    selected_icons = []

    for icon in icon_matches.get("icons", []):
        score = float(icon.get("score", 0))
        if min_score is not None and score < min_score:
            continue

        x, y, w, h = [int(value) for value in icon["bbox"]]
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(width, x + w + padding)
        y2 = min(height, y + h + padding)
        mask[y1:y2, x1:x2] = 255
        selected_icons.append(icon)

    return mask, selected_icons


def parse_comma_values(value):
    """Parse a comma-separated string into stripped values."""
    if value is None or str(value).strip() == "":
        return None
    return [item.strip() for item in str(value).split(",") if item.strip()]


def parse_angles(value):
    """Parse comma-separated bridge scan angles in degrees."""
    if value is None or str(value).strip() == "":
        return list(range(0, 180, 15))
    return [float(item.strip()) for item in str(value).split(",") if item.strip()]


def filter_icon_matches(icon_matches, icon_types=None, min_score=None):
    """Filter icon matches by type and score."""
    selected_types = set(parse_comma_values(icon_types) or [])
    selected_icons = []
    for icon in icon_matches.get("icons", []):
        if selected_types and icon.get("type") not in selected_types:
            continue
        if min_score is not None and float(icon.get("score", 0)) < min_score:
            continue
        selected_icons.append(icon)
    return selected_icons


def point_inside_bbox(point, bbox):
    """Return whether a point is inside [x, y, w, h]."""
    x, y = point
    bx, by, bw, bh = bbox
    return bx <= x <= bx + bw and by <= y <= by + bh


def find_mask_hit(mask, center, direction, sign, bbox, search_radius):
    """Find the nearest mask pixel from center along one ray direction."""
    height, width = mask.shape[:2]
    cx, cy = center
    for step in range(1, search_radius + 1):
        x = int(round(cx + direction[0] * sign * step))
        y = int(round(cy + direction[1] * sign * step))
        if x < 0 or x >= width or y < 0 or y >= height:
            break
        if point_inside_bbox((x, y), bbox):
            continue
        if mask[y, x] > 0:
            return (x, y), step
    return None, None


def find_best_icon_bridge(mask, icon, angles, search_radius):
    """Find the best same-mask bridge line across one icon bbox."""
    x, y, w, h = [int(value) for value in icon["bbox"]]
    center = (x + (w / 2.0), y + (h / 2.0))
    best = None

    for angle_deg in angles:
        angle = np.deg2rad(angle_deg)
        direction = (float(np.cos(angle)), float(np.sin(angle)))
        start, start_distance = find_mask_hit(mask, center, direction, -1, (x, y, w, h), search_radius)
        end, end_distance = find_mask_hit(mask, center, direction, 1, (x, y, w, h), search_radius)
        if start is None or end is None:
            continue
        score = 1.0 / max(1.0, float(start_distance + end_distance))
        candidate = {
            "icon_id": icon.get("icon_id"),
            "icon_type": icon.get("type"),
            "icon_bbox": [x, y, w, h],
            "angle": float(angle_deg),
            "start": [int(start[0]), int(start[1])],
            "end": [int(end[0]), int(end[1])],
            "start_distance": int(start_distance),
            "end_distance": int(end_distance),
            "score": score,
        }
        if best is None or candidate["score"] > best["score"]:
            best = candidate

    return best


def apply_icon_bridge_correction_to_mask(
    mask,
    icon_matches,
    icon_types=None,
    min_score=None,
    search_radius=60,
    line_thickness=8,
    angles=None,
):
    """Bridge mask gaps across matched icon boxes by connecting same-mask hits."""
    angles = angles or list(range(0, 180, 15))
    icons = filter_icon_matches(icon_matches, icon_types=icon_types, min_score=min_score)
    bridge_mask = np.zeros_like(mask, dtype=np.uint8)
    corrections = []

    for icon in icons:
        bridge = find_best_icon_bridge(mask, icon, angles, search_radius)
        if bridge is None:
            continue
        cv2.line(
            bridge_mask,
            tuple(bridge["start"]),
            tuple(bridge["end"]),
            255,
            int(line_thickness),
            cv2.LINE_AA,
        )
        corrections.append(bridge)

    corrected = cv2.bitwise_or(mask, bridge_mask)
    return corrected, bridge_mask, corrections


def dilate_mask(mask, kernel_size=5):
    """Dilate a binary mask to include antialiased icon edges."""
    if kernel_size <= 0:
        return mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.dilate(mask, kernel)


def component_bbox(component_mask, padding, image_shape):
    """Return a padded bbox for a connected mask component."""
    ys, xs = np.where(component_mask > 0)
    height, width = image_shape[:2]
    x1 = max(0, int(xs.min()) - padding)
    y1 = max(0, int(ys.min()) - padding)
    x2 = min(width, int(xs.max()) + padding + 1)
    y2 = min(height, int(ys.max()) + padding + 1)
    return x1, y1, x2, y2


def estimate_component_direction(image_roi, mask_roi):
    """Estimate dominant local structure direction in radians."""
    gray = cv2.cvtColor(image_roi, cv2.COLOR_BGR2GRAY)
    masked_gray = gray.copy()
    median_value = int(np.median(gray[mask_roi == 0])) if np.any(mask_roi == 0) else int(np.median(gray))
    masked_gray[mask_roi > 0] = median_value
    edges = cv2.Canny(cv2.GaussianBlur(masked_gray, (3, 3), 0), 50, 150)
    edges[mask_roi > 0] = 0
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=20, minLineLength=12, maxLineGap=4)

    if lines is None:
        return 0.0

    weighted_sin = 0.0
    weighted_cos = 0.0
    for line in lines[:, 0]:
        x1, y1, x2, y2 = [float(value) for value in line]
        dx = x2 - x1
        dy = y2 - y1
        length = float(np.hypot(dx, dy))
        if length <= 0:
            continue
        angle = float(np.arctan2(dy, dx))
        weighted_cos += np.cos(2 * angle) * length
        weighted_sin += np.sin(2 * angle) * length

    if weighted_cos == 0 and weighted_sin == 0:
        return 0.0
    return 0.5 * float(np.arctan2(weighted_sin, weighted_cos))


def sample_unmasked_along_direction(image_roi, mask_roi, x, y, direction, max_search):
    """Sample nearest unmasked pixels in both directions from a masked pixel."""
    height, width = mask_roi.shape[:2]
    samples = []
    for sign in (-1, 1):
        for step in range(1, max_search + 1):
            sx = int(round(x + (direction[0] * sign * step)))
            sy = int(round(y + (direction[1] * sign * step)))
            if sx < 0 or sx >= width or sy < 0 or sy >= height:
                break
            if mask_roi[sy, sx] == 0:
                samples.append((step, image_roi[sy, sx].astype(np.float32)))
                break
    return samples


def directional_fill_component(image_roi, mask_roi, fallback_roi, angle, max_search=80):
    """Fill one mask component by sampling along the dominant local direction."""
    filled = fallback_roi.copy()
    direction = np.array([np.cos(angle), np.sin(angle)], dtype=np.float32)
    ys, xs = np.where(mask_roi > 0)

    for y, x in zip(ys, xs):
        samples = sample_unmasked_along_direction(image_roi, mask_roi, x, y, direction, max_search)
        if len(samples) == 2:
            (dist_a, color_a), (dist_b, color_b) = samples
            total = dist_a + dist_b
            color = ((color_a * dist_b) + (color_b * dist_a)) / total
            filled[y, x] = np.clip(color, 0, 255).astype(np.uint8)
        elif len(samples) == 1:
            filled[y, x] = np.clip(samples[0][1], 0, 255).astype(np.uint8)

    return filled


def directional_inpaint_masked_regions(image, mask, radius=5, max_search=80, roi_padding=15):
    """Fill masked regions using local dominant direction with TELEA fallback."""
    fallback = cv2.inpaint(image, mask, radius, cv2.INPAINT_TELEA)
    output = fallback.copy()
    component_count, labels = cv2.connectedComponents((mask > 0).astype(np.uint8), connectivity=8)

    for label in range(1, component_count):
        component = np.where(labels == label, 255, 0).astype(np.uint8)
        if cv2.countNonZero(component) == 0:
            continue

        x1, y1, x2, y2 = component_bbox(component, roi_padding, image.shape)
        image_roi = image[y1:y2, x1:x2]
        fallback_roi = fallback[y1:y2, x1:x2]
        mask_roi = component[y1:y2, x1:x2]
        angle = estimate_component_direction(image_roi, mask_roi)
        output[y1:y2, x1:x2] = directional_fill_component(
            image_roi,
            mask_roi,
            fallback_roi,
            angle,
            max_search=max_search,
        )

    return output


def inpaint_masked_regions(image, mask, radius=5, method="telea", roi_padding=15):
    """Fill masked regions using the selected inpainting method."""
    if method == "directional":
        return directional_inpaint_masked_regions(image, mask, radius=radius, roi_padding=roi_padding)
    flags = cv2.INPAINT_TELEA if method == "telea" else cv2.INPAINT_NS
    return cv2.inpaint(image, mask, radius, flags)


def draw_mask_overlay(image, mask, color=(0, 0, 255), alpha=0.45):
    """Draw a transparent mask overlay on an image."""
    overlay = image.copy()
    overlay[mask > 0] = color
    return cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0)


def save_icon_inpaint_debug(image, raw_mask, inpaint_mask, inpainted, output_dir):
    """Save icon mask and inpaint debug images."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    paths = {
        "icon_mask": output_path / "icon_mask.png",
        "icon_mask_dilated": output_path / "icon_mask_dilated.png",
        "icon_mask_overlay": output_path / "icon_mask_overlay.png",
        "icon_inpainted": output_path / "icon_inpainted.png",
    }
    cv2.imwrite(str(paths["icon_mask"]), raw_mask)
    cv2.imwrite(str(paths["icon_mask_dilated"]), inpaint_mask)
    cv2.imwrite(str(paths["icon_mask_overlay"]), draw_mask_overlay(image, inpaint_mask))
    cv2.imwrite(str(paths["icon_inpainted"]), inpainted)
    return paths


def show_icon_inpaint_debug(image, mask_overlay, inpainted, wait_ms=3000):
    """Show icon inpaint debug windows for quick inspection."""
    cv2.imshow("original", image)
    cv2.imshow("icon mask overlay", mask_overlay)
    cv2.imshow("icon inpainted", inpainted)
    cv2.waitKey(wait_ms)
    cv2.destroyAllWindows()


def inpaint_icons_from_matches(
    image_path,
    icon_matches_path,
    output_dir,
    padding=4,
    dilate_kernel=5,
    radius=5,
    method="telea",
    min_score=None,
    roi_padding=15,
):
    """Create icon mask from icon matches and inpaint those regions."""
    image = load_image(image_path)
    icon_matches = load_json(icon_matches_path)
    raw_mask, selected_icons = build_icon_mask(image.shape, icon_matches, padding=padding, min_score=min_score)
    inpaint_mask = dilate_mask(raw_mask, kernel_size=dilate_kernel)
    inpainted = inpaint_masked_regions(image, inpaint_mask, radius=radius, method=method, roi_padding=roi_padding)
    debug_paths = save_icon_inpaint_debug(image, raw_mask, inpaint_mask, inpainted, output_dir)
    return {
        "image": image,
        "raw_mask": raw_mask,
        "inpaint_mask": inpaint_mask,
        "inpainted": inpainted,
        "selected_icons": selected_icons,
        "debug_paths": debug_paths,
    }
