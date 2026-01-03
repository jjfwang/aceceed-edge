from pathlib import Path
from typing import Tuple


def mock_capture(sample_path: str, width: int, height: int, fmt: str) -> Tuple[bytes, str, int, int]:
    data = Path(sample_path).read_bytes()
    mime = "image/jpeg" if fmt == "jpeg" else "image/png"
    return data, mime, width, height
