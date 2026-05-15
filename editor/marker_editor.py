from pathlib import Path

from pipeline.marker_detection import build_marker_config, get_perspective_matrix, save_marker_config


def save_manual_marker_config(image_path, points, output_path):
    """Save four manually clicked marker points in the pipeline marker config format."""
    if len(points) != 4:
        raise ValueError("manual marker는 정확히 4개 point가 필요합니다.")
    normalized = [[int(round(float(point[0]))), int(round(float(point[1])))] for point in points]
    matrix, target_width, target_height = get_perspective_matrix(normalized)
    if matrix is None:
        raise ValueError("manual marker로 perspective matrix를 계산하지 못했습니다.")
    config = build_marker_config(
        str(Path(image_path).resolve()),
        normalized,
        matrix,
        target_width,
        target_height,
        marker_color="manual",
    )
    config["source"] = "manual_editor"
    save_marker_config(config, output_path)
    return config
