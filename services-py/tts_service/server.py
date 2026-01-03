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

from .engine import get_tts_client


class TtsService(assistant_pb2_grpc.TtsServiceServicer):
    def __init__(self):
        self.tts_client = get_tts_client(utils.is_device_mode())
        logging.info(f"Initialized TtsService with client: {self.tts_client.__class__.__name__}")

    def Health(self, request, context):
        return assistant_pb2.HealthResponse(ok=True, message="ok")

    def Synthesize(self, request, context):
        try:
            pcm, sample_rate, channels = self.tts_client.synthesize(request.text, request.lang)
            return assistant_pb2.AudioBlob(
                pcm_s16le=pcm, sample_rate_hz=sample_rate, channels=channels
            )
        except Exception as exc:
            logging.error(f"Synthesize failed: {exc}", exc_info=True)
            context.set_details(str(exc))
            context.set_code(grpc.StatusCode.INTERNAL)
            return assistant_pb2.AudioBlob()


def main():
    logging.basicConfig(level=logging.INFO)
    host = os.getenv("TTS_HOST", "127.0.0.1")
    port = int(os.getenv("TTS_PORT", "50054"))
    config = ServiceConfig(host=host, port=port)
    server = serve(
        TtsService(),
        assistant_pb2_grpc.add_TtsServiceServicer_to_server,
        config.host,
        config.port,
    )
    server.wait_for_termination()


if __name__ == "__main__":
    main()
