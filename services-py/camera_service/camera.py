import io
import subprocess
import tempfile
from typing import Tuple


def capture_with_picamera(width: int, height: int, fmt: str) -> bytes:
    try:
        from picamera2 import Picamera2
    except Exception as exc:
        raise RuntimeError("picamera2 not available") from exc

    cam = Picamera2()
    config = cam.create_still_configuration(main={"size": (width, height)})
    cam.configure(config)
    cam.start()
    buffer = io.BytesIO()
    cam.capture_file(buffer, format=fmt)
    cam.stop()
    return buffer.getvalue()


def capture_with_libcamera(width: int, height: int, fmt: str) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=f".{fmt}") as handle:
        cmd = [
            "libcamera-still",
            "-o",
            handle.name,
            "--width",
            str(width),
            "--height",
            str(height),
            "--encoding",
            fmt,
        ]
        # TODO: Add camera tuning params as needed for Pi Camera.
        subprocess.run(cmd, check=True)
        handle.seek(0)
        return handle.read()


def capture_still(width: int, height: int, fmt: str) -> Tuple[bytes, str, int, int]:
    try:
        data = capture_with_picamera(width, height, fmt)
    except Exception:
        data = capture_with_libcamera(width, height, fmt)
    mime = "image/jpeg" if fmt == "jpeg" else "image/png"
    return data, mime, width, height
