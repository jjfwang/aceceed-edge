# Aceceed Edge

Offline-first "desk tutor" stack for Raspberry Pi 5 (8GB). Camera + audio, local STT/TTS/LLM with optional cloud LLM via API key. Designed for education, privacy, and easy extension.

## Quick Start
1) Install system dependencies (audio, camera, build tools):
   ```bash
   bash scripts/install_system_deps.sh
   ```
1.5) If using the Whisplay LCD, install the driver and reboot:
   ```bash
   bash scripts/install_whisplay.sh
   sudo reboot
   ```
2) Download models (Whisper, Piper, LLaMA):
   ```bash
   bash scripts/setup_models.sh
   ```
   Optional (Chinese TTS voice):
   ```bash
   PIPER_ZH_URL=... PIPER_ZH_CONFIG_URL=... bash scripts/setup_models.sh
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

## Whisplay LCD Quick Test
```bash
echo "Hello Whisplay" | python3 scripts/whisplay_display.py
```
Full vendor test:
```bash
cd /opt/whisplay/example
sudo bash run_test.sh
```

## Key Endpoints
- `POST /v1/ptt/start` + `POST /v1/ptt/stop`
- `POST /v1/camera/capture`
- `GET /v1/events` (WebSocket)

## LLM Backends
- Local llama.cpp: set `llm.mode: local` and `llm.local.backend: "llama.cpp"`, then run `llama-server`.
- LLM-8850 Qwen3: run the vendor LLM-8850 service, then set `llm.mode: local`, `llm.local.backend: "llm8850"`, and configure `llm.local.llm8850.host`.
- Cloud: set `llm.mode: cloud` and `OPENAI_API_KEY` (or custom env key).

## Multilingual Notes
- For Chinese TTS, set `tts.piper.voicePathZh` in `configs/*.yaml` and install `fonts-noto-cjk` for the LCD.

## Docs
See `context.md` and `docs/architecture.md` for the full system overview.
