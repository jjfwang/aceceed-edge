#!/usr/bin/env python3
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow not installed. Install python3-pil.", file=sys.stderr)
    sys.exit(1)

driver_paths = [
    "/opt/whisplay/Driver",
    os.path.join(os.path.dirname(__file__), "..", "Driver"),
]

for path in driver_paths:
    if os.path.isdir(path):
        sys.path.append(path)
        break

try:
    from WhisPlay import WhisPlayBoard
except Exception as exc:
    print(f"Failed to import WhisPlayBoard: {exc}", file=sys.stderr)
    sys.exit(1)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size)
            except Exception:
                continue
    return ImageFont.load_default()


def measure_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    if hasattr(draw, "textlength"):
        return int(draw.textlength(text, font=font))
    bbox = draw.textbbox((0, 0), text, font=font)
    return int(bbox[2] - bbox[0])


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if measure_text(draw, candidate, font) <= max_width:
            line = candidate
            continue
        if line:
            lines.append(line)
        if measure_text(draw, word, font) <= max_width:
            line = word
            continue
        # Break long words by character.
        chunk = ""
        for ch in word:
            candidate = f"{chunk}{ch}"
            if measure_text(draw, candidate, font) <= max_width:
                chunk = candidate
            else:
                if chunk:
                    lines.append(chunk)
                chunk = ch
        line = chunk
    if line:
        lines.append(line)
    return lines


def image_to_rgb565(img: Image.Image) -> list[int]:
    pixels = img.load()
    width, height = img.size
    data: list[int] = []
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
            data.append((rgb565 >> 8) & 0xFF)
            data.append(rgb565 & 0xFF)
    return data


def main() -> None:
    text = sys.stdin.read().strip()
    if not text:
        text = " "

    board = WhisPlayBoard()
    board.set_backlight(60)

    width = board.LCD_WIDTH
    height = board.LCD_HEIGHT
    margin = 12

    image = Image.new("RGB", (width, height), (0, 0, 0))
    draw = ImageDraw.Draw(image)
    font = load_font(18)

    max_width = width - margin * 2
    lines = wrap_text(draw, " ".join(text.split()), font, max_width)
    line_height = int(font.getbbox("Ag")[3] - font.getbbox("Ag")[1]) + 6

    y = margin
    for line in lines:
        if y + line_height > height - margin:
            break
        draw.text((margin, y), line, font=font, fill=(255, 255, 255))
        y += line_height

    pixel_data = image_to_rgb565(image)
    board.draw_image(0, 0, width, height, pixel_data)
    board.cleanup()


if __name__ == "__main__":
    main()
