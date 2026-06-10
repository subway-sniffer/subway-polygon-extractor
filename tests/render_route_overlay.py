import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path

import cv2
import numpy as np


def fetch_json(url, payload):
    """POST JSON and return the decoded response."""
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def read_image_from_url(url):
    """Download an image URL into an OpenCV BGR image."""
    with urllib.request.urlopen(url, timeout=30) as response:
        data = np.frombuffer(response.read(), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"이미지를 디코딩할 수 없습니다: {url}")
    return image


def read_image(path_or_url):
    """Read an image from a local path or URL."""
    if str(path_or_url).startswith(("http://", "https://")):
        return read_image_from_url(path_or_url)
    image = cv2.imread(str(path_or_url), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {path_or_url}")
    return image


def fallback_image_url(image_url, server_url):
    """Return the same image path under the tested server URL."""
    if not image_url or not str(image_url).startswith(("http://", "https://")):
        return None
    parsed = urllib.parse.urlparse(image_url)
    if not parsed.path.startswith("/stations/"):
        return None
    return f"{server_url.rstrip('/')}{parsed.path}" + (f"?{parsed.query}" if parsed.query else "")


def route_payload(args):
    """Build a route request payload from CLI arguments."""
    payload = {
        "station_id": args.station_id,
        "start": {
            "type": "platform",
            "line_id": args.line_id,
            "direction": args.direction,
            "car": args.car,
        },
        "goal": {
            "type": "exit",
            "exit_number": args.exit_number,
        },
        "route_preference": args.route_preference,
    }
    if args.version:
        payload["version"] = args.version
    if args.include_toilet:
        payload["include_toilet"] = True
        payload["toilet_gender"] = args.toilet_gender
    return payload


def draw_route_overlay(image, points, title=None):
    """Draw route points and connecting lines on an image."""
    output = image.copy()
    if len(points) < 1:
        return output
    polyline = np.array([[int(round(x)), int(round(y))] for x, y in points], dtype=np.int32)
    if len(polyline) >= 2:
        shadow = polyline.reshape((-1, 1, 2))
        cv2.polylines(output, [shadow], False, (0, 0, 0), 10, lineType=cv2.LINE_AA)
        cv2.polylines(output, [shadow], False, (0, 220, 255), 5, lineType=cv2.LINE_AA)
    for index, point in enumerate(polyline, start=1):
        color = (0, 255, 0) if index == 1 else (0, 0, 255) if index == len(polyline) else (0, 220, 255)
        cv2.circle(output, tuple(point), 10, (0, 0, 0), -1, lineType=cv2.LINE_AA)
        cv2.circle(output, tuple(point), 7, color, -1, lineType=cv2.LINE_AA)
        cv2.putText(
            output,
            str(index),
            (int(point[0]) + 10, int(point[1]) - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 0, 0),
            3,
            cv2.LINE_AA,
        )
        cv2.putText(
            output,
            str(index),
            (int(point[0]) + 10, int(point[1]) - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )
    if title:
        cv2.rectangle(output, (12, 12), (min(output.shape[1] - 12, 780), 54), (0, 0, 0), -1)
        cv2.putText(output, title, (24, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1, cv2.LINE_AA)
    return output


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Call /route and draw overlay.points on the station guide image.")
    parser.add_argument("--server-url", default="http://127.0.0.1:8080", help="Route server base URL.")
    parser.add_argument("--station-id", default="서울역")
    parser.add_argument("--version")
    parser.add_argument("--line-id", default="1호선")
    parser.add_argument("--direction", default="남영")
    parser.add_argument("--car", type=int, default=1)
    parser.add_argument("--exit-number", default="3")
    parser.add_argument("--route-preference", choices=["none", "elevator"], default="none")
    parser.add_argument("--include-toilet", action="store_true")
    parser.add_argument("--toilet-gender", choices=["any", "male", "female", "accessible"], default="any")
    parser.add_argument("--image", help="Optional local image path. Defaults to overlay.image_url from /route.")
    parser.add_argument("--output", default="../test_image_output/route_overlay_preview.png")
    parser.add_argument("--response-output", help="Optional path to save the raw /route response JSON.")
    parser.add_argument("--show", action="store_true", help="Open an OpenCV preview window.")
    return parser.parse_args()


def main():
    """Render one route overlay preview."""
    args = parse_args()
    server_url = args.server_url.rstrip("/")
    response = fetch_json(f"{server_url}/route", route_payload(args))
    overlay = response.get("overlay") or {}
    points = overlay.get("points") or []
    image_source = args.image or overlay.get("image_url")
    if not image_source:
        raise ValueError("route 응답에 overlay.image_url이 없고 --image도 지정되지 않았습니다.")
    try:
        image = read_image(image_source)
    except Exception:
        fallback_url = None if args.image else fallback_image_url(image_source, server_url)
        if not fallback_url or fallback_url == image_source:
            raise
        image_source = fallback_url
        image = read_image(image_source)
    title = f"{args.station_id} {args.line_id} {args.direction} car {args.car} -> exit {args.exit_number}"
    preview = draw_route_overlay(image, points, title=title)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), preview)
    if args.response_output:
        response_path = Path(args.response_output)
        response_path.parent.mkdir(parents=True, exist_ok=True)
        response_path.write_text(json.dumps(response, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(output_path),
                "point_count": len(points),
                "image_source": image_source,
                "missing_node_ids": overlay.get("missing_node_ids", []),
                "segments": len(response.get("segments", [])),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    if args.show:
        cv2.imshow("route overlay", preview)
        cv2.waitKey(0)
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
