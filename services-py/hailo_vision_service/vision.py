from typing import List, Tuple

from . import detector, ocr


def classify_page(pixels: bytes, width: int, height: int) -> Tuple[str, float]:
    # TODO: Run lightweight classifier on Hailo.
    raise NotImplementedError("Hailo classification device mode not implemented")


def detect_text_regions(pixels: bytes, width: int, height: int):
    return detector.detect_regions(pixels, width, height)


def ocr_regions(pixels: bytes, width: int, height: int, regions):
    return ocr.run_ocr(pixels, width, height, regions)
