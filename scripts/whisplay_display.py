#!/usr/bin/env python3
import json
import os
import signal
import socket
import sys
import threading
import time

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

try:
    import RPi.GPIO as GPIO

    if hasattr(GPIO, "PWM") and hasattr(GPIO.PWM, "__del__"):
        GPIO.PWM.__del__ = lambda self: None  # type: ignore[method-assign]

    skip_button = os.getenv("WHISPLAY_SKIP_BUTTON", "1").lower() in ("1", "true", "yes")
    button_pin = getattr(WhisPlayBoard, "BUTTON_PIN", None)
    if skip_button and button_pin is not None:
        original_setup = GPIO.setup
        original_add_event = getattr(GPIO, "add_event_detect", None)

        def setup(channel, *args, **kwargs):
            if isinstance(channel, (list, tuple)):
                filtered = [pin for pin in channel if pin != button_pin]
                if not filtered:
                    return None
                return original_setup(filtered, *args, **kwargs)
            if channel == button_pin:
                return None
            return original_setup(channel, *args, **kwargs)

        def add_event_detect(channel, *args, **kwargs):
            if channel == button_pin:
                return None
            if original_add_event:
                return original_add_event(channel, *args, **kwargs)
            return None

        GPIO.setup = setup  # type: ignore[assignment]
        if original_add_event:
            GPIO.add_event_detect = add_event_detect  # type: ignore[assignment]
except Exception:
    pass


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


def render_status_text(board: WhisPlayBoard, status: str | None, text: str) -> None:
    if not text:
        text = " "

    width = board.LCD_WIDTH
    height = board.LCD_HEIGHT
    margin = 12

    image = Image.new("RGB", (width, height), (0, 0, 0))
    draw = ImageDraw.Draw(image)
    font = load_font(18)

    y = margin
    if status:
        status_font = load_font(16)
        draw.text((margin, y), status, font=status_font, fill=(180, 180, 180))
        status_height = int(status_font.getbbox("Ag")[3] - status_font.getbbox("Ag")[1]) + 6
        y += status_height

    max_width = width - margin * 2
    lines = wrap_text(draw, " ".join(text.split()), font, max_width)
    line_height = int(font.getbbox("Ag")[3] - font.getbbox("Ag")[1]) + 6

    for line in lines:
        if y + line_height > height - margin:
            break
        draw.text((margin, y), line, font=font, fill=(255, 255, 255))
        y += line_height

    pixel_data = image_to_rgb565(image)
    board.draw_image(0, 0, width, height, pixel_data)


def parse_payload(raw: str) -> tuple[str | None, str]:
    stripped = raw.strip()
    if not stripped:
        return (None, "")
    try:
        payload = json.loads(stripped)
        if isinstance(payload, dict):
            status = payload.get("status")
            text = payload.get("text", "")
            return (status if isinstance(status, str) else None, str(text))
    except json.JSONDecodeError:
        pass
    return (None, stripped)


def safe_cleanup(board: WhisPlayBoard) -> None:
    for attr in ("backlight_pwm", "red_pwm", "green_pwm", "blue_pwm"):
        pwm = getattr(board, attr, None)
        if pwm is not None:
            try:
                pwm.stop()
            except Exception:
                pass
            setattr(board, attr, None)
    try:
        board.spi.close()
    except Exception:
        pass


def serve_socket(board: WhisPlayBoard, host: str, port: int) -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((host, port))
    server.listen(5)
    print(f"[Whisplay] Listening on {host}:{port}")

    def handle_client(conn: socket.socket) -> None:
        buffer = ""
        with conn:
            while True:
                data = conn.recv(4096)
                if not data:
                    break
                buffer += data.decode("utf-8")
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    status, text = parse_payload(line)
                    if status is None and not text:
                        continue
                    render_status_text(board, status, text)

    try:
        while True:
            conn, _addr = server.accept()
            thread = threading.Thread(target=handle_client, args=(conn,), daemon=True)
            thread.start()
    finally:
        server.close()


def main() -> None:
    listen_mode = os.getenv("WHISPLAY_LISTEN", "0").lower() in ("1", "true", "yes")
    socket_mode = os.getenv("WHISPLAY_SOCKET", "0").lower() in ("1", "true", "yes")
    host = os.getenv("WHISPLAY_HOST", "127.0.0.1")
    port = int(os.getenv("WHISPLAY_PORT", "12345") or 12345)
    hold_ms = int(os.getenv("WHISPLAY_HOLD_MS", "0") or 0)
    brightness = int(os.getenv("WHISPLAY_BRIGHTNESS", "60") or 60)

    board = WhisPlayBoard()
    board.set_backlight(max(0, min(100, brightness)))

    def handle_exit(*_args) -> None:
        raise SystemExit

    signal.signal(signal.SIGTERM, handle_exit)
    signal.signal(signal.SIGINT, handle_exit)

    try:
        if socket_mode:
            serve_socket(board, host, port)
            return
        if listen_mode:
            for line in sys.stdin:
                status, text = parse_payload(line)
                if status is None and not text:
                    continue
                render_status_text(board, status, text)
        else:
            status, text = parse_payload(sys.stdin.read())
            render_status_text(board, status, text)
            if hold_ms > 0:
                time.sleep(hold_ms / 1000.0)
    finally:
        safe_cleanup(board)


if __name__ == "__main__":
    main()
