import json
from pathlib import Path


def load_json(path):
    """Load one UTF-8 JSON file."""
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(data, path):
    """Save JSON with readable UTF-8 formatting."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    return output_path
