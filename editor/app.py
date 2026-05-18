import argparse
import sys
from pathlib import Path

import cv2
from flask import Flask, jsonify, render_template, request, send_file

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from editor.export_payload import (
    build_assets_payload,
    build_final_polygons_payload,
    build_plane_payload,
    build_plane_payload_from_records,
    build_working_final_payload,
    load_transform_metadata,
    parse_layer_z,
    resolve_marker_config_path,
)
from editor.geometry import (
    build_added_polygon,
    build_auto_merged_polygon,
    build_cut_hole_polygon,
    build_inserted_vertex_polygon,
    build_moved_vertex_polygon,
    build_shared_edge_edit,
    build_simple_keep_vertices_polygon,
    build_spliced_merge_polygon,
    build_straightened_polygon,
    polygon_metrics,
)
from editor.model import (
    DEFAULT_SEMANTIC,
    build_polygon_lookup,
    load_annotations,
    load_json,
    next_added_polygon_id,
    next_edited_polygon_id,
    next_manual_polygon_id,
    next_wall_id,
    save_json,
    save_json_compact_vectors,
)
from editor.marker_editor import save_manual_marker_config
from editor.pipeline_runner import run_pipeline_for_project
from editor.project_store import ProjectStore


def create_app(args):
    """Create the polygon editor Flask app."""
    app = Flask(__name__)
    store = ProjectStore(args)
    layer_z = parse_layer_z(args.layer_z)
    source_image = cv2.imread(str(store.active["image_path"]))
    if source_image is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {store.active['image_path']}")

    def load_active_icons():
        """Load icon matching output for the active project when available."""
        icon_path = store.active.get("icon_matches_path")
        if icon_path and icon_path.exists():
            return load_json(icon_path)
        return None

    @app.route("/")
    def index():
        """Render the editor page."""
        return render_template("index.html")

    @app.route("/api/images")
    def images():
        """Return source images available for batch editing."""
        return jsonify(
            {
                "image_root": str(store.image_root),
                "output_root": str(store.output_root),
                "images": store.list_images(),
            }
        )

    @app.route("/api/project/select", methods=["POST"])
    def select_project():
        """Switch the active editor project to a selected image."""
        data = request.get_json(force=True)
        image = Path(data.get("image_path", "")).resolve()
        if not image.exists():
            return jsonify({"error": f"image does not exist: {image}"}), 404
        if cv2.imread(str(image)) is None:
            return jsonify({"error": f"이미지를 불러올 수 없습니다: {image}"}), 400
        project_data = store.activate_image(image)
        return jsonify(
            {
                "selected": True,
                "image": str(project_data["image_path"]),
                "output_dir": str(project_data["output_dir"]),
                "polygons_file": str(project_data["polygons_path"]),
                "marker_config_file": str(project_data["marker_config_path"]),
            }
        )

    @app.route("/api/marker/manual", methods=["POST"])
    def save_manual_marker():
        """Save four manually clicked marker points for the active image."""
        data = request.get_json(force=True)
        try:
            config = save_manual_marker_config(
                store.active["image_path"],
                data.get("points", []),
                store.active["marker_config_path"],
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        store.refresh_transform()
        return jsonify(
            {
                "saved": True,
                "marker_config_file": str(store.active["marker_config_path"]),
                "ordered_marker_points": config.get("ordered_marker_points", []),
                "target_width": config.get("target_width"),
                "target_height": config.get("target_height"),
            }
        )

    @app.route("/api/pipeline/run", methods=["POST"])
    def run_active_pipeline():
        """Run the extraction pipeline for the active image and output directory."""
        data = request.get_json(silent=True) or {}
        try:
            result = run_pipeline_for_project(store.active, data)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400
        store.activate_output(store.active["image_path"], result["output_dir"])
        return jsonify({"ran": True, **result})

    @app.route("/api/clusters")
    def clusters():
        """Return K-Means cluster metadata and debug image URLs for the active project."""
        metadata_path = store.active["output_dir"] / "color_clusters.json"
        if not metadata_path.exists():
            return jsonify({"clusters": [], "metadata_file": str(metadata_path)})
        metadata = load_json(metadata_path)
        clusters_data = []
        for cluster in metadata.get("clusters", []):
            cluster_id = int(cluster["id"])
            debug_image = store.active["debug_dir"] / "clusters" / f"cluster_{cluster_id:02d}_mask.png"
            selected_image = store.active["debug_dir"] / "clusters" / f"cluster_{cluster_id:02d}_result.png"
            clusters_data.append(
                {
                    **cluster,
                    "mask_url": f"/api/file?path={debug_image}" if debug_image.exists() else None,
                    "selected_polygon_url": f"/api/file?path={selected_image}" if selected_image.exists() else None,
                }
            )
        return jsonify({"metadata_file": str(metadata_path), "clusters": clusters_data})

    @app.route("/api/file")
    def output_file():
        """Serve a generated output/debug file."""
        path = Path(request.args.get("path", "")).resolve()
        allowed_roots = [store.output_root.resolve(), store.active["output_dir"].resolve()]
        if not any(path == root or root in path.parents for root in allowed_roots):
            return jsonify({"error": "file path is outside output roots"}), 403
        if not path.exists():
            return jsonify({"error": f"file does not exist: {path}"}), 404
        return send_file(path)

    @app.route("/api/project")
    def project():
        """Return project polygons, optional connection candidates, and annotations."""
        polygon_data = load_json(store.active["polygons_path"]) if store.active["polygons_path"].exists() else {
            "image": {"path": str(store.active["image_path"])},
            "polygons": [],
        }
        connections = None
        if store.active["connections_path"] and store.active["connections_path"].exists():
            connections = load_json(store.active["connections_path"])
        icons = load_active_icons()
        return jsonify(
            {
                "image": {
                    "path": str(store.active["image_path"]),
                    "url": "/api/image",
                },
                "polygons_file": str(store.active["polygons_path"]),
                "connections_file": str(store.active["connections_path"]) if store.active["connections_path"] else None,
                "output_file": str(store.active["annotations_path"]),
                "final_output_file": str(store.active["final_output_path"]),
                "plane_output_file": str(store.active["plane_output_path"]),
                "icon_matches_file": str(store.active["icon_matches_path"]) if store.active["icon_matches_path"] else None,
                "marker_config_file": str(store.active["marker_config_path"]) if store.active["marker_config_path"] else None,
                "polygon_data": polygon_data,
                "connections": connections,
                "icons": icons,
                "annotations": load_annotations(store.active["annotations_path"]),
            }
        )

    @app.route("/api/image")
    def image():
        """Serve the source image used as the editor background."""
        return send_file(store.active["image_path"])

    @app.route("/api/annotations", methods=["GET"])
    def get_annotations():
        """Return saved manual annotations."""
        return jsonify(load_annotations(store.active["annotations_path"]))

    @app.route("/api/annotations", methods=["POST"])
    def post_annotations():
        """Save manual annotations."""
        data = request.get_json(force=True)
        save_json(data, store.active["annotations_path"])
        return jsonify({"saved": True, "output": str(store.active["annotations_path"])})

    @app.route("/api/export/final", methods=["POST"])
    def export_final_polygons():
        """Export final polygons after replacing hidden originals with manual polygons."""
        data = request.get_json(silent=True) or {}
        annotations = load_annotations(store.active["annotations_path"])
        working_polygons = data.get("working_polygons")
        if working_polygons:
            payload = build_working_final_payload(store.active["polygons_path"], working_polygons, annotations, store.active["transform_metadata"])
        else:
            payload = build_final_polygons_payload(store.active["polygons_path"], annotations, store.active["transform_metadata"])
        icons = load_active_icons()
        if icons:
            payload["icons"] = icons.get("icons", [])
            payload["icon_matches"] = {
                "source": str(store.active["icon_matches_path"]),
                "match_count": len(icons.get("icons", [])),
            }
        saved_path = save_json(payload, store.active["final_output_path"])
        return jsonify(
            {
                "saved": True,
                "output": str(saved_path),
                "polygon_count": len(payload["polygons"]),
                "source": payload.get("manual_export", {}).get("source", "annotations"),
            }
        )

    @app.route("/api/export/final_file", methods=["GET"])
    def load_exported_final_polygons():
        """Load the previously exported final polygon file."""
        if not store.active["final_output_path"].exists():
            return jsonify({"error": f"final export file does not exist: {store.active['final_output_path']}"}), 404
        payload = load_json(store.active["final_output_path"])
        payload["source"] = str(store.active["final_output_path"])
        return jsonify(payload)

    @app.route("/api/export/planes", methods=["POST"])
    def export_planes():
        """Export final polygons to examples/plane1.json-style plane records."""
        data = request.get_json(silent=True) or {}
        annotations = load_annotations(store.active["annotations_path"])
        icon_matches = load_active_icons()
        working_polygons = data.get("working_polygons")
        if working_polygons:
            final_payload = build_working_final_payload(store.active["polygons_path"], working_polygons, annotations, store.active["transform_metadata"])
            payload = build_plane_payload_from_records(
                final_payload["polygons"],
                final_payload.get("walls", []),
                annotations=annotations,
                transform_metadata=store.active["transform_metadata"],
                transform_info=final_payload.get("manual_export", {}).get("transform"),
                scale=args.plane_scale,
                default_z=args.default_z,
                layer_z=layer_z,
                floor_height=args.floor_height,
                invert_y=args.invert_y,
                icon_matches=icon_matches,
            )
        else:
            payload = build_plane_payload(
                store.active["polygons_path"],
                annotations,
                store.active["transform_metadata"],
                scale=args.plane_scale,
                default_z=args.default_z,
                layer_z=layer_z,
                floor_height=args.floor_height,
                invert_y=args.invert_y,
                icon_matches=icon_matches,
            )
        saved_path = save_json_compact_vectors(payload, store.active["plane_output_path"])
        assets_payload = build_assets_payload(payload)
        assets_path = save_json_compact_vectors(assets_payload, store.active["asset_output_path"])
        return jsonify(
            {
                "saved": True,
                "output": str(saved_path),
                "assets_output": str(assets_path),
                "plane_count": len(payload["planes"]),
                "connection_count": len(payload.get("connections", [])),
                "asset_count": len(assets_payload.get("assets", [])),
                "icon_count": len(payload.get("icons", [])),
                "format": payload.get("metadata", {}).get("format"),
            }
        )

    @app.route("/api/export/assets", methods=["POST"])
    def export_assets():
        """Export stair/escalator assets from scene connection records."""
        data = request.get_json(silent=True) or {}
        annotations = load_annotations(store.active["annotations_path"])
        icon_matches = load_active_icons()
        working_polygons = data.get("working_polygons")
        if working_polygons:
            final_payload = build_working_final_payload(store.active["polygons_path"], working_polygons, annotations, store.active["transform_metadata"])
            scene_payload = build_plane_payload_from_records(
                final_payload["polygons"],
                final_payload.get("walls", []),
                annotations=annotations,
                transform_metadata=store.active["transform_metadata"],
                transform_info=final_payload.get("manual_export", {}).get("transform"),
                scale=args.plane_scale,
                default_z=args.default_z,
                layer_z=layer_z,
                floor_height=args.floor_height,
                invert_y=args.invert_y,
                icon_matches=icon_matches,
            )
        else:
            scene_payload = build_plane_payload(
                store.active["polygons_path"],
                annotations,
                store.active["transform_metadata"],
                scale=args.plane_scale,
                default_z=args.default_z,
                layer_z=layer_z,
                floor_height=args.floor_height,
                invert_y=args.invert_y,
                icon_matches=icon_matches,
            )
        payload = build_assets_payload(scene_payload)
        saved_path = save_json_compact_vectors(payload, store.active["asset_output_path"])
        return jsonify(
            {
                "saved": True,
                "output": str(saved_path),
                "asset_count": len(payload.get("assets", [])),
                "format": payload.get("metadata", {}).get("format"),
            }
        )

    @app.route("/api/merge", methods=["POST"])
    def merge_polygons():
        """Merge two polygons with a manually drawn bridge polygon."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        polygon_ids = data.get("source_polygon_ids", [])
        if len(polygon_ids) != 2:
            return jsonify({"error": "source_polygon_ids는 2개가 필요합니다."}), 400
        if polygon_ids[0] not in polygon_lookup or polygon_ids[1] not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id가 포함되어 있습니다."}), 400

        clicked_points = data.get("bridge_points_source", [])
        vertex_indices = data.get("vertex_indices")
        remove_paths = data.get("remove_paths")
        if not vertex_indices and len(clicked_points) != 4:
            return jsonify({"error": "bridge_points_source 4개 또는 vertex_indices가 필요합니다."}), 400
        if not remove_paths:
            return jsonify({"error": "remove_paths가 필요합니다."}), 400

        poly_a = polygon_lookup[polygon_ids[0]]
        poly_b = polygon_lookup[polygon_ids[1]]
        try:
            merged_points, merge_geometry = build_spliced_merge_polygon(
                poly_a,
                poly_b,
                clicked_points=clicked_points,
                vertex_indices=vertex_indices,
                remove_paths=remove_paths,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(merged_points)
        merged_id = next_manual_polygon_id(annotations, data.get("working_polygons"))
        color_rgb = poly_a.get("color_rgb") or poly_b.get("color_rgb") or [180, 180, 180]
        merged_polygon = {
            "polygon_id": merged_id,
            "type": "merged_polygon",
            "source_polygon_ids": polygon_ids,
            "color_cluster": poly_a.get("color_cluster"),
            "color_rgb": color_rgb,
            "points_source": merged_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        merge_record = {
            "merge_id": f"merge_{len(annotations.get('manual_merges', [])) + 1:03d}",
            "type": "manual_splice_merge",
            "source_polygon_ids": polygon_ids,
            "clicked_points_source": clicked_points,
            "vertex_indices": vertex_indices,
            "remove_paths": remove_paths,
            "geometry": merge_geometry,
            "created_polygon_id": merged_id,
        }
        return jsonify({"merged_polygon": merged_polygon, "merge_record": merge_record})

    @app.route("/api/auto_merge", methods=["POST"])
    def auto_merge_polygons():
        """Merge selected polygons into one rough polygon for later manual cleanup."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        polygon_ids = data.get("source_polygon_ids", [])
        if len(polygon_ids) < 2:
            return jsonify({"error": "source_polygon_ids는 최소 2개가 필요합니다."}), 400
        missing = [polygon_id for polygon_id in polygon_ids if polygon_id not in polygon_lookup]
        if missing:
            return jsonify({"error": f"존재하지 않는 polygon_id가 포함되어 있습니다: {missing}"}), 400

        source_polygons = [polygon_lookup[polygon_id] for polygon_id in polygon_ids]
        try:
            merged_points, merge_geometry = build_auto_merged_polygon(source_polygons)
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(merged_points)
        merged_id = next_manual_polygon_id(annotations, data.get("working_polygons"))
        color_rgb = source_polygons[0].get("color_rgb") or [180, 180, 180]
        merged_polygon = {
            "polygon_id": merged_id,
            "type": "auto_merged_polygon",
            "source_polygon_ids": polygon_ids,
            "color_cluster": source_polygons[0].get("color_cluster"),
            "color_rgb": color_rgb,
            "points_source": merged_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        merge_record = {
            "merge_id": f"merge_{len(annotations.get('manual_merges', [])) + 1:03d}",
            "type": "auto_merge",
            "source_polygon_ids": polygon_ids,
            "geometry": merge_geometry,
            "created_polygon_id": merged_id,
        }
        return jsonify({"merged_polygon": merged_polygon, "merge_record": merge_record})

    @app.route("/api/straighten", methods=["POST"])
    def straighten_polygon():
        """Create an edited polygon by replacing one selected path with a straight edge."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        vertex_indices = data.get("vertex_indices", [])
        remove_path = data.get("remove_path")
        if not remove_path:
            return jsonify({"error": "remove_path가 필요합니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            edited_points, edit_geometry = build_straightened_polygon(
                source_poly,
                vertex_indices,
                remove_path,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(edited_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "straightened_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": edited_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "straighten_edge",
            "source_polygon_id": polygon_id,
            "vertex_indices": vertex_indices,
            "remove_path": remove_path,
            "geometry": edit_geometry,
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    @app.route("/api/shared_edge", methods=["POST"])
    def shared_edge():
        """Snap two selected polygon edges to shared coordinates and create a wall record."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        polygon_ids = data.get("source_polygon_ids", [])
        if len(polygon_ids) != 2:
            return jsonify({"error": "source_polygon_ids는 2개가 필요합니다."}), 400
        if polygon_ids[0] not in polygon_lookup or polygon_ids[1] not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id가 포함되어 있습니다."}), 400

        poly_a = polygon_lookup[polygon_ids[0]]
        poly_b = polygon_lookup[polygon_ids[1]]
        try:
            a_points, b_points, geometry = build_shared_edge_edit(
                poly_a,
                poly_b,
                data.get("vertex_indices", {}),
                range_directions=data.get("range_directions"),
                replacement_order=data.get("replacement_order", "auto"),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        edit_count = len(annotations.get("manual_edits", []))
        edited_ids = reserve_prefixed_polygon_ids("edited", 2, annotations, data.get("working_polygons"))
        edited_polygons = []
        for source_poly, edited_points, edited_id in [
            (poly_a, a_points, edited_ids[0]),
            (poly_b, b_points, edited_ids[1]),
        ]:
            metrics = polygon_metrics(edited_points)
            edited_polygons.append(
                {
                    "polygon_id": edited_id,
                    "type": "shared_edge_snapped_polygon",
                    "source_polygon_ids": [source_poly["polygon_id"]],
                    "color_cluster": source_poly.get("color_cluster"),
                    "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
                    "points_source": edited_points,
                    "area_source": metrics["area_source"],
                    "bbox_source": metrics["bbox_source"],
                    "centroid_source": metrics["centroid_source"],
                    "semantic": source_poly.get("semantic") or dict(DEFAULT_SEMANTIC),
                }
            )

        wall_id = next_wall_id(annotations)
        wall_record = {
            "wall_id": wall_id,
            "type": "shared_boundary_wall",
            "source_polygon_ids": polygon_ids,
            "snapped_polygon_ids": edited_ids,
            "points_source": geometry["wall_points_source"],
            "height": float(data.get("height", 1.0)),
            "semantic": {
                "layer": None,
                "label": None,
                "confidence": None,
            },
        }
        edit_record = {
            "edit_id": f"edit_{edit_count + 1:03d}",
            "type": "shared_edge_snap",
            "source_polygon_ids": polygon_ids,
            "created_polygon_ids": edited_ids,
            "wall_id": wall_id,
            "geometry": geometry,
        }
        return jsonify(
            {
                "edited_polygons": edited_polygons,
                "edit_record": edit_record,
                "wall_record": wall_record,
            }
        )

    @app.route("/api/move_vertex", methods=["POST"])
    def move_vertex():
        """Create an edited polygon by moving one vertex."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            edited_points, holes, edit_geometry = build_moved_vertex_polygon(
                source_poly,
                data.get("vertex_index"),
                data.get("point"),
                hole_index=data.get("hole_index"),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(edited_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "moved_vertex_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": edited_points,
            "holes_source": holes,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "move_vertex",
            "source_polygon_id": polygon_id,
            "target": edit_geometry["target"],
            "hole_index": edit_geometry["hole_index"],
            "vertex_index": edit_geometry["vertex_index"],
            "from": edit_geometry["from"],
            "to": edit_geometry["to"],
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    @app.route("/api/insert_vertex", methods=["POST"])
    def insert_vertex():
        """Create an edited polygon by inserting one vertex on an edge."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            edited_points, edit_geometry = build_inserted_vertex_polygon(
                source_poly,
                data.get("insert_after_index"),
                data.get("point"),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(edited_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "inserted_vertex_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": edited_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or dict(DEFAULT_SEMANTIC),
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "insert_vertex",
            "source_polygon_id": polygon_id,
            "insert_after_index": edit_geometry["insert_after_index"],
            "inserted_vertex_index": edit_geometry["inserted_vertex_index"],
            "point": edit_geometry["point"],
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    @app.route("/api/simple_keep_vertices", methods=["POST"])
    def simple_keep_vertices():
        """Create an edited polygon by keeping selected vertices only."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            edited_points, edit_geometry = build_simple_keep_vertices_polygon(
                source_poly,
                data.get("kept_vertex_indices", []),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(edited_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "simple_keep_vertices_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": edited_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or {
                "layer": None,
                "line": None,
                "zone_type": None,
                "label": None,
                "confidence": None,
            },
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "simple_keep_vertices",
            "source_polygon_id": polygon_id,
            "kept_vertex_indices": edit_geometry["kept_vertex_indices"],
            "removed_vertex_indices": edit_geometry["removed_vertex_indices"],
            "geometry": edit_geometry,
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    @app.route("/api/add_polygon", methods=["POST"])
    def add_polygon():
        """Create a new manually added polygon."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        source_polygon_id = data.get("source_polygon_id")
        source_poly = polygon_lookup.get(source_polygon_id) if source_polygon_id else None
        try:
            added_points = build_added_polygon(data.get("points_source", []))
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(added_points)
        added_id = next_added_polygon_id(annotations, data.get("working_polygons"))
        added_polygon = {
            "polygon_id": added_id,
            "type": "added_polygon",
            "source_polygon_ids": [],
            "color_cluster": source_poly.get("color_cluster") if source_poly else None,
            "color_rgb": data.get("color_rgb") or (source_poly.get("color_rgb") if source_poly else [180, 180, 180]),
            "points_source": added_points,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") if source_poly and source_poly.get("semantic") else dict(DEFAULT_SEMANTIC),
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "add_polygon",
            "source_polygon_id": source_polygon_id,
            "created_polygon_id": added_id,
            "point_count": len(added_points),
        }
        return jsonify({"added_polygon": added_polygon, "edit_record": edit_record})

    @app.route("/api/cut_hole", methods=["POST"])
    def cut_hole():
        """Create an edited polygon with a manually drawn hole."""
        data = request.get_json(force=True)
        annotations = load_annotations(store.active["annotations_path"])
        polygon_lookup = build_polygon_lookup(store.active["polygons_path"], annotations, data.get("working_polygons"))
        polygon_id = data.get("polygon_id")
        if polygon_id not in polygon_lookup:
            return jsonify({"error": "존재하지 않는 polygon_id입니다."}), 400

        source_poly = polygon_lookup[polygon_id]
        try:
            outer_points, holes, edit_geometry = build_cut_hole_polygon(
                source_poly,
                data.get("hole_points_source", []),
            )
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400

        metrics = polygon_metrics(outer_points)
        edited_id = next_edited_polygon_id(annotations, data.get("working_polygons"))
        edited_polygon = {
            "polygon_id": edited_id,
            "type": "cut_hole_polygon",
            "source_polygon_ids": [polygon_id],
            "color_cluster": source_poly.get("color_cluster"),
            "color_rgb": source_poly.get("color_rgb") or [180, 180, 180],
            "points_source": outer_points,
            "holes_source": holes,
            "area_source": metrics["area_source"],
            "bbox_source": metrics["bbox_source"],
            "centroid_source": metrics["centroid_source"],
            "semantic": source_poly.get("semantic") or dict(DEFAULT_SEMANTIC),
        }
        edit_record = {
            "edit_id": f"edit_{len(annotations.get('manual_edits', [])) + 1:03d}",
            "type": "cut_hole",
            "source_polygon_id": polygon_id,
            "geometry": edit_geometry,
            "created_polygon_id": edited_id,
        }
        return jsonify({"edited_polygon": edited_polygon, "edit_record": edit_record})

    return app


def parse_args():
    """Parse editor command-line options."""
    parser = argparse.ArgumentParser(description="Run the local polygon correction editor.")
    parser.add_argument("--image", required=True, help="Source image shown behind polygon overlays.")
    parser.add_argument("--polygons", required=True, help="intermediate_polygons.json with points_source.")
    parser.add_argument("--connections", help="Optional connections.json.")
    parser.add_argument("--icons", help="Optional icon_matches.json.")
    parser.add_argument("--output", required=True, help="manual_annotations.json output path.")
    parser.add_argument("--final-output", help="Output path for final_polygons.json.")
    parser.add_argument("--plane-output", help="Output path for plane1-compatible scene_planes.json.")
    parser.add_argument("--marker-config", help="Marker config with perspective_matrix for transformed export.")
    parser.add_argument("--image-root", help="Directory scanned by the web image picker. Defaults to the initial image directory.")
    parser.add_argument("--project-output-root", help="Directory for web-created per-image outputs.")
    parser.add_argument("--plane-scale", type=float, default=0.01)
    parser.add_argument("--default-z", type=float, default=0.0)
    parser.add_argument("--floor-height", type=float, default=5.0, help="Default floor height multiplier for layer indices.")
    parser.add_argument("--layer-z", help="Optional explicit layer z override, for example 'B1=0,B2=-5,B3=-10'.")
    parser.add_argument("--invert-y", action="store_true")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5050)
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args()


def main():
    """Run the Flask development server."""
    args = parse_args()
    app = create_app(args)
    print(f"editor=http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
