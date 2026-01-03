# Local Multimodal Assistant (Pi 5 + AX8850 + Hailo-8L)

Offline-first assistant for Raspberry Pi 5 (8GB) with PTT-only interaction, local STT/LLM on AX8850, vision on Hailo-8L, Pi Camera input, and Piper TTS. It now aligns tutor responses to the Singapore MOE syllabus (Primary/Secondary/JC) and past papers via a local RAG index and can fold OCR from worksheets into prompts. The repository runs in mock mode without hardware SDKs and is structured for drop-in device integrations. During early bring-up you can point cloud mode at GPT-4o; the default goal is to flip to local accelerators (LLM-8850 + Hailo) once configured.

## Architecture
- TypeScript Node.js orchestrator (`apps`) with RAG + OCR prompt grounding
- Python gRPC services for AX8850, Hailo vision, camera, and TTS (consolidated into `engine.py` files)
- gRPC IPC with `proto/assistant.proto`
- systemd unit files + install scripts

## Mock Mode (any Linux)
1) Generate gRPC stubs:
```bash
make proto
```
2) Install dependencies:
```bash
make install
```
3) Run the mock stack (PTT via ENTER):
```bash
./deploy/scripts/run_mock.sh
```

## Device Mode (Raspberry Pi)
1) Install SDKs (placeholders):
- Axera AXCL + LLM-8850 toolchain
- HailoRT + vision models
- Pi Camera stack (`libcamera`, `picamera2`)
- Piper + voice models

2) Set environment:
```bash
export DEVICE_MODE=1
export PIPER_MODEL_PATH=/path/to/voice.onnx
```

3) Install systemd services:
```bash
sudo ./deploy/scripts/install_systemd.sh
```

## Expected Flow
- Press PTT → record audio
- AX8850 STT transcribes
- Route to vision pipeline if intent matches ("read this", "check my work", etc.)
- Hailo detects text regions + OCR (or mock text when OCR service is disabled)
- RAG pulls MOE syllabus and past-paper snippets by grade band/subject, and the prompt is built from system prompts + OCR + RAG context
- AX8850 LLM streams answer
- Piper TTS speaks response

## Development Notes
- Mock mode uses `services-py/camera_service/assets/sample.jpg`.
- Device-mode SDK integrations live behind TODOs in each service's `engine.py` file.
- Health checks are available via `deploy/scripts/healthcheck.sh`.

## Commands
- `make proto` generate gRPC stubs for TS/Python
- `make install` install Node + Python deps
- `make run-mock` run full mock stack
- `make run-device` run stack in device mode
- `pnpm lint` run linter
- `pnpm format` format code
- `pnpm test` run tests

## Configuration highlights
- Config file: `configs/config.yaml` (override path with `ACECEED_CONFIG`).
- `rag.*`: enable/disable MOE syllabus + past-paper RAG, pick grade band (`primary|secondary|jc`), subjects, sourceTypes (e.g., `syllabus`, `past-paper`), and index path (default sample: `docs/rag/moe_samples.json`).
- `runtime.vision.triggerKeywords`: keywords that trigger worksheet capture + OCR; set `runtime.vision.alwaysCapture` to force capture every turn.
- `vision.ocr`: enable/disable OCR and set `serviceUrl` (HTTP that accepts JPEG bytes) or `mockText` for offline development.
