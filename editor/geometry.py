import cv2
import numpy as np


def normalize_points(points):
    """Normalize a point list into integer OpenCV coordinates."""
    return np.array(points, dtype=np.float32).reshape((-1, 2))


def polygon_metrics(points):
    """Calculate area, bbox, and centroid for a polygon."""
    contour = normalize_points(points)
    x, y, w, h = cv2.boundingRect(contour)
    moments = cv2.moments(contour)
    if moments["m00"] != 0:
        centroid = [float(moments["m10"] / moments["m00"]), float(moments["m01"] / moments["m00"])]
    else:
        centroid = [float(np.mean(contour[:, 0])), float(np.mean(contour[:, 1]))]
    return {
        "area_source": float(abs(cv2.contourArea(contour))),
        "bbox_source": [int(x), int(y), int(w), int(h)],
        "centroid_source": centroid,
    }


def transformed_polygon_metrics(points):
    """Calculate transformed-space metrics for a polygon."""
    metrics = polygon_metrics(points)
    return {
        "area_transformed": metrics["area_source"],
        "bbox_transformed": metrics["bbox_source"],
        "centroid_transformed": metrics["centroid_source"],
    }


def nearest_vertex_index(points, clicked_point):
    """Return the nearest polygon vertex index to a clicked point."""
    vertices = normalize_points(points)
    clicked = np.array(clicked_point, dtype=np.float32)
    distances = np.linalg.norm(vertices - clicked, axis=1)
    return int(np.argmin(distances))


def cyclic_path(points, start_index, end_index):
    """Return the inclusive forward path around a closed polygon."""
    normalized = normalize_points(points).astype(float).tolist()
    if start_index <= end_index:
        return normalized[start_index:end_index + 1]
    return normalized[start_index:] + normalized[:end_index + 1]


def path_length(points):
    """Return cumulative segment length for a point path."""
    if len(points) < 2:
        return 0.0
    arr = np.array(points, dtype=np.float32)
    return float(np.sum(np.linalg.norm(arr[1:] - arr[:-1], axis=1)))


def point_segment_distance(point, seg_a, seg_b):
    """Return distance from a point to a segment."""
    p = np.array(point, dtype=np.float32)
    a = np.array(seg_a, dtype=np.float32)
    b = np.array(seg_b, dtype=np.float32)
    ab = b - a
    denom = float(np.dot(ab, ab))
    if denom == 0:
        return float(np.linalg.norm(p - a))
    t = max(0.0, min(1.0, float(np.dot(p - a, ab) / denom)))
    projection = a + (ab * t)
    return float(np.linalg.norm(p - projection))


def path_contact_score(path, reference_start, reference_end):
    """Score how strongly a path faces the opposite selected edge."""
    if not path:
        return float("inf")
    distances = [point_segment_distance(point, reference_start, reference_end) for point in path]
    # Use the near side average so a long outer path with one close endpoint is not mistaken as the contact side.
    sample_count = max(1, min(8, len(distances)))
    return float(np.mean(sorted(distances)[:sample_count]))


def choose_contact_and_keep_paths(points, start_index, end_index, reference_start, reference_end):
    """Choose the path closer to the opposite selected edge as the removed contact side."""
    forward = cyclic_path(points, start_index, end_index)
    backward = cyclic_path(points, end_index, start_index)
    forward_score = path_contact_score(forward, reference_start, reference_end)
    backward_score = path_contact_score(backward, reference_start, reference_end)
    if forward_score <= backward_score:
        return backward, {
            "removed_path": "forward_start_to_end",
            "removed_score": forward_score,
            "kept_path": "backward_end_to_start",
            "kept_score": backward_score,
            "removed_vertex_count": len(forward),
            "kept_vertex_count": len(backward),
        }
    return forward, {
        "removed_path": "backward_end_to_start",
        "removed_score": backward_score,
        "kept_path": "forward_start_to_end",
        "kept_score": forward_score,
        "removed_vertex_count": len(backward),
        "kept_vertex_count": len(forward),
    }


def remove_consecutive_duplicates(points):
    """Remove duplicate neighboring points from a polygon path."""
    cleaned = []
    for point in points:
        if cleaned and np.allclose(cleaned[-1], point):
            continue
        cleaned.append([float(point[0]), float(point[1])])
    if len(cleaned) > 1 and np.allclose(cleaned[0], cleaned[-1]):
        cleaned.pop()
    return cleaned


def keep_path_from_remove_choice(points, start_index, end_index, remove_path):
    """Return the path to keep after removing the selected forward/backward path."""
    forward = cyclic_path(points, start_index, end_index)
    backward = cyclic_path(points, end_index, start_index)
    if remove_path == "forward":
        return backward, {
            "removed_path": "forward_start_to_end",
            "removed_vertex_count": len(forward),
            "kept_path": "backward_end_to_start",
            "kept_vertex_count": len(backward),
        }
    if remove_path == "backward":
        return forward, {
            "removed_path": "backward_end_to_start",
            "removed_vertex_count": len(backward),
            "kept_path": "forward_start_to_end",
            "kept_vertex_count": len(forward),
        }
    raise ValueError("remove_path는 forward 또는 backward여야 합니다.")


def build_straightened_polygon(poly, vertex_indices, remove_path):
    """Straighten one polygon by removing the selected path between two vertices."""
    if len(vertex_indices) != 2:
        raise ValueError("straighten에는 vertex index 2개가 필요합니다.")
    start_index, end_index = [int(value) for value in vertex_indices]
    if start_index == end_index:
        raise ValueError("서로 다른 vertex 2개를 선택해야 합니다.")

    kept_path, path_info = keep_path_from_remove_choice(
        poly["points_source"],
        start_index,
        end_index,
        remove_path,
    )
    points = remove_consecutive_duplicates(kept_path)
    if len(points) < 3:
        raise ValueError("straighten 결과 polygon의 점이 부족합니다.")

    vertices = normalize_points(poly["points_source"])
    return points, {
        "start_vertex_index": start_index,
        "end_vertex_index": end_index,
        "start_vertex": vertices[start_index].astype(float).tolist(),
        "end_vertex": vertices[end_index].astype(float).tolist(),
        "removed_path": path_info,
    }


def validate_polygon_holes(points, holes):
    """Validate that holes stay inside the outer polygon and have usable area."""
    outer = normalize_points(points)
    if abs(cv2.contourArea(outer)) <= 1.0:
        raise ValueError("polygon 면적이 너무 작습니다.")
    for hole_index, hole in enumerate(holes):
        hole_arr = normalize_points(hole)
        if len(hole_arr) < 3:
            raise ValueError(f"hole {hole_index}의 점이 부족합니다.")
        if abs(cv2.contourArea(hole_arr)) <= 1.0:
            raise ValueError(f"hole {hole_index}의 면적이 너무 작습니다.")
        for point in hole_arr:
            if cv2.pointPolygonTest(outer, (float(point[0]), float(point[1])), False) < 0:
                raise ValueError(f"hole {hole_index}가 외곽 polygon 밖으로 벗어났습니다.")


def build_moved_vertex_polygon(poly, vertex_index, new_point, hole_index=None):
    """Move one vertex in a polygon and return the edited point list."""
    points = normalize_points(poly["points_source"]).astype(float).tolist()
    vertex_index = int(vertex_index)
    holes = [
        remove_consecutive_duplicates(normalize_points(item).astype(float).tolist())
        for item in poly.get("holes_source", [])
        if len(item) >= 3
    ]
    moved_point = [float(new_point[0]), float(new_point[1])]

    if hole_index is None:
        if vertex_index < 0 or vertex_index >= len(points):
            raise ValueError("vertex_index가 polygon 범위를 벗어났습니다.")
        old_point = points[vertex_index]
        points[vertex_index] = moved_point
        target = "outer"
    else:
        hole_index = int(hole_index)
        if hole_index < 0 or hole_index >= len(holes):
            raise ValueError("hole_index가 polygon hole 범위를 벗어났습니다.")
        if vertex_index < 0 or vertex_index >= len(holes[hole_index]):
            raise ValueError("vertex_index가 hole 범위를 벗어났습니다.")
        old_point = holes[hole_index][vertex_index]
        holes[hole_index][vertex_index] = moved_point
        holes[hole_index] = remove_consecutive_duplicates(holes[hole_index])
        if len(holes[hole_index]) < 3:
            raise ValueError("move 결과 hole의 점이 부족합니다.")
        target = "hole"

    points = remove_consecutive_duplicates(points)
    if len(points) < 3:
        raise ValueError("move 결과 polygon의 점이 부족합니다.")
    validate_polygon_holes(points, holes)
    return points, holes, {
        "target": target,
        "hole_index": hole_index,
        "vertex_index": vertex_index,
        "from": old_point,
        "to": moved_point,
    }


def build_inserted_vertex_polygon(poly, insert_after_index, point):
    """Insert one vertex after an existing polygon vertex."""
    points = normalize_points(poly["points_source"]).astype(float).tolist()
    insert_after_index = int(insert_after_index)
    if insert_after_index < 0 or insert_after_index >= len(points):
        raise ValueError("insert_after_index가 polygon 범위를 벗어났습니다.")
    inserted_point = [float(point[0]), float(point[1])]
    edited = points[:insert_after_index + 1] + [inserted_point] + points[insert_after_index + 1:]
    edited = remove_consecutive_duplicates(edited)
    if len(edited) < 3:
        raise ValueError("insert 결과 polygon의 점이 부족합니다.")
    if abs(cv2.contourArea(np.array(edited, dtype=np.float32))) <= 1.0:
        raise ValueError("insert 결과 polygon 면적이 너무 작습니다.")
    return edited, {
        "insert_after_index": insert_after_index,
        "inserted_vertex_index": insert_after_index + 1,
        "point": inserted_point,
    }


def build_simple_keep_vertices_polygon(poly, kept_vertex_indices):
    """Create a simplified polygon from selected vertices in original order."""
    points = normalize_points(poly["points_source"]).astype(float).tolist()
    indices = sorted({int(value) for value in kept_vertex_indices})
    if len(indices) < 3:
        raise ValueError("Simple Keep에는 최소 3개의 vertex가 필요합니다.")
    if indices[0] < 0 or indices[-1] >= len(points):
        raise ValueError("kept_vertex_indices가 polygon 범위를 벗어났습니다.")

    kept_points = remove_consecutive_duplicates([points[index] for index in indices])
    if len(kept_points) < 3:
        raise ValueError("Simple Keep 결과 polygon의 점이 부족합니다.")
    if abs(cv2.contourArea(np.array(kept_points, dtype=np.float32))) <= 1.0:
        raise ValueError("Simple Keep 결과 polygon 면적이 너무 작습니다.")

    return kept_points, {
        "kept_vertex_indices": indices,
        "removed_vertex_indices": [index for index in range(len(points)) if index not in indices],
        "source_vertex_count": len(points),
        "kept_vertex_count": len(kept_points),
    }


def build_added_polygon(points):
    """Create a new polygon from manually clicked source points."""
    normalized = remove_consecutive_duplicates(normalize_points(points).astype(float).tolist())
    if len(normalized) < 3:
        raise ValueError("Add Polygon에는 최소 3개의 point가 필요합니다.")
    if abs(cv2.contourArea(np.array(normalized, dtype=np.float32))) <= 1.0:
        raise ValueError("Add Polygon 결과 polygon 면적이 너무 작습니다.")
    return normalized


def build_cut_hole_polygon(poly, hole_points):
    """Create an edited polygon with one additional interior hole."""
    outer_points = normalize_points(poly["points_source"]).astype(float).tolist()
    hole = build_added_polygon(hole_points)
    existing_holes = [
        remove_consecutive_duplicates(normalize_points(item).astype(float).tolist())
        for item in poly.get("holes_source", [])
        if len(item) >= 3
    ]
    return outer_points, existing_holes + [hole], {
        "hole_index": len(existing_holes),
        "hole_vertex_count": len(hole),
    }


def line_segment_intersection(line_a, line_b, seg_a, seg_b, eps=1e-6):
    """Return intersection between an infinite line and a segment."""
    p = np.array(line_a, dtype=np.float64)
    r = np.array(line_b, dtype=np.float64) - p
    q = np.array(seg_a, dtype=np.float64)
    s = np.array(seg_b, dtype=np.float64) - q
    denom = float(r[0] * s[1] - r[1] * s[0])
    if abs(denom) <= eps:
        return None
    qmp = q - p
    t = float((qmp[0] * s[1] - qmp[1] * s[0]) / denom)
    u = float((qmp[0] * r[1] - qmp[1] * r[0]) / denom)
    if u < -eps or u > 1.0 + eps:
        return None
    point = p + t * r
    return {
        "point": [float(point[0]), float(point[1])],
        "line_t": t,
        "edge_u": max(0.0, min(1.0, u)),
    }


def unique_intersections(intersections, eps=1e-4):
    """Deduplicate line-boundary intersections."""
    output = []
    for item in sorted(intersections, key=lambda value: value["line_t"]):
        point = np.array(item["point"], dtype=np.float64)
        if any(np.linalg.norm(point - np.array(existing["point"], dtype=np.float64)) <= eps for existing in output):
            continue
        output.append(item)
    return output


def cyclic_augmented_path(points, start_index, end_index):
    """Return a cyclic path on an augmented polygon vertex list."""
    if start_index <= end_index:
        return points[start_index:end_index + 1]
    return points[start_index:] + points[:end_index + 1]


def build_split_polygons(poly, split_points):
    """Split a polygon into two polygons using a user-drawn line segment."""
    if len(split_points) != 2:
        raise ValueError("Split Polygon에는 선분 점 2개가 필요합니다.")
    if poly.get("holes_source"):
        raise ValueError("hole이 있는 polygon split은 아직 지원하지 않습니다.")

    points = normalize_points(poly["points_source"]).astype(float).tolist()
    if len(points) < 3:
        raise ValueError("split 대상 polygon의 점이 부족합니다.")

    line_a = [float(split_points[0][0]), float(split_points[0][1])]
    line_b = [float(split_points[1][0]), float(split_points[1][1])]
    if np.linalg.norm(np.array(line_b) - np.array(line_a)) <= 1e-6:
        raise ValueError("서로 다른 두 점으로 split 선분을 그려야 합니다.")

    intersections = []
    for index, edge_start in enumerate(points):
        edge_end = points[(index + 1) % len(points)]
        hit = line_segment_intersection(line_a, line_b, edge_start, edge_end)
        if not hit:
            continue
        hit["edge_index"] = index
        intersections.append(hit)

    intersections = unique_intersections(intersections)
    if len(intersections) < 2:
        raise ValueError("split 선분이 polygon 외곽과 두 번 이상 만나야 합니다.")
    if len(intersections) > 2:
        raise ValueError("split 선분이 polygon을 여러 번 가로지릅니다. 더 단순한 선으로 나눠주세요.")

    hit_by_edge = {}
    for item in intersections:
        hit_by_edge.setdefault(item["edge_index"], []).append(item)

    augmented = []
    split_indices = []
    for index, point in enumerate(points):
        augmented.append(point)
        edge_hits = sorted(hit_by_edge.get(index, []), key=lambda item: item["edge_u"])
        for hit in edge_hits:
            if np.linalg.norm(np.array(augmented[-1]) - np.array(hit["point"])) <= 1e-4:
                split_indices.append(len(augmented) - 1)
                continue
            augmented.append(hit["point"])
            split_indices.append(len(augmented) - 1)

    if len(split_indices) != 2 or split_indices[0] == split_indices[1]:
        raise ValueError("split 교차점을 안정적으로 계산하지 못했습니다.")

    first, second = split_indices
    candidate_a = remove_consecutive_duplicates(cyclic_augmented_path(augmented, first, second))
    candidate_b = remove_consecutive_duplicates(cyclic_augmented_path(augmented, second, first))
    if len(candidate_a) < 3 or len(candidate_b) < 3:
        raise ValueError("split 결과 polygon의 점이 부족합니다.")

    area_a = abs(cv2.contourArea(np.array(candidate_a, dtype=np.float32)))
    area_b = abs(cv2.contourArea(np.array(candidate_b, dtype=np.float32)))
    if area_a <= 1.0 or area_b <= 1.0:
        raise ValueError("split 결과 polygon 면적이 너무 작습니다.")

    return [candidate_a, candidate_b], {
        "method": "line_split",
        "split_points_source": [line_a, line_b],
        "boundary_intersections": [intersections[0]["point"], intersections[1]["point"]],
        "source_vertex_count": len(points),
        "result_vertex_counts": [len(candidate_a), len(candidate_b)],
        "result_areas": [float(area_a), float(area_b)],
    }


def build_split_polygons_by_vertices(poly, vertex_indices):
    """Split one polygon into two polygons using two existing vertices."""
    if len(vertex_indices) != 2:
        raise ValueError("vertex split에는 vertex index 2개가 필요합니다.")
    if poly.get("holes_source"):
        raise ValueError("hole이 있는 polygon split은 아직 지원하지 않습니다.")

    points = normalize_points(poly["points_source"]).astype(float).tolist()
    if len(points) < 4:
        raise ValueError("split 대상 polygon은 최소 4개의 vertex가 필요합니다.")
    start_index, end_index = [int(value) for value in vertex_indices]
    if start_index == end_index:
        raise ValueError("서로 다른 vertex 2개를 선택해야 합니다.")
    if start_index < 0 or end_index < 0 or start_index >= len(points) or end_index >= len(points):
        raise ValueError("vertex index가 polygon 범위를 벗어났습니다.")

    candidate_a = remove_consecutive_duplicates(cyclic_path(points, start_index, end_index))
    candidate_b = remove_consecutive_duplicates(cyclic_path(points, end_index, start_index))
    if len(candidate_a) < 3 or len(candidate_b) < 3:
        raise ValueError("선택한 두 vertex가 너무 가까워 split 결과 polygon의 점이 부족합니다.")

    area_a = abs(cv2.contourArea(np.array(candidate_a, dtype=np.float32)))
    area_b = abs(cv2.contourArea(np.array(candidate_b, dtype=np.float32)))
    if area_a <= 1.0 or area_b <= 1.0:
        raise ValueError("split 결과 polygon 면적이 너무 작습니다.")

    return [candidate_a, candidate_b], {
        "method": "existing_vertex_split",
        "vertex_indices": [start_index, end_index],
        "split_vertices": [points[start_index], points[end_index]],
        "source_vertex_count": len(points),
        "result_vertex_counts": [len(candidate_a), len(candidate_b)],
        "result_areas": [float(area_a), float(area_b)],
    }


def directed_path(points, start_index, end_index, direction="forward"):
    """Return the selected cyclic path in the requested direction."""
    if direction == "forward":
        return cyclic_path(points, start_index, end_index)
    if direction == "backward":
        return cyclic_path(points, end_index, start_index)
    raise ValueError("range direction은 forward 또는 backward여야 합니다.")


def replace_directed_edge_path(points, start_index, end_index, direction, replacement_path):
    """Replace the selected directed path between two vertices with another point path."""
    if start_index == end_index:
        raise ValueError("서로 다른 vertex 2개를 선택해야 합니다.")
    selected_path = directed_path(points, start_index, end_index, direction)
    outside_path = directed_path(points, end_index, start_index, direction)
    replacement = normalize_points(replacement_path).astype(float).tolist()
    if len(replacement) < 2:
        raise ValueError("replacement path는 최소 2개의 점이 필요합니다.")
    edited = replacement + list(reversed(outside_path))[1:-1]
    edited = remove_consecutive_duplicates(edited)
    if len(edited) < 3:
        raise ValueError("Shared Edge 결과 polygon의 점이 부족합니다.")
    return edited, {
        "replaced_path": f"{direction}_start_to_end",
        "replaced_vertex_count": len(selected_path),
        "replacement_vertex_count": len(replacement),
    }


def choose_replacement_orientation(reference_path, target_path, replacement_order="auto"):
    """Orient the reference path to best match the target path endpoints."""
    ref = normalize_points(reference_path).astype(float).tolist()
    target = normalize_points(target_path).astype(float).tolist()
    if replacement_order == "keep":
        return ref, "keep_order"
    if replacement_order == "reverse":
        return list(reversed(ref)), "reverse_order"
    if replacement_order != "auto":
        raise ValueError("replacement_order는 auto, keep, reverse 중 하나여야 합니다.")
    same_score = float(
        np.linalg.norm(np.array(ref[0]) - np.array(target[0]))
        + np.linalg.norm(np.array(ref[-1]) - np.array(target[-1]))
    )
    reversed_score = float(
        np.linalg.norm(np.array(ref[0]) - np.array(target[-1]))
        + np.linalg.norm(np.array(ref[-1]) - np.array(target[0]))
    )
    if same_score <= reversed_score:
        return list(reversed(ref)), "auto_reversed_from_same_direction"
    return ref, "auto_kept_from_reversed_direction"


def build_shared_edge_edit(poly_a, poly_b, vertex_indices, range_directions=None, replacement_order="auto"):
    """Replace polygon B's selected edge range with polygon A's selected edge range."""
    range_directions = range_directions or {}
    a_direction = range_directions.get("polygon_a", "forward")
    b_direction = range_directions.get("polygon_b", "forward")
    a_indices = vertex_indices.get("polygon_a", [])
    b_indices = vertex_indices.get("polygon_b", [])
    if len(a_indices) != 2 or len(b_indices) != 2:
        raise ValueError("polygon_a/polygon_b 각각 vertex index 2개가 필요합니다.")
    a_start, a_end = [int(value) for value in a_indices]
    b_start, b_end = [int(value) for value in b_indices]
    if a_start == a_end or b_start == b_end:
        raise ValueError("각 polygon에서 서로 다른 vertex 2개를 선택해야 합니다.")

    reference_path = directed_path(poly_a["points_source"], a_start, a_end, a_direction)
    target_path = directed_path(poly_b["points_source"], b_start, b_end, b_direction)
    replacement_path, pairing = choose_replacement_orientation(reference_path, target_path, replacement_order)

    a_points = normalize_points(poly_a["points_source"]).astype(float).tolist()
    b_points, b_geometry = replace_directed_edge_path(
        poly_b["points_source"],
        b_start,
        b_end,
        b_direction,
        replacement_path,
    )
    return a_points, b_points, {
        "method": "replace_polygon_b_range_with_polygon_a_range",
        "pairing": pairing,
        "range_directions": {
            "polygon_a": a_direction,
            "polygon_b": b_direction,
        },
        "replacement_order": replacement_order,
        "vertex_indices": {
            "polygon_a": [a_start, a_end],
            "polygon_b": [b_start, b_end],
        },
        "polygon_a": {
            "reference_path": f"{a_direction}_start_to_end",
            "reference_vertex_count": len(reference_path),
        },
        "polygon_b": b_geometry,
        "wall_points_source": replacement_path,
    }


def closest_vertex_pair(poly_a, poly_b):
    """Return the closest source vertex pair between two polygons."""
    points_a = normalize_points(poly_a["points_source"])
    points_b = normalize_points(poly_b["points_source"])
    deltas = points_a[:, None, :] - points_b[None, :, :]
    distances = np.linalg.norm(deltas, axis=2)
    a_index, b_index = np.unravel_index(int(np.argmin(distances)), distances.shape)
    return (
        points_a[a_index].astype(float).tolist(),
        points_b[b_index].astype(float).tolist(),
        int(a_index),
        int(b_index),
        float(distances[a_index, b_index]),
    )


def minimum_connection_edges(polygons):
    """Build nearest-neighbor connection edges until selected polygons are connected."""
    if len(polygons) < 2:
        return []

    candidate_edges = []
    for i, poly_a in enumerate(polygons):
        for j in range(i + 1, len(polygons)):
            point_a, point_b, index_a, index_b, distance = closest_vertex_pair(poly_a, polygons[j])
            candidate_edges.append(
                {
                    "a": i,
                    "b": j,
                    "point_a": point_a,
                    "point_b": point_b,
                    "index_a": index_a,
                    "index_b": index_b,
                    "distance": distance,
                }
            )
    candidate_edges.sort(key=lambda item: item["distance"])

    parent = list(range(len(polygons)))

    def find(value):
        while parent[value] != value:
            parent[value] = parent[parent[value]]
            value = parent[value]
        return value

    def union(a, b):
        root_a = find(a)
        root_b = find(b)
        if root_a == root_b:
            return False
        parent[root_b] = root_a
        return True

    selected_edges = []
    for edge in candidate_edges:
        if union(edge["a"], edge["b"]):
            selected_edges.append(edge)
        if len(selected_edges) == len(polygons) - 1:
            break
    return selected_edges


def nearest_two_vertex_indices(points, reference_points):
    """Return two vertices closest to another polygon's vertices."""
    points_array = normalize_points(points)
    reference_array = normalize_points(reference_points)
    distances = np.linalg.norm(points_array[:, None, :] - reference_array[None, :, :], axis=2)
    nearest_distances = np.min(distances, axis=1)
    ordered = np.argsort(nearest_distances)
    if len(ordered) < 2:
        raise ValueError("Auto Merge에는 각 polygon마다 최소 2개의 vertex가 필요합니다.")
    return int(ordered[0]), int(ordered[1])


def build_auto_spliced_pair(poly_a, poly_b):
    """Join two polygons by automatically removing their closest facing paths."""
    a_points = poly_a["points_source"]
    b_points = poly_b["points_source"]
    a_start, a_end = nearest_two_vertex_indices(a_points, b_points)
    b_start, b_end = nearest_two_vertex_indices(b_points, a_points)

    a_vertices = normalize_points(a_points)
    b_vertices = normalize_points(b_points)
    a_start_vertex = a_vertices[a_start].astype(float).tolist()
    a_end_vertex = a_vertices[a_end].astype(float).tolist()
    b_start_vertex = b_vertices[b_start].astype(float).tolist()
    b_end_vertex = b_vertices[b_end].astype(float).tolist()

    a_keep, a_path_info = choose_contact_and_keep_paths(
        a_points,
        a_start,
        a_end,
        b_start_vertex,
        b_end_vertex,
    )
    b_keep, b_path_info = choose_contact_and_keep_paths(
        b_points,
        b_start,
        b_end,
        a_start_vertex,
        a_end_vertex,
    )

    candidates = [
        remove_consecutive_duplicates(a_keep + b_keep),
        remove_consecutive_duplicates(a_keep + list(reversed(b_keep))),
    ]
    candidates = [candidate for candidate in candidates if len(candidate) >= 3]
    if not candidates:
        raise ValueError("Auto Merge 결과 polygon의 점이 부족합니다.")
    merged_points = max(candidates, key=lambda item: abs(cv2.contourArea(np.array(item, dtype=np.float32))))
    if abs(cv2.contourArea(np.array(merged_points, dtype=np.float32))) <= 1.0:
        raise ValueError("Auto Merge 결과 polygon 면적이 너무 작습니다.")

    return merged_points, {
        "source_polygon_ids": [poly_a["polygon_id"], poly_b["polygon_id"]],
        "a_vertex_indices": [a_start, a_end],
        "b_vertex_indices": [b_start, b_end],
        "a_vertices": [a_start_vertex, a_end_vertex],
        "b_vertices": [b_start_vertex, b_end_vertex],
        "removed_paths": {
            "polygon_a": a_path_info,
            "polygon_b": b_path_info,
        },
    }


def distance_between_polygons(poly_a, poly_b):
    """Return the closest vertex distance between two polygons."""
    points_a = normalize_points(poly_a["points_source"])
    points_b = normalize_points(poly_b["points_source"])
    return float(np.min(np.linalg.norm(points_a[:, None, :] - points_b[None, :, :], axis=2)))


def build_auto_merged_polygon(polygons):
    """Merge multiple polygons by splicing existing vertex paths without contour extraction."""
    if len(polygons) < 2:
        raise ValueError("Auto Merge에는 최소 2개의 polygon이 필요합니다.")

    remaining = list(polygons[1:])
    current = {
        **polygons[0],
        "points_source": normalize_points(polygons[0]["points_source"]).astype(float).tolist(),
    }
    pair_merges = []

    while remaining:
        next_index = min(
            range(len(remaining)),
            key=lambda index: distance_between_polygons(current, remaining[index]),
        )
        next_poly = remaining.pop(next_index)
        merged_points, pair_geometry = build_auto_spliced_pair(current, next_poly)
        pair_merges.append(pair_geometry)
        current = {
            "polygon_id": f"auto_partial_{len(pair_merges):03d}",
            "points_source": merged_points,
        }

    points = remove_consecutive_duplicates(current["points_source"])
    if len(points) < 3:
        raise ValueError("Auto Merge 결과 polygon의 점이 부족합니다.")

    return points, {
        "method": "vertex_path_splice",
        "simplified": False,
        "contour_extracted": False,
        "pair_merges": pair_merges,
    }


def build_spliced_merge_polygon(poly_a, poly_b, clicked_points=None, vertex_indices=None, remove_paths=None):
    """Merge polygons by removing user-selected boundary spans."""
    a_points = poly_a["points_source"]
    b_points = poly_b["points_source"]
    if vertex_indices:
        a_indices = vertex_indices.get("polygon_a", [])
        b_indices = vertex_indices.get("polygon_b", [])
        if len(a_indices) != 2 or len(b_indices) != 2:
            raise ValueError("vertex_indices에는 polygon_a/polygon_b 각각 2개 index가 필요합니다.")
        a_start, a_end = [int(value) for value in a_indices]
        b_start, b_end = [int(value) for value in b_indices]
    else:
        a_start = nearest_vertex_index(a_points, clicked_points[0])
        a_end = nearest_vertex_index(a_points, clicked_points[1])
        b_start = nearest_vertex_index(b_points, clicked_points[2])
        b_end = nearest_vertex_index(b_points, clicked_points[3])

    if a_start == a_end or b_start == b_end:
        raise ValueError("각 polygon에서 서로 다른 vertex 2개를 선택해야 합니다.")

    a_vertices = normalize_points(a_points)
    b_vertices = normalize_points(b_points)
    a_start_vertex = a_vertices[a_start].astype(float).tolist()
    a_end_vertex = a_vertices[a_end].astype(float).tolist()
    b_start_vertex = b_vertices[b_start].astype(float).tolist()
    b_end_vertex = b_vertices[b_end].astype(float).tolist()

    remove_paths = remove_paths or {}
    a_keep, a_path_info = keep_path_from_remove_choice(
        a_points,
        a_start,
        a_end,
        remove_paths.get("polygon_a"),
    )
    b_keep, b_path_info = keep_path_from_remove_choice(
        b_points,
        b_start,
        b_end,
        remove_paths.get("polygon_b"),
    )

    # Try both endpoint pairings and keep the polygon with the larger absolute area.
    candidates = [
        remove_consecutive_duplicates(a_keep + b_keep),
        remove_consecutive_duplicates(a_keep + list(reversed(b_keep))),
    ]
    candidates = [candidate for candidate in candidates if len(candidate) >= 3]
    if not candidates:
        raise ValueError("merge 결과 polygon의 점이 부족합니다.")
    merged_points = max(candidates, key=lambda item: abs(cv2.contourArea(np.array(item, dtype=np.float32))))

    if len(merged_points) < 3:
        raise ValueError("merge 결과 polygon의 점이 부족합니다.")

    return merged_points, {
        "a_start_vertex_index": a_start,
        "a_end_vertex_index": a_end,
        "b_start_vertex_index": b_start,
        "b_end_vertex_index": b_end,
        "a_start_vertex": a_start_vertex,
        "a_end_vertex": a_end_vertex,
        "b_start_vertex": b_start_vertex,
        "b_end_vertex": b_end_vertex,
        "removed_paths": {
            "polygon_a": a_path_info,
            "polygon_b": b_path_info,
        },
    }
