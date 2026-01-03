import os
import struct
from typing import Tuple


WAV_HEADER_MIN = 44


def is_device_mode() -> bool:
    return os.getenv("DEVICE_MODE", "0") == "1"


def read_wav(path: str) -> Tuple[bytes, int, int]:
    with open(path, "rb") as handle:
        data = handle.read()
    if len(data) < WAV_HEADER_MIN or data[0:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise ValueError("Invalid WAV file")

    offset = 12
    fmt_chunk = None
    data_chunk = None
    while offset + 8 <= len(data):
        chunk_id = data[offset : offset + 4]
        chunk_size = struct.unpack("<I", data[offset + 4 : offset + 8])[0]
        chunk_data = data[offset + 8 : offset + 8 + chunk_size]
        if chunk_id == b"fmt ":
            fmt_chunk = chunk_data
        elif chunk_id == b"data":
            data_chunk = chunk_data
            break
        offset += 8 + chunk_size

    if fmt_chunk is None or data_chunk is None:
        raise ValueError("Missing fmt/data chunk")

    audio_format, channels, sample_rate = struct.unpack("<HHI", fmt_chunk[0:8])
    bits_per_sample = struct.unpack("<H", fmt_chunk[14:16])[0]
    if audio_format != 1 or bits_per_sample != 16:
        raise ValueError("Only 16-bit PCM WAV supported")

    return data_chunk, sample_rate, channels


def write_wav(path: str, pcm: bytes, sample_rate: int, channels: int) -> None:
    bits_per_sample = 16
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    with open(path, "wb") as handle:
        handle.write(header)
        handle.write(pcm)
