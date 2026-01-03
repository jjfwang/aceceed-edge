import os
from typing import Tuple

from . import piper


def synthesize(text: str, lang: str) -> Tuple[bytes, int, int]:
    model_path = os.getenv("PIPER_MODEL_PATH", "")
    if not model_path:
        raise RuntimeError("PIPER_MODEL_PATH not set")
    # TODO: Support language-based model selection and streaming.
    return piper.synthesize_with_piper(text, model_path)
