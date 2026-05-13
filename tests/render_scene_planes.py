import argparse
import json
from pathlib import Path

import cv2
import numpy as np


def load_json(path):
    """Load a JSON document."""
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def plane_xy_points(plane):
    """Return 2D XY points from a scene plane vertex list."""
    return [[float(vertex[0]), float(vertex[1])] for vertex in plane.get("vertices", [])]


def collect_bounds(planes):
    """Collect min/max XY bounds for all plane vertices."""
    points = []
    for plane in planes:
        points.extend(plane_xy_points(plane))
    if not points:
        return 0.0, 0.0, 1.0, 1.0
    arr = np.array(points, dtype=np.float32)
    x_min, y_min = np.min(arr, axis=0)
    x_max, y_max = np.max(arr, axis=0)
    return float(x_min), float(y_min), float(x_max), float(y_max)


def project_points(points, bounds, image_size, margin):
    """Project scene XY coordinates to image pixels."""
    x_min, y_min, x_max, y_max = bounds
    width, height = image_size
    span_x = max(1e-6, x_max - x_min)
    span_y = max(1e-6, y_max - y_min)
    scale = min((width - margin * 2) / span_x, (height - margin * 2) / span_y)
    projected = []
    for x, y in points:
        px = margin + (x - x_min) * scale
        py = height - margin - (y - y_min) * scale
        projected.append([int(round(px)), int(round(py))])
    return np.array(projected, dtype=np.int32)


def draw_scene_planes(data, image_size=(1600, 1000), margin=40):
    """Render scene planes to a flat debug image."""
    planes = data.get("planes", [])
    bounds = collect_bounds(planes)
    canvas = np.full((image_size[1], image_size[0], 3), 245, dtype=np.uint8)

    for plane in planes:
        points = plane_xy_points(plane)
        if len(points) < 3:
            continue
        poly = project_points(points, bounds, image_size, margin)
        color = plane.get("color")
        if color:
            bgr = (
                int(max(0.0, min(1.0, color[2])) * 255),
                int(max(0.0, min(1.0, color[1])) * 255),
                int(max(0.0, min(1.0, color[0])) * 255),
            )
        else:
            color_rgb = plane.get("color_rgb") or [180, 180, 180]
            bgr = (int(color_rgb[2]), int(color_rgb[1]), int(color_rgb[0]))
        cv2.fillPoly(canvas, [poly], bgr)
        for hole in plane.get("holes", []):
            hole_points = [[float(vertex[0]), float(vertex[1])] for vertex in hole]
            if len(hole_points) < 3:
                continue
            hole_poly = project_points(hole_points, bounds, image_size, margin)
            cv2.fillPoly(canvas, [hole_poly], (245, 245, 245))
            cv2.polylines(canvas, [hole_poly], True, (180, 40, 40), 1, lineType=cv2.LINE_AA)
        cv2.polylines(canvas, [poly], True, (40, 40, 40), 1, lineType=cv2.LINE_AA)

        if plane.get("polygon_id"):
            cx = int(np.mean(poly[:, 0]))
            cy = int(np.mean(poly[:, 1]))
            cv2.putText(
                canvas,
                str(plane["polygon_id"]),
                (cx + 3, cy - 3),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.35,
                (20, 20, 20),
                1,
                cv2.LINE_AA,
            )

    for wall in data.get("walls", []):
        vertices = wall.get("vertices", [])
        if len(vertices) < 2:
            continue
        wall_points = [[float(vertices[0][0]), float(vertices[0][1])], [float(vertices[1][0]), float(vertices[1][1])]]
        line = project_points(wall_points, bounds, image_size, margin)
        cv2.line(canvas, tuple(line[0]), tuple(line[1]), (30, 30, 220), 3, lineType=cv2.LINE_AA)

    return canvas


def layer_name(plane):
    """Return a stable layer name for output files."""
    return str(plane.get("layer") or "unassigned")


def render_layers(data, output_dir, image_size=(1600, 1000), margin=40):
    """Render one XY debug image per scene layer."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    layers = sorted({layer_name(plane) for plane in data.get("planes", [])})
    written = []
    for layer in layers:
        layer_data = {
            "metadata": data.get("metadata", {}),
            "planes": [plane for plane in data.get("planes", []) if layer_name(plane) == layer],
            "walls": [
                wall for wall in data.get("walls", [])
                if str((wall.get("semantic") or {}).get("layer") or wall.get("layer") or "unassigned") == layer
            ],
        }
        image = draw_scene_planes(layer_data, image_size=image_size, margin=margin)
        file_path = output_path / f"scene_planes_{layer}.png"
        cv2.imwrite(str(file_path), image)
        written.append(file_path)
    return written


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Render scene_planes.json to a PNG debug image.")
    parser.add_argument("--input", required=True, help="Path to scene_planes.json.")
    parser.add_argument("--output", required=True, help="Output PNG path.")
    parser.add_argument("--layer-output-dir", help="Optional directory for one PNG per layer.")
    parser.add_argument("--width", type=int, default=1600)
    parser.add_argument("--height", type=int, default=1000)
    parser.add_argument("--margin", type=int, default=40)
    return parser.parse_args()


def main():
    """Render the scene plane file."""
    args = parse_args()
    data = load_json(args.input)
    image = draw_scene_planes(data, image_size=(args.width, args.height), margin=args.margin)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), image)
    print(f"rendered={output_path}")
    if args.layer_output_dir:
        for file_path in render_layers(data, args.layer_output_dir, image_size=(args.width, args.height), margin=args.margin):
            print(f"rendered_layer={file_path}")


if __name__ == "__main__":
    main()
