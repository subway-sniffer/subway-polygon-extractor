from pathlib import Path

from pipeline.marker_detection import build_marker_config, get_perspective_matrix, save_marker_config


def complete_parallelogram_points(points):
    """Return four marker points, deriving the fourth point from three adjacent corners."""
    if len(points) == 4:
        return points
    if len(points) != 3:
        raise ValueError("manual marker는 3개 또는 4개 point가 필요합니다.")
    point_a, point_b, point_c = points
    point_d = [
        float(point_a[0]) + float(point_c[0]) - float(point_b[0]),
        float(point_a[1]) + float(point_c[1]) - float(point_b[1]),
    ]
    return [point_a, point_b, point_c, point_d]


def save_manual_marker_config(image_path, points, output_path):
    """Save manually clicked marker points in the pipeline marker config format."""
    completed_points = complete_parallelogram_points(points)
    normalized = [[int(round(float(point[0]))), int(round(float(point[1])))] for point in completed_points]
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
