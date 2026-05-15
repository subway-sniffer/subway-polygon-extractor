from pathlib import Path

from editor.export_payload import load_transform_metadata, resolve_marker_config_path


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"}


class ProjectStore:
    """Track the active editor image and its derived output files."""

    def __init__(self, args):
        self.image_root = Path(args.image_root or Path(args.image).parent).resolve()
        self.output_root = Path(args.project_output_root or "../test_image_output/web_projects").resolve()
        self.default_marker_config = args.marker_config
        self.layer_z = args.layer_z
        self.active = self.build_project(
            Path(args.image).resolve(),
            polygons_path=Path(args.polygons).resolve(),
            annotations_path=Path(args.output).resolve(),
            final_output_path=Path(args.final_output).resolve() if args.final_output else None,
            plane_output_path=Path(args.plane_output).resolve() if args.plane_output else None,
            marker_config_path=resolve_marker_config_path(args.marker_config, Path(args.image).resolve()),
            connections_path=Path(args.connections).resolve() if args.connections else None,
        )

    def list_images(self):
        """Return image files under image_root with lightweight processing status."""
        images = []
        if not self.image_root.exists():
            return images
        for path in sorted(self.image_root.rglob("*")):
            if path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            project = self.derived_project(path)
            images.append(
                {
                    "name": path.name,
                    "path": str(path),
                    "relative_path": str(path.relative_to(self.image_root)),
                    "active": path.resolve() == self.active["image_path"],
                    "status": {
                        "marker": project["marker_config_path"].exists(),
                        "extracted": project["polygons_path"].exists(),
                        "edited": project["annotations_path"].exists(),
                        "final": project["final_output_path"].exists(),
                        "scene": project["plane_output_path"].exists(),
                    },
                }
            )
        return images

    def output_dir_for_image(self, image_path):
        """Return a stable output directory for one source image."""
        image_path = Path(image_path).resolve()
        try:
            rel = image_path.relative_to(self.image_root)
            parts = rel.with_suffix("").parts
        except ValueError:
            parts = (image_path.stem,)
        return self.output_root.joinpath(*parts)

    def derived_project(self, image_path):
        """Build project file paths from an image path."""
        image_path = Path(image_path).resolve()
        output_dir = self.output_dir_for_image(image_path)
        marker_config_path = output_dir / "marker_config.json"
        return self.build_project(
            image_path,
            polygons_path=output_dir / "intermediate_polygons.json",
            annotations_path=output_dir / "manual_annotations.json",
            final_output_path=output_dir / "final_polygons.json",
            plane_output_path=output_dir / "scene_planes.json",
            marker_config_path=marker_config_path,
            connections_path=output_dir / "connections.json",
        )

    def build_project(
        self,
        image_path,
        polygons_path,
        annotations_path,
        final_output_path,
        plane_output_path,
        marker_config_path,
        connections_path=None,
    ):
        """Build an active project dictionary."""
        image_path = Path(image_path).resolve()
        polygons_path = Path(polygons_path).resolve()
        annotations_path = Path(annotations_path).resolve()
        final_output_path = Path(final_output_path or annotations_path.with_name("final_polygons.json")).resolve()
        plane_output_path = Path(plane_output_path or annotations_path.with_name("scene_planes.json")).resolve()
        marker_config_path = Path(marker_config_path).resolve() if marker_config_path else None
        connections_path = Path(connections_path).resolve() if connections_path else None
        return {
            "image_path": image_path,
            "polygons_path": polygons_path,
            "annotations_path": annotations_path,
            "final_output_path": final_output_path,
            "plane_output_path": plane_output_path,
            "marker_config_path": marker_config_path,
            "connections_path": connections_path,
            "output_dir": polygons_path.parent,
            "debug_dir": polygons_path.parent / "debug",
            "transform_metadata": load_transform_metadata(marker_config_path) if marker_config_path and marker_config_path.exists() else None,
        }

    def activate_image(self, image_path):
        """Switch the active project to an image-derived output set."""
        self.active = self.derived_project(image_path)
        return self.active

    def activate_output(self, image_path, output_dir):
        """Switch the active project to a completed pipeline output directory."""
        image_path = Path(image_path).resolve()
        output_dir = Path(output_dir).resolve()
        self.active = self.build_project(
            image_path,
            polygons_path=output_dir / "intermediate_polygons.json",
            annotations_path=output_dir / "manual_annotations.json",
            final_output_path=output_dir / "final_polygons.json",
            plane_output_path=output_dir / "scene_planes.json",
            marker_config_path=output_dir / "marker_config.json",
            connections_path=output_dir / "connections.json",
        )
        return self.active

    def refresh_transform(self):
        """Reload transform metadata for the active marker config."""
        marker_config_path = self.active["marker_config_path"]
        self.active["transform_metadata"] = (
            load_transform_metadata(marker_config_path)
            if marker_config_path and marker_config_path.exists()
            else None
        )
        return self.active["transform_metadata"]
