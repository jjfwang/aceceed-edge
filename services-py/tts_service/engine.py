from abc import ABC, abstractmethod
import math
import shutil
import subprocess
import tempfile
from typing import Tuple
import os

from common.utils import read_wav


class TtsClient(ABC):
    @abstractmethod
    def synthesize(self, text: str, lang: str) -> Tuple[bytes, int, int]:
        """
        Synthesizes speech from text.

        Returns:
            A tuple containing (audio_data, sample_rate, channels).
        """
        pass


class MockTtsClient(TtsClient):
    """
    A mock client that simulates TTS synthesis for development and testing.
    """
    def synthesize(self, text: str, lang: str, sample_rate: int = 16000) -> Tuple[bytes, int, int]:
        print(f"Mocking TTS synthesis for text: '{text}' in language: {lang}")
        duration = min(3.0, 0.5 + len(text) * 0.03)
        total_samples = int(sample_rate * duration)
        pcm = bytearray()
        for i in range(total_samples):
            value = int(0.2 * 32767 * math.sin(2 * math.pi * 440 * (i / sample_rate)))
            pcm += int(value).to_bytes(2, byteorder="little", signed=True)
        return bytes(pcm), sample_rate, 1


class SdkTtsClient(TtsClient):
    """
    The client for interacting with the actual Piper TTS engine.
    """
    def synthesize(self, text: str, lang: str) -> Tuple[bytes, int, int]:
        print(f"Synthesizing speech with Piper for text: '{text}' in language: {lang}")
        model_path = os.getenv("PIPER_MODEL_PATH", "")
        if not model_path:
            raise RuntimeError("PIPER_MODEL_PATH not set")
        if not shutil.which("piper"):
            raise RuntimeError("piper CLI not found")
        with tempfile.NamedTemporaryFile(suffix=".wav") as handle:
            cmd = ["piper", "--model", model_path, "--output_file", handle.name]
            subprocess.run(cmd, input=text.encode("utf-8"), check=True)
            return read_wav(handle.name)


def get_tts_client(device_mode: bool) -> TtsClient:
    """
    Factory function to get the appropriate TTS client based on the
    `DEVICE_MODE` environment variable.
    """
    if device_mode:
        return SdkTtsClient()
    return MockTtsClient()
