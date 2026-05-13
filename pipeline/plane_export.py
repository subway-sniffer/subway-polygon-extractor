import argparse
import json
from pathlib import Path

try:
    from pipeline.export_json import save_color_metadata
except ModuleNotFoundError:
    from export_json import save_color_metadata


def load_json(path):
    """Load JSON data from disk."""
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def parse_layer_z(value):
    """Parse layer z mapping such as 'B1=1,B2=0,B3=-1'."""
    mapping = {}
    if not value:
        return mapping
    for item in value.split(","):
        if not item.strip():
            continue
        key, z_value = item.split("=", 1)
        mapping[key.strip()] = float(z_value.strip())
    return mapping


def polygon_layer(poly, annotations=None):
    """Return a polygon layer from annotations or embedded semantic fields."""
    annotations = annotations or {}
    layers = annotations.get("polygon_layers", {})
    polygon_id = poly.get("polygon_id")
    if polygon_id in layers:
        return layers[polygon_id]
    semantic = poly.get("semantic") or {}
    return semantic.get("layer")


def polygon_name(poly, layer=None):
    """Build a plane name for one polygon."""
    polygon_id = poly.get("polygon_id", "polygon")
    if layer:
        return f"{layer}_{polygon_id}"
    return polygon_id


def points_to_vertices(points, z_value=0.0, scale=1.0, invert_y=False):
    """Convert 2D polygon points to [x, y, z] plane vertices."""
    vertices = []
    for x, y in points:
        out_y = -float(y) if invert_y else float(y)
        vertices.append([float(x) * scale, out_y * scale, float(z_value)])
    return vertices


def color_rgba(color_rgb, alpha=1.0):
    """Convert 0-255 RGB into normalized RGBA."""
    rgb = color_rgb or [180, 180, 180]
    return [float(rgb[0]) / 255.0, float(rgb[1]) / 255.0, float(rgb[2]) / 255.0, float(alpha)]


def apply_manual_annotations(polygons, annotations=None):
    """Apply hidden original polygons and append manually edited polygons."""
    annotations = annotations or {}
    hidden_ids = set(annotations.get("hidden_polygon_ids", []))
    manual_polygons = annotations.get("manual_polygons", [])
    output = [poly for poly in polygons if poly.get("polygon_id") not in hidden_ids]
    output.extend(manual_polygons)
    return output


def build_planes(polygons, coordinate_key="points_transformed", scale=1.0, default_z=0.0, layer_z=None, annotations=None, invert_y=False):
    """Build plane1.json-style plane records from polygon records."""
    layer_z = layer_z or {}
    planes = []
    for poly in polygons:
        points = poly.get(coordinate_key)
        if not points:
            continue
        layer = polygon_layer(poly, annotations=annotations)
        z_value = layer_z.get(layer, default_z)
        planes.append(
            {
                "name": polygon_name(poly, layer=layer),
                "polygon_id": poly.get("polygon_id"),
                "layer": layer,
                "color_rgb": poly.get("color_rgb"),
                "color": color_rgba(poly.get("color_rgb")),
                "vertices": points_to_vertices(points, z_value=z_value, scale=scale, invert_y=invert_y),
            }
        )
    return planes


def export_planes(input_path, output_path, coordinate_key="points_transformed", scale=1.0, default_z=0.0, layer_z=None, annotations_path=None, invert_y=False):
    """Export intermediate polygon records to examples/plane1.json-compatible JSON."""
    data = load_json(input_path)
    annotations = load_json(annotations_path) if annotations_path else {}
    polygons = data.get("polygons", data if isinstance(data, list) else [])
    polygons = apply_manual_annotations(polygons, annotations)
    payload = {
        "planes": build_planes(
            polygons,
            coordinate_key=coordinate_key,
            scale=scale,
            default_z=default_z,
            layer_z=layer_z,
            annotations=annotations,
            invert_y=invert_y,
        )
    }
    return save_color_metadata(payload, output_path)


def parse_args():
    """Parse plane export command options."""
    parser = argparse.ArgumentParser(description="Export polygon records to plane1.json-style planes.")
    parser.add_argument("--input", default="../test_image_output/output/intermediate_polygons.json")
    parser.add_argument("--output", default="../test_image_output/output/scene_planes.json")
    parser.add_argument("--coordinate-key", choices=["points_source", "points_transformed"], default="points_transformed")
    parser.add_argument("--scale", type=float, default=0.01)
    parser.add_argument("--default-z", type=float, default=0.0)
    parser.add_argument("--layer-z", help="Layer z mapping, for example 'B1=1,B2=0,B3=-1'.")
    parser.add_argument("--annotations", help="Optional manual_annotations.json with polygon_layers.")
    parser.add_argument("--invert-y", action="store_true")
    return parser.parse_args()


def main():
    """Run the plane exporter."""
    args = parse_args()
    output_path = export_planes(
        args.input,
        args.output,
        coordinate_key=args.coordinate_key,
        scale=args.scale,
        default_z=args.default_z,
        layer_z=parse_layer_z(args.layer_z),
        annotations_path=args.annotations,
        invert_y=args.invert_y,
    )
    print(f"planes={output_path}")


if __name__ == "__main__":
    main()
