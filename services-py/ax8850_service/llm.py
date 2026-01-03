from typing import Generator

from . import engine


def generate(prompt: str, max_tokens: int, temperature: float) -> Generator[str, None, None]:
    return engine.generate_stream(prompt, max_tokens, temperature)
