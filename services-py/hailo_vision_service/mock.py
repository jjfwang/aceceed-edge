from typing import List, Tuple


def mock_classify_page(pixels: bytes, width: int, height: int) -> Tuple[str, float]:
    return "text", 0.93


def mock_detect_text_regions(pixels: bytes, width: int, height: int):
    return [
        (40, 60, 220, 40, 0.82),
        (40, 120, 240, 40, 0.79),
        (40, 180, 200, 40, 0.76),
    ]


def mock_ocr(pixels: bytes, width: int, height: int, regions):
    return [
        ("The sum of angles in a triangle is 180 degrees.", 0.88, regions[0]),
        ("Check work on problem 3, step 2.", 0.62, regions[1]),
        ("Answer: 42", 0.57, regions[2]),
    ]
