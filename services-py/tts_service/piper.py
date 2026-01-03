import shutil
import subprocess
import tempfile
from typing import Tuple

from common.utils import read_wav


def synthesize_with_piper(text: str, model_path: str) -> Tuple[bytes, int, int]:
    if not shutil.which("piper"):
        raise RuntimeError("piper CLI not found")
    with tempfile.NamedTemporaryFile(suffix=".wav") as handle:
        cmd = ["piper", "--model", model_path, "--output_file", handle.name]
        subprocess.run(cmd, input=text.encode("utf-8"), check=True)
        return read_wav(handle.name)
