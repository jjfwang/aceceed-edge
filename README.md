# Aceceed Edge

Offline-first "desk tutor" stack for Raspberry Pi 5 (8GB). Camera + audio, local STT/TTS/LLM with optional cloud LLM via API key. Designed for education, privacy, and easy extension.

## Quick Start
1) Install system dependencies (audio, camera, build tools):
   ```bash
   bash scripts/install_system_deps.sh
   ```
2) Download models (Whisper, Piper, LLaMA):
   ```bash
   bash scripts/setup_models.sh
   ```
3) Install JS dependencies (workspace):
   ```bash
   pnpm install
   ```
4) Run the runtime in development mode (keyboard PTT):
   ```bash
   pnpm -C apps/edge-runtime dev
   ```
5) Build + run in production mode (API PTT):
   ```bash
   pnpm -C apps/edge-runtime build
   pnpm -C apps/edge-runtime start
   ```
6) (Optional) Run tests with coverage thresholds (80%):
   ```bash
   pnpm -C apps/edge-runtime test -- --coverage
   ```

## Key Endpoints
- `POST /v1/ptt/start` + `POST /v1/ptt/stop`
- `POST /v1/camera/capture`
- `GET /v1/events` (WebSocket)

## Offline/Cloud LLM
Set `llm.mode` in `configs/*.yaml` to `local` or `cloud`. For cloud, set `OPENAI_API_KEY` (or custom env key).

## Docs
See `context.md` and `docs/architecture.md` for the full system overview.
