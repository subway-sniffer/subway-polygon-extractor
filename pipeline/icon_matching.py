import argparse
import json
from pathlib import Path

import cv2
import numpy as np


DEFAULT_SCALES = [0.6, 0.75, 0.9, 1.0, 1.15, 1.3]
DEFAULT_EXTENSIONS = {".png", ".jpg", ".jpeg"}


def load_image_gray(image_path):
    """Load an image as grayscale."""
    image = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")
    return image


def preprocess_for_matching(gray, use_edges=True):
    """Preprocess an image for template matching."""
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    if not use_edges:
        return blurred
    return cv2.Canny(blurred, 50, 150)


def build_template_record(icon_type, template_path, gray, processed, flipped=False):
    """Build one template metadata record."""
    return {
        "type": icon_type,
        "path": str(template_path),
        "name": template_path.name,
        "gray": gray,
        "processed": processed,
        "flipped": flipped,
    }


def load_icon_templates(template_dir, use_edges=True, include_flipped=True):
    """Load icon templates from templates/icons/{icon_type} folders."""
    templates = []
    root = Path(template_dir)
    if not root.exists():
        raise FileNotFoundError(f"템플릿 폴더가 없습니다: {template_dir}")

    for icon_dir in sorted(path for path in root.iterdir() if path.is_dir()):
        icon_type = icon_dir.name
        for template_path in sorted(icon_dir.iterdir()):
            if template_path.suffix.lower() not in DEFAULT_EXTENSIONS:
                continue
            gray = load_image_gray(template_path)
            processed = preprocess_for_matching(gray, use_edges=use_edges)
            templates.append(build_template_record(icon_type, template_path, gray, processed, flipped=False))
            if include_flipped:
                flipped_gray = cv2.flip(gray, 1)
                flipped_processed = preprocess_for_matching(flipped_gray, use_edges=use_edges)
                templates.append(
                    build_template_record(icon_type, template_path, flipped_gray, flipped_processed, flipped=True)
                )
    return templates


def parse_scales(value):
    """Parse comma-separated template scales."""
    if not value:
        return DEFAULT_SCALES
    return [float(item.strip()) for item in value.split(",") if item.strip()]


def normalize_threshold(value):
    """Normalize percent-like thresholds such as 75 into 0.75."""
    value = float(value)
    if value > 1:
        return value / 100.0
    return value


def resize_template(template, scale):
    """Resize a template by scale."""
    height, width = template.shape[:2]
    resized_w = max(1, int(round(width * scale)))
    resized_h = max(1, int(round(height * scale)))
    return cv2.resize(template, (resized_w, resized_h), interpolation=cv2.INTER_AREA)


def match_one_template(image_processed, template, scales, threshold):
    """Run multi-scale template matching for one template."""
    matches = []
    for scale in scales:
        resized = resize_template(template["processed"], scale)
        th, tw = resized.shape[:2]
        ih, iw = image_processed.shape[:2]
        if th > ih or tw > iw or th < 4 or tw < 4:
            continue

        result = cv2.matchTemplate(image_processed, resized, cv2.TM_CCOEFF_NORMED)
        locations = np.where(result >= threshold)
        for y, x in zip(locations[0], locations[1]):
            score = float(result[y, x])
            matches.append(
                {
                    "type": template["type"],
                    "template": template["name"],
                    "template_path": template["path"],
                    "flipped": bool(template.get("flipped", False)),
                    "bbox": [int(x), int(y), int(tw), int(th)],
                    "center": [int(x + tw / 2), int(y + th / 2)],
                    "score": score,
                    "scale": float(scale),
                }
            )
    return matches


def bbox_iou(box_a, box_b):
    """Calculate IoU for [x, y, w, h] boxes."""
    ax, ay, aw, ah = box_a
    bx, by, bw, bh = box_b
    ax2, ay2 = ax + aw, ay + ah
    bx2, by2 = bx + bw, by + bh

    ix1 = max(ax, bx)
    iy1 = max(ay, by)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    inter_w = max(0, ix2 - ix1)
    inter_h = max(0, iy2 - iy1)
    intersection = inter_w * inter_h
    union = (aw * ah) + (bw * bh) - intersection
    return 0.0 if union <= 0 else intersection / union


def non_max_suppression(matches, iou_threshold=0.35):
    """Suppress duplicate overlapping template matches."""
    kept = []
    for match in sorted(matches, key=lambda item: item["score"], reverse=True):
        duplicate = False
        for selected in kept:
            if bbox_iou(match["bbox"], selected["bbox"]) >= iou_threshold:
                duplicate = True
                break
        if not duplicate:
            kept.append(match)
    return kept


def assign_icon_ids(matches):
    """Assign stable icon IDs to matches."""
    sorted_matches = sorted(matches, key=lambda item: (item["type"], item["bbox"][1], item["bbox"][0]))
    for index, match in enumerate(sorted_matches, start=1):
        match["icon_id"] = f"icon_{index:03d}"
    return sorted_matches


def match_icons(
    image_path,
    template_dir,
    threshold=0.72,
    scales=None,
    use_edges=True,
    iou_threshold=0.35,
    include_flipped=True,
):
    """Find icon template matches in an image."""
    gray = load_image_gray(image_path)
    image_processed = preprocess_for_matching(gray, use_edges=use_edges)
    templates = load_icon_templates(template_dir, use_edges=use_edges, include_flipped=include_flipped)
    scales = scales or DEFAULT_SCALES

    raw_matches = []
    for template in templates:
        raw_matches.extend(match_one_template(image_processed, template, scales, threshold))

    matches = non_max_suppression(raw_matches, iou_threshold=iou_threshold)
    return {
        "source_image": str(image_path),
        "template_dir": str(template_dir),
        "method": "canny_match_template" if use_edges else "gray_match_template",
        "threshold": threshold,
        "scales": scales,
        "include_flipped": include_flipped,
        "raw_match_count": len(raw_matches),
        "match_count": len(matches),
        "icons": assign_icon_ids(matches),
    }


def save_icon_matches(data, output_path):
    """Save icon matches JSON."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    return output_path


def draw_icon_matches(image_path, matches, output_path):
    """Draw icon match bounding boxes."""
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    palette = [
        (0, 255, 255),
        (255, 0, 255),
        (0, 180, 255),
        (255, 120, 0),
        (80, 255, 80),
        (255, 80, 160),
    ]
    type_to_color = {}
    for match in matches:
        icon_type = match["type"]
        if icon_type not in type_to_color:
            type_to_color[icon_type] = palette[len(type_to_color) % len(palette)]
        color = type_to_color[icon_type]
        x, y, w, h = match["bbox"]
        cv2.rectangle(image, (x, y), (x + w, y + h), color, 2)
        flip_mark = " F" if match.get("flipped") else ""
        label = f"{match['type']}{flip_mark} {match['score']:.2f}"
        cv2.putText(image, label, (x, max(15, y - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

    cv2.imwrite(str(output_path), image)
    return output_path


def parse_args():
    """Parse command-line options."""
    parser = argparse.ArgumentParser(description="Detect small map icons with template matching.")
    parser.add_argument("--image", default="test1.png")
    parser.add_argument("--template-dir", default="templates/icons")
    parser.add_argument("--output", default="../test_image_output/test1/icons/icon_matches.json")
    parser.add_argument("--debug-image", default="../test_image_output/test1/icons/icon_matches.png")
    parser.add_argument("--threshold", type=float, default=0.83)
    parser.add_argument("--scales", default="0.6,0.75,0.9,1.0,1.15,1.3")
    parser.add_argument("--iou-threshold", type=float, default=0.35)
    parser.add_argument("--use-edges", action="store_true")
    parser.add_argument("--no-flipped", action="store_true", help="Disable horizontally flipped template matching.")
    return parser.parse_args()


def main():
    """Run icon template matching."""
    args = parse_args()
    result = match_icons(
        args.image,
        args.template_dir,
        threshold=normalize_threshold(args.threshold),
        scales=parse_scales(args.scales),
        use_edges=args.use_edges,
        iou_threshold=args.iou_threshold,
        include_flipped=not args.no_flipped,
    )
    output_path = save_icon_matches(result, args.output)
    debug_path = draw_icon_matches(args.image, result["icons"], args.debug_image)
    print(
        "templates="
        f"{len(load_icon_templates(args.template_dir, use_edges=args.use_edges, include_flipped=not args.no_flipped))}"
    )
    print(f"raw_matches={result['raw_match_count']}, matches={result['match_count']}")
    print(f"output={output_path}")
    print(f"debug_image={debug_path}")


if __name__ == "__main__":
    main()
