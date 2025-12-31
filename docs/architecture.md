# Architecture

## Layers
- Perception: audio I/O, STT, TTS, vision capture, optional detectors.
- Intelligence: LLM client, agents, safety guardrails.
- Runtime: event bus, orchestration, API server.

## Runtime Flow
1. Push-to-talk start (keyboard or API).
2. Record audio clip (no storage beyond temp file).
3. STT via whisper.cpp.
4. Tutor agent calls LLM (local or cloud) for hint response.
5. Safety agent trims/refuses if needed.
6. TTS via Piper and playback.

## IPC Boundaries
- whisper.cpp, piper, llama.cpp executed via subprocess.
- Vision capture runs via `rpicam-still` or `libcamera-still` subprocess.
- Optional camera-service can be added for Picamera2.

## Error Handling
- Missing binaries/models log actionable errors.
- Fail-fast on config validation errors.
- PTT flow prevents concurrent runs.

## TODO (Future)
- Hailo detector integration with real pipeline.
- Continuous vision loop with backpressure.
- OCR pipeline for worksheet reading.
