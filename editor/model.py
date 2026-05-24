import json
from pathlib import Path


DEFAULT_SEMANTIC = {
    "layer": None,
    "line": None,
    "zone_type": None,
    "label": None,
    "confidence": None,
}

DEFAULT_LAYER_Z = {
    "B1": 0.0,
    "B2": -1.0,
    "B3": -2.0,
    "B4": -3.0,
}

DEFAULT_LAYER_INDEX = {
    "B1": 0.0,
    "B2": -1.0,
    "B3": -2.0,
    "B4": -3.0,
}


def load_json(path):
    """Load JSON from disk."""
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(data, path):
    """Save JSON to disk."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    return output_path


def compact_vector_json(data, indent=0):
    """Serialize JSON while keeping numeric vectors on one line."""
    space = " " * indent
    next_space = " " * (indent + 2)
    if isinstance(data, dict):
        if not data:
            return "{}"
        items = []
        for key, value in data.items():
            items.append(f"{next_space}{json.dumps(str(key), ensure_ascii=False)}: {compact_vector_json(value, indent + 2)}")
        return "{\n" + ",\n".join(items) + "\n" + space + "}"
    if isinstance(data, list):
        if is_numeric_vector(data):
            return "[" + ", ".join(format_json_number(value) for value in data) + "]"
        if not data:
            return "[]"
        items = [f"{next_space}{compact_vector_json(value, indent + 2)}" for value in data]
        return "[\n" + ",\n".join(items) + "\n" + space + "]"
    return json.dumps(data, ensure_ascii=False)


def is_numeric_vector(value):
    """Return true for short numeric coordinate/color vectors."""
    return (
        isinstance(value, list)
        and 1 <= len(value) <= 4
        and all(isinstance(item, (int, float)) and not isinstance(item, bool) for item in value)
    )


def format_json_number(value):
    """Format a JSON number without unnecessary trailing zeros."""
    if isinstance(value, int):
        return str(value)
    formatted = f"{float(value):.6f}".rstrip("0").rstrip(".")
    return formatted if formatted not in {"", "-0"} else "0"


def save_json_compact_vectors(data, path):
    """Save JSON with vector arrays such as [x, y, z] on one line."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        file.write(compact_vector_json(data))
        file.write("\n")
    return output_path


def default_annotations():
    """Return the initial manual annotation document."""
    return {
        "polygon_layers": {},
        "polygon_z_offsets": {},
        "polygon_z_values": {},
        "hidden_polygon_ids": [],
        "manual_polygons": [],
        "manual_edits": [],
        "manual_merges": [],
        "manual_connections": [],
        "manual_walls": [],
        "manual_assets": [],
        "layer_alignment_pairs": [],
        "polygon_axis_corrections": {},
        "scale_calibration": None,
    }


def load_annotations(path):
    """Load manual annotations or return an empty document."""
    output_path = Path(path)
    if not output_path.exists():
        return default_annotations()
    annotations = load_json(output_path)
    base = default_annotations()
    base.update(annotations)
    return base

def build_polygon_lookup(polygons_path, annotations, working_polygons=None):
    """Build a polygon lookup from extracted and manual polygons."""
    polygon_data = load_json(polygons_path)
    polygons = polygon_data.get("polygons", [])
    lookup = {poly["polygon_id"]: poly for poly in polygons}
    for poly in working_polygons or []:
        if poly.get("polygon_id"):
            lookup[poly["polygon_id"]] = poly
    for poly in annotations.get("manual_polygons", []):
        lookup[poly["polygon_id"]] = poly
    return lookup


def existing_polygon_ids(annotations, working_polygons=None):
    """Return polygon ids already present in annotations or the editor working set."""
    ids = set()
    for poly in annotations.get("manual_polygons", []):
        if poly.get("polygon_id"):
            ids.add(str(poly["polygon_id"]))
    for poly in working_polygons or []:
        if poly.get("polygon_id"):
            ids.add(str(poly["polygon_id"]))
    return ids


def next_prefixed_polygon_id(prefix, annotations, working_polygons=None):
    """Return the next polygon id for a prefix without colliding with the working set."""
    ids = existing_polygon_ids(annotations, working_polygons=working_polygons)
    index = 1
    while f"{prefix}_{index:03d}" in ids:
        index += 1
    return f"{prefix}_{index:03d}"


def reserve_prefixed_polygon_ids(prefix, count, annotations, working_polygons=None):
    """Return multiple new prefixed ids without colliding with existing ids."""
    ids = existing_polygon_ids(annotations, working_polygons=working_polygons)
    output = []
    index = 1
    while len(output) < count:
        candidate = f"{prefix}_{index:03d}"
        if candidate not in ids:
            output.append(candidate)
            ids.add(candidate)
        index += 1
    return output


def next_manual_polygon_id(annotations, working_polygons=None):
    """Return the next merged polygon id."""
    return next_prefixed_polygon_id("merged", annotations, working_polygons=working_polygons)


def next_edited_polygon_id(annotations, working_polygons=None):
    """Return the next edited polygon id."""
    return next_prefixed_polygon_id("edited", annotations, working_polygons=working_polygons)


def next_added_polygon_id(annotations, working_polygons=None):
    """Return the next added polygon id."""
    return next_prefixed_polygon_id("added", annotations, working_polygons=working_polygons)


def next_wall_id(annotations):
    """Return the next manual wall id."""
    return f"wall_{len(annotations.get('manual_walls', [])) + 1:03d}"
