from abc import ABC, abstractmethod
from typing import List, Tuple
import time


class HailoVisionClient(ABC):
    @abstractmethod
    def classify_page(self, pixels: bytes, width: int, height: int) -> Tuple[str, float]:
        """
        Classifies the content of a page.

        Returns:
            A tuple containing (classification_label, confidence).
        """
        pass

    @abstractmethod
    def detect_text_regions(self, pixels: bytes, width: int, height: int) -> List[Tuple[int, int, int, int, float]]:
        """
        Detects text regions within an image.

        Returns:
            A list of tuples, each representing a bounding box and confidence
            (x, y, width, height, confidence).
        """
        pass

    @abstractmethod
    def ocr_regions(self, pixels: bytes, width: int, height: int, regions) -> List[Tuple[str, float, Tuple]]:
        """
        Performs OCR on detected regions within an image.

        Returns:
            A list of tuples, each containing (transcribed_text, confidence, region_info).
        """
        pass


class MockHailoVisionClient(HailoVisionClient):
    """
    A mock client that simulates Hailo vision processing for development and testing.
    """
    def classify_page(self, pixels: bytes, width: int, height: int) -> Tuple[str, float]:
        print(f"Mocking page classification for {width}x{height} image.")
        time.sleep(0.1)
        return "text", 0.93

    def detect_text_regions(self, pixels: bytes, width: int, height: int) -> List[Tuple[int, int, int, int, float]]:
        print(f"Mocking text region detection for {width}x{height} image.")
        time.sleep(0.2)
        return [
            (40, 60, 220, 40, 0.82),
            (40, 120, 240, 40, 0.79),
            (40, 180, 200, 40, 0.76),
        ]

    def ocr_regions(self, pixels: bytes, width: int, height: int, regions) -> List[Tuple[str, float, Tuple]]:
        print(f"Mocking OCR for {len(regions)} regions.")
        time.sleep(0.3)
        return [
            ("The sum of angles in a triangle is 180 degrees.", 0.88, regions[0]),
            ("Check work on problem 3, step 2.", 0.62, regions[1]),
            ("Answer: 42", 0.57, regions[2]),
        ]


class SdkHailoVisionClient(HailoVisionClient):
    """
    The client for interacting with the actual Hailo-8L vision SDK.
    NOTE: This is a temporary, functional mock. Replace the logic in each
    method with the actual Hailo SDK implementation.
    """
    def __init__(self):
        # TODO: Initialize HailoRT SDK and load models here.
        print("Initializing SdkHailoVisionClient (Functional Mock)...")
        pass

    def classify_page(self, pixels: bytes, width: int, height: int) -> Tuple[str, float]:
        # TODO: Implement page classification using HailoRT.
        print(f"MOCK-SDK: Simulating page classification for {width}x{height} image.")
        time.sleep(0.1)
        return "text_and_drawing", 0.85

    def detect_text_regions(self, pixels: bytes, width: int, height: int) -> List[Tuple[int, int, int, int, float]]:
        # TODO: Implement text region detection using HailoRT.
        print(f"MOCK-SDK: Simulating text region detection for {width}x{height} image.")
        time.sleep(0.2)
        # Return a more complex layout to simulate a mix of text and drawings
        return [
            (50, 50, 300, 50, 0.92),   # A line of text
            (60, 120, 250, 30, 0.88),  # Another line of text
            (100, 200, 150, 150, 0.75), # A region that could be a drawing
        ]

    def ocr_regions(self, pixels: bytes, width: int, height: int, regions) -> List[Tuple[str, float, Tuple]]:
        # TODO: Implement OCR on regions using HailoRT.
        print(f"MOCK-SDK: Simulating OCR for {len(regions)} regions.")
        time.sleep(0.3)
        # Only return OCR for the top two (text) regions
        return [
            ("How to calculate the area of a circle?", 0.91, regions[0]),
            ("pi * r^2", 0.85, regions[1]),
        ]


def get_hailo_vision_client(device_mode: bool) -> HailoVisionClient:
    """
    Factory function to get the appropriate HailoVision client based on the
    `DEVICE_MODE` environment variable.
    """
    if device_mode:
        return SdkHailoVisionClient()
    return MockHailoVisionClient()
