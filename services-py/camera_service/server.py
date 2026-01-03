import logging
import os
import sys
from pathlib import Path

import grpc

sys.path.append(str(Path(__file__).resolve().parents[1]))
sys.path.append(str(Path(__file__).resolve().parents[1] / "common" / "gen"))

from common import utils
from common.grpc_server import serve
from common.models import ServiceConfig

import assistant_pb2
import assistant_pb2_grpc

from .engine import get_camera_client


class CameraService(assistant_pb2_grpc.CameraServiceServicer):
    def __init__(self):
        self.camera_client = get_camera_client(utils.is_device_mode())
        logging.info(f"Initialized CameraService with client: {self.camera_client.__class__.__name__}")

    def Health(self, request, context):
        return assistant_pb2.HealthResponse(ok=True, message="ok")

    def CaptureStill(self, request, context):
        try:
            width = request.width or 640
            height = request.height or 480
            fmt = request.format or "jpeg"
            data, mime, width, height = self.camera_client.capture_still(width, height, fmt)
            return assistant_pb2.ImageBlob(
                data=data, mime=mime, width=width, height=height
            )
        except Exception as exc:
            logging.error(f"CaptureStill failed: {exc}", exc_info=True)
            context.set_details(str(exc))
            context.set_code(grpc.StatusCode.INTERNAL)
            return assistant_pb2.ImageBlob()


def main():
    logging.basicConfig(level=logging.INFO)
    host = os.getenv("CAMERA_HOST", "127.0.0.1")
    port = int(os.getenv("CAMERA_PORT", "50053"))
    config = ServiceConfig(host=host, port=port)
    server = serve(
        CameraService(),
        assistant_pb2_grpc.add_CameraServiceServicer_to_server,
        config.host,
        config.port,
    )
    server.wait_for_termination()


if __name__ == "__main__":
    main()
