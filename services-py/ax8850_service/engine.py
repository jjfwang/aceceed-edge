from abc import ABC, abstractmethod
from typing import Generator, Tuple
import time


class Ax8850Client(ABC):
    @abstractmethod
    def transcribe_audio(self, pcm_s16le: bytes, sample_rate: int, channels: int) -> Tuple[str, str, float]:
        """
        Transcribes audio using the AX8850 chip.

        Returns:
            A tuple containing (transcript, language, processing_time_ms).
        """
        pass

    @abstractmethod
    def generate_stream(self, prompt: str, max_tokens: int, temperature: float) -> Generator[str, None, None]:
        """
        Generates a stream of text from a prompt using the AX8850 LLM.
        """
        pass


class MockAx8850Client(Ax8850Client):
    """
    A mock client that simulates the behavior of the AX8850 hardware
    for development and testing purposes.
    """

    def transcribe_audio(self, pcm_s16le: bytes, sample_rate: int, channels: int) -> Tuple[str, str, float]:
        print(f"Mocking STT transcription for {len(pcm_s16le)} bytes of audio.")
        time.sleep(0.5)  # Simulate processing time
        return ("This is a mock transcription.", "en", 500.0)

    def generate_stream(self, prompt: str, max_tokens: int, temperature: float) -> Generator[str, None, None]:
        print(f"Mocking LLM stream for prompt: {prompt}")
        mock_response = "This is a mock response from the LLM."
        for word in mock_response.split():
            yield word + " "
            time.sleep(0.1)


class SdkAx8850Client(Ax8850Client):
    """
    The client for interacting with the actual Axera AX8850 SDK.
    This is where the hardware-specific integration code should go.
    """

    def __init__(self):
        # TODO: Initialize the Axera AXCL SDK here.
        # This might involve loading models, connecting to the device, etc.
        # Example: self.stt_model = axera.stt.load("model.bin")
        print("Initializing SdkAx8850Client...")
        pass

    def transcribe_audio(self, pcm_s16le: bytes, sample_rate: int, channels: int) -> Tuple[str, str, float]:
        """
        TODO: Implement audio transcription using the Axera AXCL SDK.
        This will involve passing the raw PCM audio data to the SDK's
        inference function and returning the transcribed text.
        """
        raise NotImplementedError("AX8850 STT device mode not implemented")

    def generate_stream(self, prompt: str, max_tokens: int, temperature: float) -> Generator[str, None, None]:
        """
        TODO: Implement LLM stream generation using the Axera AXCL SDK.
        This will involve sending the prompt to the LLM and yielding
        the generated tokens as they become available.
        """
        raise NotImplementedError("AX8850 LLM device mode not implemented")


def get_ax8850_client(device_mode: bool) -> Ax8850Client:
    """
    Factory function to get the appropriate AX8850 client based on the
    `DEVICE_MODE` environment variable.
    """
    if device_mode:
        return SdkAx8850Client()
    return MockAx8850Client()

