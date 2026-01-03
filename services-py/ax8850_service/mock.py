import time
from typing import Generator, Tuple


def mock_transcribe(pcm_s16le: bytes, sample_rate: int, channels: int) -> Tuple[str, str, float]:
    size = len(pcm_s16le)
    if size % 3 == 0:
        return "read this", "en", 0.86
    if size % 5 == 0:
        return "what does this say", "en", 0.81
    if size % 7 == 0:
        return "这写的什么", "zh", 0.78
    return "what is the capital of France?", "en", 0.9


def mock_generate(prompt: str, max_tokens: int, temperature: float) -> Generator[str, None, None]:
    canned = (
        "Here is a concise answer based on your request. "
        "If you want more detail, I can expand step by step."
    )
    tokens = canned.split(" ")
    for token in tokens[: max_tokens or len(tokens)]:
        time.sleep(0.08)
        yield token + " "
