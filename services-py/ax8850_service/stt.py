from typing import Tuple

from . import engine


def transcribe(pcm_s16le: bytes, sample_rate: int, channels: int) -> Tuple[str, str, float]:
    return engine.transcribe_audio(pcm_s16le, sample_rate, channels)
