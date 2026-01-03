from abc import ABC, abstractmethod
import io
import subprocess
import tempfile
from typing import Tuple
from pathlib import Path
import os


class CameraClient(ABC):
    @abstractmethod
    def capture_still(self, width: int, height: int, fmt: str) -> Tuple[bytes, str, int, int]:
        """
        Captures a still image.

        Returns:
            A tuple containing (image_data, mime_type, width, height).
        """
        pass


class MockCameraClient(CameraClient):
    """
    A mock client that simulates the behavior of a camera for
    development and testing purposes.
    """
    def __init__(self):
        self.sample_path = str(Path(__file__).parent / "assets" / "sample.jpg")

    def capture_still(self, width: int, height: int, fmt: str) -> Tuple[bytes, str, int, int]:
        print(f"Mocking camera capture for {width}x{height} in {fmt} format.")
        data = Path(self.sample_path).read_bytes()
        mime = "image/jpeg" if fmt == "jpeg" else "image/png"
        return data, mime, width, height


class SdkCameraClient(CameraClient):
    """
    The client for interacting with the actual camera hardware.
    """

    def _capture_with_picamera(self, width: int, height: int, fmt: str) -> bytes:
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


    def _capture_with_libcamera(self, width: int, height: int, fmt: str) -> bytes:
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

    def capture_still(self, width: int, height: int, fmt: str) -> Tuple[bytes, str, int, int]:
        print(f"Capturing image with actual camera: {width}x{height} in {fmt} format.")
        try:
            data = self._capture_with_picamera(width, height, fmt)
        except Exception:
            data = self._capture_with_libcamera(width, height, fmt)
        mime = "image/jpeg" if fmt == "jpeg" else "image/png"
        return data, mime, width, height


def get_camera_client(device_mode: bool) -> CameraClient:
    """
    Factory function to get the appropriate Camera client based on the
    `DEVICE_MODE` environment variable.
    """
    if device_mode:
        return SdkCameraClient()
    return MockCameraClient()
