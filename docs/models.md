# Models

## Whisper.cpp (STT)
- Model files under `/opt/models/whisper/` (default download: `ggml-medium.bin`).
- Configure in `configs/*.yaml` `stt.whispercpp.modelPath`
- Set `stt.whispercpp.language: "auto"` to enable multilingual transcription (requires non-`.en` models).

## Piper (TTS)
- Voice models under `/opt/models/piper/`
- Configure in `configs/*.yaml` `tts.piper.voicePath`
- For Chinese output, download a Chinese voice and set `tts.piper.voicePathZh` (and optional `outputSampleRateZh`).
- `scripts/setup_models.sh` supports optional Chinese voice downloads via:
  - `PIPER_ZH_URL=...`
  - `PIPER_ZH_CONFIG_URL=...`
- For multiple languages, configure `tts.piper.voiceByLang` with language keys like `en`, `zh`, `ja`, `ko`.

## Llama.cpp (LLM)
- GGUF models under `/opt/models/llama/` (directory name is historical; it can store Qwen3, Llama, etc.)
- Configure in `configs/*.yaml` `llm.local.modelPath`
- Start llama-server with Qwen3 1.7B:
  - `/usr/local/bin/llama-server -m /opt/models/llama/qwen3-1.7b-q8_0.gguf -c 2048`
- Example for Llama 3 instead:
  - `/usr/local/bin/llama-server -m /opt/models/llama/llama-3.gguf -c 2048`
- Optional (systemd) example:
  - `sudo /usr/local/bin/llama-server -m /opt/models/llama/qwen3-1.7b-q8_0.gguf -c 2048 --host 127.0.0.1 --port 8080`

## LLM-8850 Qwen3 (LLM)
- The LLM-8850 runtime is a separate service that hosts the Qwen3 model locally.
- This repo does not download that model. Use the vendor install steps to download and register the model with the LLM-8850 service.
- Start the LLM-8850 service (systemd is common; service names vary by installer):
  - `systemctl list-units --type=service | grep -i 'llm\\|qwen\\|8850'`
  - `sudo systemctl enable --now <service-name>`
  - `sudo systemctl status <service-name>`
- Quick API check:
  - `curl -s http://127.0.0.1:8000/api/generate_provider`
- Configure in `configs/*.yaml`:
  - `llm.local.backend: "llm8850"`
  - `llm.local.llm8850.host: "http://127.0.0.1:8000"`
- If the LLM-8850 service uses port 8000, move the runtime API port (e.g. `api.port: 8001`) to avoid conflicts.
