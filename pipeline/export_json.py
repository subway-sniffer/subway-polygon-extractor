import numpy as np


def to_python_scalar(value):
    """Convert numpy scalar values to native Python values."""
    if isinstance(value, np.generic):
        return value.item()
    return value


def to_python_list(value):
    """Convert numpy arrays and nested values into JSON-safe Python objects."""
    if isinstance(value, np.ndarray):
        return to_python_list(value.tolist())
    if isinstance(value, list):
        return [to_python_list(item) for item in value]
    if isinstance(value, tuple):
        return [to_python_list(item) for item in value]
    return to_python_scalar(value)


def export_polygons_json(*args, **kwargs):
    """Placeholder for future 3D engine JSON export."""
    raise NotImplementedError("JSON export will be implemented in a later phase.")
