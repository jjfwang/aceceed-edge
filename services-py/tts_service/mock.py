import math
from typing import Tuple


def mock_synthesize(text: str, lang: str, sample_rate: int = 16000) -> Tuple[bytes, int, int]:
    duration = min(3.0, 0.5 + len(text) * 0.03)
    total_samples = int(sample_rate * duration)
    pcm = bytearray()
    for i in range(total_samples):
        value = int(0.2 * 32767 * math.sin(2 * math.pi * 440 * (i / sample_rate)))
        pcm += int(value).to_bytes(2, byteorder="little", signed=True)
    return bytes(pcm), sample_rate, 1
