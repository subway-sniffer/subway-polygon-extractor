from pathlib import Path

import cv2
import numpy as np


DEFAULT_BRIDGE_CONTACT_RADIUS = 10
DEFAULT_BRIDGE_SEARCH_RADIUS = 40
DEFAULT_BRIDGE_SCAN_STEP = 4
DEFAULT_BRIDGE_LINE_THICKNESS = 4
DEFAULT_BRIDGE_MIN_AREA = 20


def normalize_binary_mask(mask):
    """Return a uint8 binary mask with values 0 or 255."""
    return np.where(mask > 0, 255, 0).astype(np.uint8)


def parse_bridge_angles(value):
    """Parse optional comma-separated bridge scan angles."""
    if value is None or str(value).strip() == "":
        return None
    return [float(item.strip()) for item in str(value).split(",") if item.strip()]


def combine_masks_by_ids(clusters, cluster_ids):
    """Combine cluster masks for the provided 1-based ids."""
    if not cluster_ids:
        return None

    available_ids = {cluster["id"] for cluster in clusters}
    unknown_ids = sorted(set(cluster_ids) - available_ids)
    if unknown_ids:
        raise ValueError(f"존재하지 않는 bridge cluster id입니다: {unknown_ids}")

    combined = np.zeros_like(clusters[0]["mask"], dtype=np.uint8)
    for cluster in clusters:
        if cluster["id"] in cluster_ids:
            combined = cv2.bitwise_or(combined, normalize_binary_mask(cluster["mask"]))
    return combined


def find_mask_components(mask, min_area=DEFAULT_BRIDGE_MIN_AREA):
    """Find connected components in a binary mask."""
    binary = normalize_binary_mask(mask)
    count, labels, stats, _centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
    components = []
    for label in range(1, count):
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < min_area:
            continue
        x = int(stats[label, cv2.CC_STAT_LEFT])
        y = int(stats[label, cv2.CC_STAT_TOP])
        w = int(stats[label, cv2.CC_STAT_WIDTH])
        h = int(stats[label, cv2.CC_STAT_HEIGHT])
        component_mask = np.zeros_like(binary, dtype=np.uint8)
        component_mask[labels == label] = 255
        components.append(
            {
                "component_id": len(components) + 1,
                "area": area,
                "bbox": [x, y, w, h],
                "mask": component_mask,
            }
        )
    return components


def component_candidate_angles(component_mask, explicit_angles=None):
    """Return scan angles from explicit input or component PCA direction."""
    if explicit_angles is not None:
        return explicit_angles

    ys, xs = np.where(component_mask > 0)
    if len(xs) < 2:
        return [0.0, 90.0]

    points = np.column_stack([xs, ys]).astype(np.float32)
    mean = np.mean(points, axis=0)
    centered = points - mean
    cov = np.cov(centered, rowvar=False)
    eig_values, eig_vectors = np.linalg.eigh(cov)
    axis = eig_vectors[:, int(np.argmax(eig_values))]
    base_angle = float(np.degrees(np.arctan2(axis[1], axis[0])) % 180.0)

    candidates = [
        base_angle,
        base_angle + 90.0,
        base_angle - 15.0,
        base_angle + 15.0,
        base_angle + 75.0,
        base_angle + 105.0,
    ]
    return [angle % 180.0 for angle in candidates]


def clip_bbox_with_padding(bbox, shape, padding):
    """Expand a bbox by padding and clip it to mask bounds."""
    x, y, w, h = bbox
    height, width = shape[:2]
    x0 = max(0, int(x - padding))
    y0 = max(0, int(y - padding))
    x1 = min(width, int(x + w + padding))
    y1 = min(height, int(y + h + padding))
    return x0, y0, x1, y1


def sample_mask_hit(mask, point, radius):
    """Return true when a point neighborhood intersects a binary mask."""
    x = int(round(point[0]))
    y = int(round(point[1]))
    height, width = mask.shape[:2]
    if x < 0 or y < 0 or x >= width or y >= height:
        return False

    r = max(0, int(radius))
    x0 = max(0, x - r)
    y0 = max(0, y - r)
    x1 = min(width, x + r + 1)
    y1 = min(height, y + r + 1)
    return bool(np.any(mask[y0:y1, x0:x1] > 0))


def find_hit_along_line(mask, origin, direction, start_t, end_t, radius):
    """Find the first mask hit along a parametric line segment."""
    step = 1.0 if end_t >= start_t else -1.0
    distance = abs(end_t - start_t)
    for i in range(int(distance) + 1):
        t = start_t + (i * step)
        point = origin + direction * t
        if sample_mask_hit(mask, point, radius):
            return point
    return None


def build_scanline_candidates(target_mask, component_mask, angle, search_radius, scan_step, hit_radius):
    """Build bridge connection lines for one scan angle."""
    ys, xs = np.where(component_mask > 0)
    if len(xs) == 0:
        return []

    theta = np.deg2rad(angle)
    direction = np.array([np.cos(theta), np.sin(theta)], dtype=np.float32)
    perpendicular = np.array([-np.sin(theta), np.cos(theta)], dtype=np.float32)
    coords = np.column_stack([xs, ys]).astype(np.float32)
    proj_d = coords @ direction
    proj_p = coords @ perpendicular

    min_p = float(np.min(proj_p))
    max_p = float(np.max(proj_p))
    band_radius = max(1.0, float(scan_step) / 2.0)
    lines = []

    for offset in np.arange(min_p, max_p + 0.1, max(1, scan_step)):
        band = np.abs(proj_p - offset) <= band_radius
        if not np.any(band):
            continue

        band_proj = proj_d[band]
        min_d = float(np.min(band_proj))
        max_d = float(np.max(band_proj))
        origin = perpendicular * float(offset)

        left_hit = find_hit_along_line(
            target_mask,
            origin,
            direction,
            min_d - 1.0,
            min_d - float(search_radius),
            hit_radius,
        )
        right_hit = find_hit_along_line(
            target_mask,
            origin,
            direction,
            max_d + 1.0,
            max_d + float(search_radius),
            hit_radius,
        )
        if left_hit is None or right_hit is None:
            continue

        length = float(np.linalg.norm(right_hit - left_hit))
        if length <= 1.0:
            continue
        lines.append((left_hit, right_hit, length))

    return lines


def choose_best_scanlines(target_mask, component_mask, angles, search_radius, scan_step, hit_radius):
    """Choose the scan angle that creates the strongest same-cluster connection band."""
    best_angle = None
    best_lines = []
    best_score = (-1, -1.0)
    for angle in angles:
        lines = build_scanline_candidates(
            target_mask,
            component_mask,
            angle,
            search_radius=search_radius,
            scan_step=scan_step,
            hit_radius=hit_radius,
        )
        score = (len(lines), sum(line[2] for line in lines))
        if score > best_score:
            best_score = score
            best_angle = float(angle)
            best_lines = lines
    return best_angle, best_lines


def build_component_connection_mask(
    target_mask,
    component,
    contact_radius=DEFAULT_BRIDGE_CONTACT_RADIUS,
    search_radius=DEFAULT_BRIDGE_SEARCH_RADIUS,
    scan_step=DEFAULT_BRIDGE_SCAN_STEP,
    line_thickness=DEFAULT_BRIDGE_LINE_THICKNESS,
    angles=None,
):
    """Create a connection mask across one bridge component without adding the component itself."""
    target_mask = normalize_binary_mask(target_mask)
    component_mask = normalize_binary_mask(component["mask"])
    padding = int(contact_radius + search_radius + line_thickness + scan_step + 2)
    x0, y0, x1, y1 = clip_bbox_with_padding(component["bbox"], target_mask.shape, padding)

    target_roi = target_mask[y0:y1, x0:x1]
    component_roi = component_mask[y0:y1, x0:x1]
    if not np.any(target_roi > 0) or not np.any(component_roi > 0):
        return np.zeros_like(target_mask), None

    contact_kernel_size = max(1, int(contact_radius) * 2 + 1)
    contact_kernel = np.ones((contact_kernel_size, contact_kernel_size), np.uint8)
    component_contact = cv2.dilate(component_roi, contact_kernel)
    if not np.any(cv2.bitwise_and(component_contact, target_roi) > 0):
        return np.zeros_like(target_mask), None

    scan_angles = component_candidate_angles(component_roi, explicit_angles=angles)
    best_angle, lines = choose_best_scanlines(
        target_roi,
        component_roi,
        scan_angles,
        search_radius=search_radius,
        scan_step=scan_step,
        hit_radius=max(1, int(contact_radius)),
    )
    if not lines:
        return np.zeros_like(target_mask), None

    roi_connection = np.zeros_like(target_roi, dtype=np.uint8)
    for left_hit, right_hit, _length in lines:
        pt1 = (int(round(left_hit[0])), int(round(left_hit[1])))
        pt2 = (int(round(right_hit[0])), int(round(right_hit[1])))
        cv2.line(roi_connection, pt1, pt2, 255, max(1, int(line_thickness)))

    connection_mask = np.zeros_like(target_mask, dtype=np.uint8)
    connection_mask[y0:y1, x0:x1] = roi_connection

    metadata = {
        "component_id": int(component["component_id"]),
        "component_area": int(component["area"]),
        "component_bbox": [int(value) for value in component["bbox"]],
        "scan_angle": round(float(best_angle), 2),
        "scanline_count": int(len(lines)),
        "connection_pixels": int(np.count_nonzero(connection_mask)),
    }
    return connection_mask, metadata


def apply_bridge_correction_to_mask(
    target_mask,
    bridge_mask,
    contact_radius=DEFAULT_BRIDGE_CONTACT_RADIUS,
    search_radius=DEFAULT_BRIDGE_SEARCH_RADIUS,
    scan_step=DEFAULT_BRIDGE_SCAN_STEP,
    line_thickness=DEFAULT_BRIDGE_LINE_THICKNESS,
    min_component_area=DEFAULT_BRIDGE_MIN_AREA,
    angles=None,
):
    """Connect same-cluster mask regions that are separated by bridge components."""
    target_mask = normalize_binary_mask(target_mask)
    bridge_mask = normalize_binary_mask(bridge_mask)
    components = find_mask_components(bridge_mask, min_area=min_component_area)

    combined_connection = np.zeros_like(target_mask, dtype=np.uint8)
    corrections = []
    for component in components:
        connection_mask, metadata = build_component_connection_mask(
            target_mask,
            component,
            contact_radius=contact_radius,
            search_radius=search_radius,
            scan_step=scan_step,
            line_thickness=line_thickness,
            angles=angles,
        )
        if metadata is None:
            continue
        combined_connection = cv2.bitwise_or(combined_connection, connection_mask)
        corrections.append(metadata)

    corrected_mask = cv2.bitwise_or(target_mask, combined_connection)
    return corrected_mask, combined_connection, corrections


def save_mask_bridge_debug(cluster_id, original_mask, bridge_mask, connection_mask, corrected_mask, output_dir):
    """Save before, bridge, connection, and after masks for one cluster."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_mask_before_bridge_clusters.png"), original_mask)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_bridge_cluster_mask.png"), bridge_mask)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_bridge_connection_mask.png"), connection_mask)
    cv2.imwrite(str(output_path / f"cluster_{cluster_id:02d}_mask_after_bridge_clusters.png"), corrected_mask)
