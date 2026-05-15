from pathlib import Path

from pipeline.main import DEFAULT_CLOSE_KERNEL, DEFAULT_MIN_AREA, DEFAULT_OPEN_KERNEL, DEFAULT_EPSILON_RATIO, run_pipeline


def parse_bool(value):
    """Parse browser JSON booleans conservatively."""
    return bool(value)


def run_pipeline_for_project(project, options):
    """Run the extraction pipeline for the active web project."""
    output_dir = Path(project["output_dir"])
    debug_dir = output_dir / "debug"
    output_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    result = run_pipeline(
        str(project["image_path"]),
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
