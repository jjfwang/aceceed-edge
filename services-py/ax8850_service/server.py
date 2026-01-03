import logging
import os
import sys
from pathlib import Path
from typing import Iterator

import grpc

sys.path.append(str(Path(__file__).resolve().parents[1]))
sys.path.append(str(Path(__file__).resolve().parents[1] / "common" / "gen"))

from common import utils
from common.grpc_server import serve
from common.models import ServiceConfig

import assistant_pb2
import assistant_pb2_grpc

from .engine import get_ax8850_client


class Ax8850Service(assistant_pb2_grpc.Ax8850ServiceServicer):
    def __init__(self):
        self.ax_client = get_ax8850_client(utils.is_device_mode())
        logging.info(f"Initialized Ax8850Service with client: {self.ax_client.__class__.__name__}")

    def Health(self, request, context):
        return assistant_pb2.HealthResponse(ok=True, message="ok")

    def Transcribe(self, request, context):
        try:
            text, lang, confidence = self.ax_client.transcribe_audio(
                request.pcm_s16le, request.sample_rate_hz, request.channels
            )
            return assistant_pb2.TranscribeResult(
                text=text, lang=lang, confidence=confidence
            )
        except Exception as exc:
            logging.error(f"Transcription failed: {exc}", exc_info=True)
            context.set_details(str(exc))
            context.set_code(grpc.StatusCode.INTERNAL)
            return assistant_pb2.TranscribeResult()

    def Generate(self, request, context) -> Iterator[assistant_pb2.GenerateChunk]:
        try:
            stream = self.ax_client.generate_stream(
                request.prompt, request.max_tokens, request.temperature
            )
            for token in stream:
                yield assistant_pb2.GenerateChunk(text=token, done=False)
            yield assistant_pb2.GenerateChunk(text="", done=True)
        except Exception as exc:
            logging.error(f"Generation failed: {exc}", exc_info=True)
            context.set_details(str(exc))
            context.set_code(grpc.StatusCode.INTERNAL)
            yield assistant_pb2.GenerateChunk(text="", done=True)


def main():
    logging.basicConfig(level=logging.INFO)
    host = os.getenv("AX8850_HOST", "127.0.0.1")
    port = int(os.getenv("AX8850_PORT", "50051"))
    config = ServiceConfig(host=host, port=port)
    server = serve(
        Ax8850Service(),
        assistant_pb2_grpc.add_Ax8850ServiceServicer_to_server,
        config.host,
        config.port,
    )
    server.wait_for_termination()


if __name__ == "__main__":
    main()
