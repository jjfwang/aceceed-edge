# Aceceed Edge

Offline-first "desk tutor" stack for Raspberry Pi 5 (8GB). Camera + audio, local STT/TTS/LLM with optional cloud LLM via API key. Designed for education, privacy, and easy extension.

## Quick Start (Pi)
1. Install system deps:
   - `bash scripts/install_system_deps.sh`
2. Download models:
   - `bash scripts/setup_models.sh`
3. Install JS deps:
   - `pnpm install`
4. Run dev:
   - `pnpm -C apps/edge-runtime dev`

## Key Endpoints
- `POST /v1/ptt/start` + `POST /v1/ptt/stop`
- `POST /v1/camera/capture`
- `GET /v1/events` (WebSocket)

## Offline/Cloud LLM
Set `llm.mode` in `configs/*.yaml` to `local` or `cloud`. For cloud, set `OPENAI_API_KEY` (or custom env key).

## Docs
See `context.md` and `docs/architecture.md` for the full system overview.
