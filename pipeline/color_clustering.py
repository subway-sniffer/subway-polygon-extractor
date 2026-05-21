import cv2
import numpy as np


DEFAULT_OPEN_KERNEL = 3
DEFAULT_CLOSE_KERNEL = 5


def normalize_kernel_size(kernel_size):
    """Return a valid odd morphology kernel size, or 0 to skip."""
    kernel_size = int(kernel_size or 0)
    if kernel_size <= 0:
        return 0
    if kernel_size % 2 == 0:
        kernel_size += 1
    return kernel_size


def build_morphology_config(open_kernel=DEFAULT_OPEN_KERNEL, close_kernel=DEFAULT_CLOSE_KERNEL):
    """Build a normalized morphology config dictionary."""
    return {
        "open_kernel": normalize_kernel_size(open_kernel),
        "close_kernel": normalize_kernel_size(close_kernel),
    }


def apply_morphology_to_mask(mask, morphology=None):
    """Apply open and close morphology operations to a binary mask."""
    morphology = morphology or {}
    open_kernel = normalize_kernel_size(morphology.get("open_kernel", 0))
    close_kernel = normalize_kernel_size(morphology.get("close_kernel", 0))

    result = mask.copy()
    if open_kernel > 0:
        kernel = np.ones((open_kernel, open_kernel), np.uint8)
        result = cv2.morphologyEx(result, cv2.MORPH_OPEN, kernel)
    if close_kernel > 0:
        kernel = np.ones((close_kernel, close_kernel), np.uint8)
        result = cv2.morphologyEx(result, cv2.MORPH_CLOSE, kernel)
    return result


def apply_morphology_to_clusters(clusters, default_morphology=None):
    """Apply cluster-specific morphology settings to every cluster mask."""
    updated_clusters = []
    for cluster in clusters:
        morphology = cluster.get("morphology") or default_morphology or {}
        updated_cluster = dict(cluster)
        updated_cluster["morphology"] = build_morphology_config(
            morphology.get("open_kernel", 0),
            morphology.get("close_kernel", 0),
        )
        updated_cluster["mask"] = apply_morphology_to_mask(cluster["mask"], updated_cluster["morphology"])
        updated_cluster["pixel_count"] = int(np.count_nonzero(updated_cluster["mask"]))
        updated_clusters.append(updated_cluster)
    return updated_clusters


def build_clustering_valid_mask(img):
    """Create a mask that excludes white background, black text, and red markers."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    white_mask = cv2.inRange(hsv, np.array([0, 0, 245]), np.array([179, 25, 255]))
    black_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([179, 255, 55]))
    red_mask = cv2.inRange(hsv, np.array([0, 100, 100]), np.array([10, 255, 255]))
    red_mask += cv2.inRange(hsv, np.array([160, 100, 100]), np.array([179, 255, 255]))
    magenta_mask = cv2.inRange(hsv, np.array([140, 80, 80]), np.array([170, 255, 255]))

    excluded_mask = cv2.bitwise_or(white_mask, black_mask)
    excluded_mask = cv2.bitwise_or(excluded_mask, red_mask)
    excluded_mask = cv2.bitwise_or(excluded_mask, magenta_mask)

    valid_mask = cv2.bitwise_not(excluded_mask)
    valid_mask = cv2.morphologyEx(valid_mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return valid_mask


def convert_color_space(img, color_space="lab"):
    """Convert BGR image into the color space used by clustering."""
    if color_space.lower() == "lab":
        return cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    if color_space.lower() == "hsv":
        return cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    if color_space.lower() == "bgr":
        return img.copy()
    raise ValueError(f"지원하지 않는 색공간입니다: {color_space}")


def extract_color_clusters(img, k=6, color_space="lab", attempts=5, rng_seed=42):
    """Cluster valid image pixels with cv2.kmeans and return centers and masks."""
    valid_mask = build_clustering_valid_mask(img)
    cluster_img = convert_color_space(img, color_space=color_space)
    samples = cluster_img[valid_mask > 0].reshape((-1, 3)).astype(np.float32)

    if len(samples) == 0:
        raise ValueError("K-Means에 사용할 유효 픽셀이 없습니다.")
    if len(samples) < k:
        raise ValueError(f"K값({k})이 유효 픽셀 수({len(samples)})보다 큽니다.")

    cv2.setRNGSeed(rng_seed)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1.0)
    _compactness, labels, centers = cv2.kmeans(
        samples,
        k,
        None,
        criteria,
        attempts,
        cv2.KMEANS_PP_CENTERS,
    )

    labels = labels.flatten()
    valid_y, valid_x = np.where(valid_mask > 0)

    clusters = []
    for cluster_idx in range(k):
        cluster_mask = np.zeros(valid_mask.shape, dtype=np.uint8)
        selected = labels == cluster_idx
        cluster_mask[valid_y[selected], valid_x[selected]] = 255

        clusters.append(
            {
                "id": cluster_idx + 1,
                "center": centers[cluster_idx],
                "mask": cluster_mask,
                "pixel_count": int(np.count_nonzero(cluster_mask)),
            }
        )

    clusters = sorted(clusters, key=lambda cluster: cluster["pixel_count"], reverse=True)
    for cluster_id, cluster in enumerate(clusters, start=1):
        cluster["id"] = cluster_id

    return {
        "color_space": color_space.lower(),
        "valid_mask": valid_mask,
        "centers": np.array([cluster["center"] for cluster in clusters], dtype=np.float32),
        "clusters": clusters,
    }


def parse_cluster_ids(include_clusters):
    """Parse a comma-separated 1-based cluster list such as '1,3,5'."""
    if include_clusters is None or include_clusters.strip() == "":
        return None

    cluster_ids = []
    for item in include_clusters.split(","):
        item = item.strip()
        if not item:
            continue
        cluster_ids.append(int(item))
    return cluster_ids


def combine_cluster_masks(clusters, include_cluster_ids=None):
    """Combine selected 1-based cluster masks into one binary mask."""
    if not clusters:
        raise ValueError("합칠 cluster mask가 없습니다.")

    available_ids = {cluster["id"] for cluster in clusters}
    selected_ids = include_cluster_ids or sorted(available_ids)
    unknown_ids = sorted(set(selected_ids) - available_ids)
    if unknown_ids:
        raise ValueError(f"존재하지 않는 cluster id입니다: {unknown_ids}")

    combined_mask = np.zeros_like(clusters[0]["mask"], dtype=np.uint8)
    for cluster in clusters:
        if cluster["id"] in selected_ids:
            combined_mask = cv2.bitwise_or(combined_mask, cluster["mask"])

    return combined_mask


def rebuild_clusters_from_metadata(img, cluster_metadata):
    """Recreate cluster masks by assigning valid pixels to saved cluster centers."""
    color_space = cluster_metadata.get("color_space", "lab")
    metadata_clusters = cluster_metadata.get("clusters", [])
    if not metadata_clusters:
        raise ValueError("color_clusters.json에 cluster 정보가 없습니다.")

    valid_mask = build_clustering_valid_mask(img)
    cluster_img = convert_color_space(img, color_space=color_space)
    samples = cluster_img[valid_mask > 0].reshape((-1, 3)).astype(np.float32)
    if len(samples) == 0:
        raise ValueError("저장된 cluster를 적용할 유효 픽셀이 없습니다.")

    centers = np.array([cluster["center"] for cluster in metadata_clusters], dtype=np.float32)
    distances = np.linalg.norm(samples[:, None, :] - centers[None, :, :], axis=2)
    labels = np.argmin(distances, axis=1)

    valid_y, valid_x = np.where(valid_mask > 0)
    rebuilt_clusters = []
    for center_index, metadata_cluster in enumerate(metadata_clusters):
        cluster_mask = np.zeros(valid_mask.shape, dtype=np.uint8)
        selected = labels == center_index
        cluster_mask[valid_y[selected], valid_x[selected]] = 255

        rebuilt_clusters.append(
            {
                "id": int(metadata_cluster["id"]),
                "center": centers[center_index],
                "mask": cluster_mask,
                "pixel_count": int(np.count_nonzero(cluster_mask)),
                "selected": bool(metadata_cluster.get("selected", False)),
                "morphology": build_morphology_config(
                    metadata_cluster.get("morphology", {}).get("open_kernel", 0),
                    metadata_cluster.get("morphology", {}).get("close_kernel", 0),
                ),
            }
        )

    return {
        "color_space": color_space,
        "valid_mask": valid_mask,
        "centers": centers,
        "clusters": rebuilt_clusters,
    }
