import json
from pathlib import Path

import numpy as np


def to_python_scalar(value):
    """Convert numpy scalar values to native Python values."""
    if isinstance(value, np.generic):
        return value.item()
    return value


def to_python_list(value):
    """Convert numpy arrays and nested values into JSON-safe Python objects."""
    if isinstance(value, np.ndarray):
        return to_python_list(value.tolist())
    if isinstance(value, dict):
        return {str(key): to_python_list(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_python_list(item) for item in value]
    if isinstance(value, tuple):
        return [to_python_list(item) for item in value]
    if isinstance(value, Path):
        return str(value)
    return to_python_scalar(value)


def load_color_ranges(config_path):
    """Load HSV color ranges from a JSON config file."""
    path = Path(config_path)
    if not path.exists():
        return {}

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_color_metadata(metadata, output_path):
    """Save color extraction metadata as JSON."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        json.dump(to_python_list(metadata), file, ensure_ascii=False, indent=2)

    return path


def build_extraction_metadata(
    mode,
    color_space,
    min_area,
    epsilon_ratio,
    color_metadata_file,
    selected_color_ranges=None,
    selected_clusters=None,
    morphology=None,
    bridge_correction=None,
):
    """Build reproducibility metadata for floor polygon extraction."""
    metadata = {
        "mode": mode,
        "color_space": color_space,
        "min_area": min_area,
        "epsilon_ratio": epsilon_ratio,
        "color_metadata_file": str(color_metadata_file),
    }

    if selected_color_ranges is not None:
        metadata["selected_color_ranges"] = selected_color_ranges
    if selected_clusters is not None:
        metadata["selected_clusters"] = selected_clusters
    if morphology is not None:
        metadata["morphology"] = morphology
    if bridge_correction is not None:
        metadata["bridge_correction"] = bridge_correction

    return metadata


def save_floor_polygons_json(
    polygons,
    extraction_metadata,
    output_path,
    color_groups=None,
    source_color_groups=None,
    intermediate_polygons=None,
    image_metadata=None,
):
    """Save floor polygons, source coordinates, and extraction metadata as JSON."""
    payload = {
        "extraction": extraction_metadata,
        "polygons": polygons,
    }
    if image_metadata is not None:
        payload["image"] = image_metadata
    if color_groups is not None:
        payload["color_groups"] = color_groups
    if source_color_groups is not None:
        payload["source_color_groups"] = source_color_groups
    if intermediate_polygons is not None:
        payload["intermediate_polygons"] = intermediate_polygons
    return save_color_metadata(payload, output_path)


def export_polygons_json(polygons, extraction_metadata, output_path, color_groups=None):
    """Save polygon JSON for the 3D engine export path."""
    return save_floor_polygons_json(polygons, extraction_metadata, output_path, color_groups=color_groups)
