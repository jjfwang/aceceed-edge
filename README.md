# Local Multimodal Assistant (Pi 5 + AX8850 + Hailo-8L)

Offline-first assistant for Raspberry Pi 5 (8GB) with PTT-only interaction, local STT/LLM on AX8850, vision on Hailo-8L, Pi Camera input, and Piper TTS. The repository runs in mock mode without hardware SDKs and is structured for drop-in device integrations.

## Architecture
- TypeScript Node.js orchestrator (`apps/edge-runtime`)
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
- Hailo detects text regions + OCR
- Prompt is built from system prompts + OCR context
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
