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

from .engine import get_hailo_vision_client


class VisionService(assistant_pb2_grpc.VisionServiceServicer):
    def __init__(self):
        self.vision_client = get_hailo_vision_client(utils.is_device_mode())
        logging.info(f"Initialized VisionService with client: {self.vision_client.__class__.__name__}")

    def Health(self, request, context):
        return assistant_pb2.HealthResponse(ok=True, message="ok")

    def ClassifyPage(self, request, context):
        try:
            page_type, confidence = self.vision_client.classify_page(
                request.data, request.width, request.height
            )
            return assistant_pb2.PageTypeResult(
                page_type=page_type, confidence=confidence
            )
        except Exception as exc:
            logging.error(f"ClassifyPage failed: {exc}", exc_info=True)
            context.set_details(str(exc))
            context.set_code(grpc.StatusCode.INTERNAL)
            return assistant_pb2.PageTypeResult()

    def DetectTextRegions(self, request, context):
        try:
            regions = self.vision_client.detect_text_regions(
                request.data, request.width, request.height
            )
            return assistant_pb2.Regions(
                regions=[
                    assistant_pb2.Region(
                        x=x, y=y, w=w, h=h, confidence=conf
                    )
                    for x, y, w, h, conf in regions
                ]
            )
        except Exception as exc:
            logging.error(f"DetectTextRegions failed: {exc}", exc_info=True)
            context.set_details(str(exc))
            context.set_code(grpc.StatusCode.INTERNAL)
            return assistant_pb2.Regions()

    def Ocr(self, request, context):
        try:
            regions = [
                (r.x, r.y, r.w, r.h, r.confidence)
                for r in request.regions.regions
            ]
            lines = self.vision_client.ocr_regions(
                request.image.data, request.image.width, request.image.height, regions
            )
            return assistant_pb2.OcrResult(
                lines=[
                    assistant_pb2.OcrLine(
                        text=text,
                        confidence=conf,
                        region=assistant_pb2.Region(
                            x=region[0], y=region[1], w=region[2], h=region[3], confidence=region[4]
                        ),
                    )
                    for text, conf, region in lines
                ]
            )
        except Exception as exc:
            logging.error(f"OCR failed: {exc}", exc_info=True)
            context.set_details(str(exc))
            context.set_code(grpc.StatusCode.INTERNAL)
            return assistant_pb2.OcrResult()


def main():
    logging.basicConfig(level=logging.INFO)
    host = os.getenv("VISION_HOST", "127.0.0.1")
    port = int(os.getenv("VISION_PORT", "50052"))
    config = ServiceConfig(host=host, port=port)
    server = serve(
        VisionService(),
        assistant_pb2_grpc.add_VisionServiceServicer_to_server,
        config.host,
        config.port,
    )
    server.wait_for_termination()


if __name__ == "__main__":
    main()
