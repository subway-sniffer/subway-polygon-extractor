from pathlib import Path

from editor.export_payload import load_transform_metadata, resolve_marker_config_path


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"}


class ProjectStore:
    """Track the active editor image and its derived output files."""

    def __init__(self, args):
        self.image_root = Path(args.image_root or Path(args.image).parent).resolve()
        self.output_root = Path(args.project_output_root or "../test_image_output/web_projects").resolve()
        self.default_marker_config = args.marker_config
        self.default_icons = args.icons
        self.layer_z = args.layer_z
        self.active = self.build_project(
            Path(args.image).resolve(),
            polygons_path=Path(args.polygons).resolve(),
            annotations_path=Path(args.output).resolve(),
            final_output_path=Path(args.final_output).resolve() if args.final_output else None,
            plane_output_path=Path(args.plane_output).resolve() if args.plane_output else None,
            asset_output_path=None,
            icon_matches_path=self.resolve_icon_matches_path(Path(args.output).resolve().parent, Path(args.image).resolve()),
            marker_config_path=resolve_marker_config_path(args.marker_config, Path(args.image).resolve()),
            connections_path=Path(args.connections).resolve() if args.connections else None,
        )

    def active_image_stem(self):
        """Return a filesystem-safe stem for the active image name."""
        stem = self.active["image_path"].stem
        return "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in stem).strip("_") or "image"

    def named_output_path(self, prefix, suffix=".json"):
        """Return an output path with the active image stem appended."""
        return self.active["output_dir"] / f"{prefix}_{self.active_image_stem()}{suffix}"

    def final_output_candidates(self):
        """Return preferred and legacy final polygon output paths."""
        preferred = self.named_output_path("final_polygons")
        legacy = self.active["final_output_path"]
        return [preferred] if preferred == legacy else [preferred, legacy]

    def list_images(self):
        """Return image files under image_root with lightweight processing status."""
        images = []
        roots = [(self.image_root, "source")]
        crop_root = self.output_root / "_cropped_images"
        if crop_root.exists():
            roots.append((crop_root, "crop"))
        upload_root = self.output_root / "_uploads"
        if upload_root.exists():
            roots.append((upload_root, "upload"))
        seen = set()
        for root, label in roots:
            if not root.exists():
                continue
            for path in sorted(root.rglob("*")):
                if path.suffix.lower() not in IMAGE_EXTENSIONS:
                    continue
                resolved = path.resolve()
                if resolved in seen:
                    continue
                seen.add(resolved)
                project = self.derived_project(path)
                images.append(
                    {
                        "name": path.name,
                        "path": str(path),
                        "relative_path": f"{label}:{path.relative_to(root)}",
                        "active": resolved == self.active["image_path"],
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

    def crop_image_path(self, source_path, crop_name=None):
        """Return a unique output path for a cropped source image."""
        source_path = Path(source_path).resolve()
        crop_root = self.output_root / "_cropped_images"
        try:
            rel_parent = source_path.relative_to(self.image_root).parent
        except ValueError:
            rel_parent = Path(source_path.stem)
        crop_dir = crop_root / rel_parent
        crop_dir.mkdir(parents=True, exist_ok=True)
        base_name = crop_name or f"{source_path.stem}_crop"
        safe_name = "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in base_name).strip("_") or f"{source_path.stem}_crop"
        candidate = crop_dir / f"{safe_name}.png"
        index = 1
        while candidate.exists():
            candidate = crop_dir / f"{safe_name}_{index:03d}.png"
            index += 1
        return candidate

    def is_generated_crop_image(self, path):
        """Return True when path is a generated crop image under the output root."""
        path = Path(path).resolve()
        crop_root = (self.output_root / "_cropped_images").resolve()
        return path.is_file() and (path == crop_root or crop_root in path.parents)

    def delete_generated_crop_image(self, path):
        """Delete a generated crop image, refusing paths outside _cropped_images."""
        path = Path(path).resolve()
        crop_root = (self.output_root / "_cropped_images").resolve()
        if not self.is_generated_crop_image(path):
            raise ValueError(f"not a generated crop image: {path}")
        path.unlink()
        parent = path.parent
        while parent != crop_root and crop_root in parent.parents:
            try:
                parent.rmdir()
            except OSError:
                break
            parent = parent.parent
        return path

    def uploaded_image_path(self, filename):
        """Return a unique normalized upload path for a browser-selected image."""
        upload_root = self.output_root / "_uploads"
        upload_root.mkdir(parents=True, exist_ok=True)
        stem = Path(filename or "uploaded_image").stem
        safe_name = "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in stem).strip("_") or "uploaded_image"
        candidate = upload_root / f"{safe_name}.png"
        index = 1
        while candidate.exists():
            candidate = upload_root / f"{safe_name}_{index:03d}.png"
            index += 1
        return candidate

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
        intermediate_path = output_dir / "intermediate_polygons.json"
        final_output_path = output_dir / f"final_polygons_{image_path.stem}.json"
        return self.build_project(
            image_path,
            polygons_path=final_output_path if final_output_path.exists() else intermediate_path,
            annotations_path=output_dir / "manual_annotations.json",
            final_output_path=final_output_path,
            plane_output_path=output_dir / f"scene_planes_{image_path.stem}.json",
            asset_output_path=output_dir / f"assets_{image_path.stem}.json",
            icon_matches_path=self.resolve_icon_matches_path(output_dir, image_path),
            marker_config_path=marker_config_path,
            connections_path=output_dir / "connections.json",
        )

    def resolve_icon_matches_path(self, output_dir, image_path):
        """Return a likely icon_matches.json path for an image project."""
        if self.default_icons:
            return Path(self.default_icons).resolve()
        candidates = [
            Path(output_dir) / "icon_matches.json",
            Path(output_dir) / "icons" / "icon_matches.json",
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate.resolve()
        return (Path(output_dir) / "icon_matches.json").resolve()

    def build_project(
        self,
        image_path,
        polygons_path,
        annotations_path,
        final_output_path,
        plane_output_path,
        asset_output_path,
        icon_matches_path,
        marker_config_path,
        connections_path=None,
    ):
        """Build an active project dictionary."""
        image_path = Path(image_path).resolve()
        polygons_path = Path(polygons_path).resolve()
        annotations_path = Path(annotations_path).resolve()
        final_output_path = Path(final_output_path or annotations_path.with_name("final_polygons.json")).resolve()
        plane_output_path = Path(plane_output_path or annotations_path.with_name("scene_planes.json")).resolve()
        asset_output_path = Path(asset_output_path or annotations_path.with_name("assets.json")).resolve()
        icon_matches_path = Path(icon_matches_path or annotations_path.with_name("icon_matches.json")).resolve()
        marker_config_path = Path(marker_config_path).resolve() if marker_config_path else None
        connections_path = Path(connections_path).resolve() if connections_path else None
        return {
            "image_path": image_path,
            "polygons_path": polygons_path,
            "annotations_path": annotations_path,
            "final_output_path": final_output_path,
            "plane_output_path": plane_output_path,
            "asset_output_path": asset_output_path,
            "icon_matches_path": icon_matches_path,
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
            final_output_path=output_dir / f"final_polygons_{image_path.stem}.json",
            plane_output_path=output_dir / f"scene_planes_{image_path.stem}.json",
            asset_output_path=output_dir / f"assets_{image_path.stem}.json",
            icon_matches_path=self.resolve_icon_matches_path(output_dir, image_path),
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
