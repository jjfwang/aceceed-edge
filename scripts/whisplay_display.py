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


class DisplayState:
    def __init__(self, text_font: ImageFont.FreeTypeFont, status_font: ImageFont.FreeTypeFont, max_width: int):
        self.text_font = text_font
        self.status_font = status_font
        self.max_width = max_width
        self.text = ""
        self.status: str | None = None
        self.lines: list[str] = []
        self.scroll_offset = 0
        self.line_height = int(text_font.getbbox("Ag")[3] - text_font.getbbox("Ag")[1]) + 6
        self.status_height = int(status_font.getbbox("Ag")[3] - status_font.getbbox("Ag")[1]) + 6
        self.content_height = 0
        self.lock = threading.Lock()
        self.measure_draw = ImageDraw.Draw(Image.new("RGB", (1, 1)))

    def update(self, status: str | None, text: str) -> None:
        text = " ".join(text.split())
        with self.lock:
            self.status = status
            if text != self.text:
                self.text = text
                self.lines = wrap_text(self.measure_draw, text, self.text_font, self.max_width) or [" "]
                self.scroll_offset = 0
                self.content_height = len(self.lines) * self.line_height

    def snapshot(self) -> tuple[str | None, list[str], int, int]:
        with self.lock:
            return self.status, list(self.lines), self.scroll_offset, self.content_height

    def advance_scroll(self, area_height: int, speed_px: int) -> None:
        if self.content_height <= area_height:
            return
        max_scroll = max(0, self.content_height - area_height)
        with self.lock:
            if self.scroll_offset < max_scroll:
                self.scroll_offset = min(max_scroll, self.scroll_offset + speed_px)


def render_frame(
    board: WhisPlayBoard,
    state: DisplayState,
    width: int,
    height: int,
    margin: int,
    text_color: tuple[int, int, int],
    scroll_speed: int,
) -> None:
    status, lines, scroll_offset, content_height = state.snapshot()

    image = Image.new("RGB", (width, height), (0, 0, 0))
    draw = ImageDraw.Draw(image)

    y = margin
    if status:
        bar_height = state.status_height + 10
        bar_top = margin
        bar_bottom = bar_top + bar_height
        draw.rectangle(
            (margin, bar_top, width - margin, bar_bottom),
            outline=(60, 60, 60),
            fill=(0, 0, 0),
        )
        label = {
            "listening": "Listening",
            "processing": "Processing",
            "error": "Error",
        }.get(status.lower(), status.title())
        draw.text((margin + 6, bar_top + 4), label, font=state.status_font, fill=(180, 180, 180))
        dot_count = 3
        dot_radius = 4
        dot_spacing = 8
        dots_width = dot_count * (dot_radius * 2) + (dot_count - 1) * dot_spacing
        start_x = width - margin - dots_width - 6
        center_y = (bar_top + bar_bottom) // 2
        active_index = int(time.time() * 2) % dot_count
        if status.lower() == "listening":
            active_color = (0, 220, 120)
        elif status.lower() == "processing":
            active_color = (255, 200, 60)
        else:
            active_color = (220, 80, 80)
        inactive_color = (70, 70, 70)
        for i in range(dot_count):
            cx = start_x + i * (dot_radius * 2 + dot_spacing) + dot_radius
            color = active_color if i == active_index else inactive_color
            draw.ellipse(
                (cx - dot_radius, center_y - dot_radius, cx + dot_radius, center_y + dot_radius),
                fill=color,
            )
        y = bar_bottom + 6

    area_top = y
    area_height = height - margin - area_top

    for index, line in enumerate(lines):
        line_y = area_top + index * state.line_height - scroll_offset
        if line_y + state.line_height < area_top or line_y > height - margin:
            continue
        draw.text((margin, line_y), line, font=state.text_font, fill=text_color)

    pixel_data = image_to_rgb565(image)
    board.draw_image(0, 0, width, height, pixel_data)

    if content_height > area_height:
        state.advance_scroll(area_height, scroll_speed)


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


def serve_socket(board: WhisPlayBoard, host: str, port: int, state: DisplayState) -> None:
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
                    state.update(status, text)

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
    fps = int(os.getenv("WHISPLAY_FPS", "10") or 10)
    scroll_speed = int(os.getenv("WHISPLAY_SCROLL_SPEED", "2") or 2)
    margin = 12

    board = WhisPlayBoard()
    board.set_backlight(max(0, min(100, brightness)))
    width = board.LCD_WIDTH
    height = board.LCD_HEIGHT
    status_font = load_font(18)
    text_font = load_font(22)
    state = DisplayState(text_font, status_font, width - margin * 2)
    stop_event = threading.Event()

    def handle_exit(*_args) -> None:
        raise SystemExit

    signal.signal(signal.SIGTERM, handle_exit)
    signal.signal(signal.SIGINT, handle_exit)

    def render_loop() -> None:
        while not stop_event.is_set():
            render_frame(
                board,
                state,
                width,
                height,
                margin,
                (255, 255, 255),
                max(1, scroll_speed),
            )
            time.sleep(1.0 / max(1, fps))

    render_thread = threading.Thread(target=render_loop, daemon=True)
    render_thread.start()

    try:
        if socket_mode:
            serve_socket(board, host, port, state)
            return
        if listen_mode:
            for line in sys.stdin:
                status, text = parse_payload(line)
                if status is None and not text:
                    continue
                state.update(status, text)
        else:
            status, text = parse_payload(sys.stdin.read())
            state.update(status, text)
            time.sleep(max(0.2, hold_ms / 1000.0))
    finally:
        stop_event.set()
        safe_cleanup(board)


if __name__ == "__main__":
    main()
