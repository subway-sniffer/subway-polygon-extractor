from pathlib import Path

import cv2

from pipeline.color_clustering import (
    apply_morphology_to_clusters,
    build_morphology_config,
    extract_color_clusters,
)
from pipeline.export_json import save_color_metadata
from pipeline.icon_matching import draw_icon_matches, match_icons, save_icon_matches
from pipeline.main import DEFAULT_CLOSE_KERNEL, DEFAULT_MIN_AREA, DEFAULT_OPEN_KERNEL, DEFAULT_EPSILON_RATIO, run_pipeline
from pipeline.main import build_kmeans_color_metadata
from pipeline.marker_detection import load_marker_config
from pipeline.preprocessing import inpaint_icons_from_matches
from pipeline.visualization import save_cluster_debug_images


MARKER_BGR_COLORS = {
    "red": (0, 0, 255),
    "magenta": (255, 0, 255),
}


def parse_bool(value):
    """Parse browser JSON booleans conservatively."""
    return bool(value)


def marker_filled_image_path(project):
    """Return the staged marker-filled image path for one project."""
    return Path(project["output_dir"]) / "marker_filled.png"


def icon_filled_image_path(project):
    """Return the staged icon-filled image path for one project."""
    return Path(project["output_dir"]) / "icon_filled.png"


def image_for_icon_stage(project):
    """Return marker-filled image path when available for icon preprocessing."""
    staged_path = marker_filled_image_path(project)
    return staged_path if staged_path.exists() else Path(project["image_path"])


def image_for_color_stage(project):
    """Return the best staged image path for color clustering and polygon extraction."""
    icon_path = icon_filled_image_path(project)
    if icon_path.exists():
        return icon_path
    marker_path = marker_filled_image_path(project)
    return marker_path if marker_path.exists() else Path(project["image_path"])


def prepare_marker_image_for_project(project, options):
    """Draw saved marker points onto a copy of the active image for color extraction."""
    image_path = Path(project["image_path"])
    marker_config_path = Path(project["marker_config_path"])
    if not marker_config_path.exists():
        raise ValueError("마커 config가 없습니다. 먼저 Start Manual Marker 후 Save Marker를 실행하세요.")

    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")

    config = load_marker_config(marker_config_path)
    points = config.get("ordered_marker_points") or config.get("marker_points") or []
    if len(points) != 4:
        raise ValueError(f"마커가 4개가 아닙니다: {len(points)}")

    marker_color = options.get("marker_color") or config.get("marker_color") or "magenta"
    color = MARKER_BGR_COLORS.get(marker_color, MARKER_BGR_COLORS["magenta"])
    radius = int(options.get("marker_radius") or 10)

    staged = image.copy()
    for point in points:
        cv2.circle(staged, (int(round(point[0])), int(round(point[1]))), radius, color, -1)

    output_path = marker_filled_image_path(project)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), staged)
    return {
        "marker_image": str(output_path),
        "source_image": str(image_path),
        "marker_config": str(marker_config_path),
        "marker_color": marker_color,
        "marker_radius": radius,
        "marker_points": points,
    }


def run_kmeans_for_project(project, options):
    """Run only K-Means color clustering for the active project."""
    output_dir = Path(project["output_dir"])
    debug_dir = output_dir / "debug"
    output_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    image_path = image_for_color_stage(project)
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")

    morphology = build_morphology_config(
        int(options.get("open_kernel") or DEFAULT_OPEN_KERNEL),
        int(options.get("close_kernel") or DEFAULT_CLOSE_KERNEL),
    )
    cluster_result = extract_color_clusters(
        image,
        k=int(options.get("kmeans_k") or 6),
        color_space=options.get("color_space", "lab"),
    )
    cluster_result["clusters"] = apply_morphology_to_clusters(cluster_result["clusters"], morphology)
    cluster_result["default_morphology"] = morphology
    metadata = build_kmeans_color_metadata(cluster_result, None, morphology)
    metadata["image"] = {
        "path": str(project["image_path"]),
        "color_source": str(image_path),
        "color_source_type": "marker_filled" if image_path == marker_filled_image_path(project) else "original",
    }
    metadata_path = output_dir / "color_clusters.json"
    save_color_metadata(metadata, metadata_path)
    debug_paths = save_cluster_debug_images(image, cluster_result["clusters"], debug_dir)
    return {
        "cluster_count": len(cluster_result["clusters"]),
        "metadata_file": str(metadata_path),
        "debug_dir": str(debug_dir),
        "color_source": str(image_path),
        "cluster_debug_images": [
            {"mask": str(mask_path), "result": str(result_path)}
            for mask_path, result_path in debug_paths
        ],
    }


def detect_icons_for_project(project, options):
    """Run icon template matching for the active project."""
    output_dir = Path(project["output_dir"])
    icon_dir = output_dir / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    image_path = image_for_icon_stage(project)
    result = match_icons(
        image_path,
        options.get("template_dir") or "templates/icons",
        threshold=float(options.get("threshold") or 0.83),
        scales=None,
        use_edges=parse_bool(options.get("use_edges", True)),
        iou_threshold=float(options.get("iou_threshold") or 0.35),
        include_flipped=parse_bool(options.get("include_flipped", True)),
    )
    output_path = save_icon_matches(result, project["icon_matches_path"])
    debug_path = draw_icon_matches(image_path, result["icons"], icon_dir / "icon_matches.png")
    return {
        "source_image": str(image_path),
        "icon_matches": str(output_path),
        "debug_image": str(debug_path),
        "template_count": result.get("template_count"),
        "raw_match_count": result.get("raw_match_count"),
        "match_count": result.get("match_count"),
    }


def prepare_icon_image_for_project(project, options):
    """Fill matched icon regions and save the image used for color extraction."""
    matches_path = Path(project["icon_matches_path"])
    if not matches_path.exists():
        raise ValueError("icon_matches.json이 없습니다. 먼저 Detect Icons를 실행하세요.")
    image_path = image_for_icon_stage(project)
    output_dir = Path(project["output_dir"]) / "icon_inpainting"
    result = inpaint_icons_from_matches(
        image_path,
        matches_path,
        output_dir,
        padding=int(options.get("padding") or 0),
        dilate_kernel=int(options.get("dilate_kernel") or 5),
        radius=int(options.get("radius") or 5),
        method=options.get("method") or "directional",
        min_score=float(options["min_score"]) if options.get("min_score") else None,
        roi_padding=int(options.get("roi_padding") or 15),
    )
    output_path = icon_filled_image_path(project)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), result["inpainted"])
    return {
        "icon_filled_image": str(output_path),
        "source_image": str(image_path),
        "icon_matches": str(matches_path),
        "selected_icon_count": len(result["selected_icons"]),
        "debug_paths": {key: str(value) for key, value in result["debug_paths"].items()},
    }


def extract_polygons_for_project(project, options):
    """Run polygon extraction using selected clusters after the K-Means inspection step."""
    options = dict(options)
    options["mode"] = "kmeans"
    options["polygon_image"] = str(image_for_color_stage(project))
    return run_pipeline_for_project(project, options)


def run_pipeline_for_project(project, options):
    """Run the extraction pipeline for the active web project."""
    output_dir = Path(project["output_dir"])
    debug_dir = output_dir / "debug"
    output_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    result = run_pipeline(
        str(project["image_path"]),
        polygon_image=options.get("polygon_image"),
        mode=options.get("mode", "kmeans"),
        kmeans_k=int(options.get("kmeans_k") or 6),
        include_clusters=options.get("include_clusters") or None,
        marker_config=str(project["marker_config_path"]),
        marker_color=options.get("marker_color", "magenta"),
        refresh_markers=parse_bool(options.get("refresh_markers", False)),
        output_dir=str(output_dir),
        min_area=float(options.get("min_area") or DEFAULT_MIN_AREA),
        epsilon_ratio=float(options.get("epsilon_ratio") or DEFAULT_EPSILON_RATIO),
        open_kernel=int(options.get("open_kernel") or DEFAULT_OPEN_KERNEL),
        close_kernel=int(options.get("close_kernel") or DEFAULT_CLOSE_KERNEL),
        debug=True,
        show=False,
        debug_dir=str(debug_dir),
        bridge_clusters=options.get("bridge_clusters") or None,
        run_grouping=parse_bool(options.get("run_grouping", False)),
        target_layers=int(options["target_layers"]) if options.get("target_layers") else None,
    )
    cluster_count = len(result["cluster_result"]["clusters"]) if result.get("cluster_result") else 0
    paths = result["output_paths"]
    return {
        "mode": result["mode"],
        "polygon_count": len(result.get("intermediate_polygons") or []),
        "raw_polygon_count": len(result.get("raw_polygons") or []),
        "cluster_count": cluster_count,
        "output_dir": str(output_dir),
        "debug_dir": str(debug_dir),
        "marker_config": str(project["marker_config_path"]),
        "intermediate_polygons": str(paths.get("intermediate_polygons_file")) if paths.get("intermediate_polygons_file") else None,
        "floor_polygons": str(paths.get("floor_polygons_file")),
        "color_metadata": str(paths.get("color_metadata_file")),
        "grouping": result.get("grouping_result"),
    }
