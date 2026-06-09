import json
import sqlite3
from contextlib import contextmanager

from route_server.app.config import settings


def db_path():
    """Return the SQLite index database path."""
    settings.data_root.mkdir(parents=True, exist_ok=True)
    return settings.data_root / "index.sqlite"


@contextmanager
def connect():
    """Open a SQLite connection with dictionary rows."""
    conn = sqlite3.connect(db_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row):
    """Convert a sqlite row to a plain dict."""
    return dict(row) if row is not None else None


def json_text(value):
    """Serialize a value for a JSON text column."""
    return json.dumps(value, ensure_ascii=False)


def from_json_text(value, fallback=None):
    """Deserialize a JSON text column."""
    if value in (None, ""):
        return fallback
    return json.loads(value)


def init_db():
    """Create route server index tables."""
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS stations (
              station_id TEXT PRIMARY KEY,
              station_name TEXT NOT NULL,
              line_ids_json TEXT NOT NULL DEFAULT '[]',
              active_version TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS station_versions (
              station_id TEXT NOT NULL,
              version TEXT NOT NULL,
              navigation_graph_path TEXT NOT NULL,
              route_video_edges_path TEXT,
              scene_planes_path TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (station_id, version)
            );

            CREATE TABLE IF NOT EXISTS platform_nodes (
              station_id TEXT NOT NULL,
              version TEXT NOT NULL,
              line_id TEXT,
              direction TEXT,
              platform_id TEXT,
              car INTEGER NOT NULL,
              node_id TEXT NOT NULL,
              node_key_str TEXT,
              position_json TEXT,
              source_door_count INTEGER DEFAULT 0,
              source_doors_json TEXT NOT NULL DEFAULT '[]',
              PRIMARY KEY (station_id, version, platform_id, car)
            );

            CREATE TABLE IF NOT EXISTS exit_nodes (
              station_id TEXT NOT NULL,
              version TEXT NOT NULL,
              exit_number TEXT,
              node_id TEXT NOT NULL,
              node_key_str TEXT,
              node_type TEXT,
              layer TEXT,
              position_json TEXT,
              PRIMARY KEY (station_id, version, node_id)
            );

            CREATE TABLE IF NOT EXISTS facility_nodes (
              station_id TEXT NOT NULL,
              version TEXT NOT NULL,
              facility_type TEXT NOT NULL,
              facility_subtype TEXT,
              label TEXT,
              node_id TEXT NOT NULL,
              node_key_str TEXT,
              layer TEXT,
              position_json TEXT,
              PRIMARY KEY (station_id, version, node_id)
            );

            CREATE TABLE IF NOT EXISTS video_edges (
              station_id TEXT NOT NULL,
              version TEXT NOT NULL,
              edge_id TEXT NOT NULL,
              video_title TEXT,
              url TEXT,
              from_node_key TEXT,
              to_node_key TEXT,
              route_edge_type TEXT,
              connector_type TEXT,
              transport_mode TEXT,
              used_by_count INTEGER DEFAULT 0,
              PRIMARY KEY (station_id, version, edge_id)
            );

            CREATE INDEX IF NOT EXISTS idx_platform_lookup
              ON platform_nodes (station_id, version, line_id, direction, platform_id, car);
            CREATE INDEX IF NOT EXISTS idx_exit_lookup
              ON exit_nodes (station_id, version, exit_number);
            CREATE INDEX IF NOT EXISTS idx_facility_lookup
              ON facility_nodes (station_id, version, facility_type, facility_subtype);
            CREATE INDEX IF NOT EXISTS idx_video_edges_lookup
              ON video_edges (station_id, version, edge_id);
            """
        )


def delete_version_indexes(conn, station_id, version):
    """Remove all derived index rows for a station version."""
    for table in ["platform_nodes", "exit_nodes", "facility_nodes", "video_edges"]:
        conn.execute(f"DELETE FROM {table} WHERE station_id = ? AND version = ?", (station_id, version))

