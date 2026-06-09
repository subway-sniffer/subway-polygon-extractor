import os
from pathlib import Path


class Settings:
    """Runtime settings for the route server."""

    def __init__(self):
        self.data_root = Path(os.getenv("ROUTE_SERVER_DATA_ROOT", "route_server/data")).resolve()
        self.video_base_url = os.getenv("ROUTE_SERVER_VIDEO_BASE_URL", "").rstrip("/")
        self.admin_token = os.getenv("ROUTE_SERVER_ADMIN_TOKEN", "")


settings = Settings()
