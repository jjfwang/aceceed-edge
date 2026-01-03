# Aceceed Edge Context

## Purpose and Scope
Aceceed Edge is an offline-first desk tutor for Raspberry Pi 5. It provides camera + audio perception, local STT/TTS/LLM by default, and an optional cloud LLM backend when an API key is provided. Core operation does not require network access.

## Architecture (High Level)
```
+-------------------------------+        +-------------------------+
|         Device Runtime        |        |   Local/Cloud LLMs       |
|  (apps/edge-runtime)          |        |                         |
|                               |        |  - llama.cpp (local)    |
|  +-------------------------+  |        |  - OpenAI-compatible    |
|  | Perception              |  |        +-------------------------+
|  | - audio input/output    |  |
|  | - STT (whisper.cpp)     |  |        +-------------------------+
|  | - TTS (piper)           |  |<------>|  Config + Prompts       |
|  | - vision capture        |  |        +-------------------------+
|  +-------------------------+  |
|             |                 |
|             v                 |
|  +-------------------------+  |
|  | Intelligence            |  |
|  | - agents (tutor/coach)  |  |
|  | - RAG (MOE syllabus)    |  |
|  | - safety guard          |  |
|  +-------------------------+  |
|             |                 |
|             v                 |
|  +-------------------------+  |
|  | API + Event Bus         |  |
|  | - Fastify + WS          |  |
|  +-------------------------+  |
+-------------------------------+
```

## Repo Map
- `apps/edge-runtime`: main runtime (Fastify, orchestration, agents, backends)
- `apps/edge-runtime/src/rag`: lightweight local retriever for MOE syllabus snippets
- `packages/shared`: shared TS types + config schema
- `configs/`: YAML configs and systemd service
- `scripts/`: install/setup/run helpers
- `docs/`: architecture, hardware, safety, models, references
- `tests/`: vitest suites

## Run (Dev/Prod)
- Dev (keyboard PTT): `pnpm -C apps/edge-runtime dev` (cloud mode defaults to GPT-4o; switch to local once accelerators are set)
- Prod: `pnpm -C apps/edge-runtime build` then `pnpm -C apps/edge-runtime start`
- Systemd: copy `configs/systemd/aceceed-edge.service` to `/etc/systemd/system/`
- Local LLM: start llama-server or LLM-8850 service separately (see `docs/models.md`)

## Curriculum + Vision Grounding
- `rag` config sets grade band (Primary/Secondary/JC), subjects, source types (syllabus, past papers), and index path (sample MOE+past-paper snippets in `docs/rag/moe_samples.json`).
- TutorAgent injects RAG snippets and OCR text from the camera into the LLM prompt to stay aligned to the syllabus, past-paper style answers, and the student’s current work.
- `runtime.vision.triggerKeywords` controls when captures occur; `vision.ocr` can point to a service URL or return `mockText` in dev.

## Add a New Agent
1. Create a new agent in `apps/edge-runtime/src/agents/` implementing `Agent`.
2. Register it in `apps/edge-runtime/src/main.ts` and enable via `runtime.agents.enabled` in config.
3. Keep responses short and pass through the safety guard if needed.

## Add a New Backend
- LLM: implement `LlmClient` in `apps/edge-runtime/src/llm/`.
- STT/TTS: implement `SttProvider` or `TtsProvider` in `apps/edge-runtime/src/audio/`.
- Vision detector: implement `VisionDetector` in `apps/edge-runtime/src/vision/detectors/`.
- Update config schema/types in `packages/shared` and wire in `main.ts`.

## Config Conventions and Env Rules
- YAML configs in `configs/` are the source of truth.
- Enable agents with `runtime.agents.enabled` (e.g., `["tutor"]`).
- Env overrides:
  - `ACECEED_CONFIG` (config file path)
  - `ACECEED_LLM_MODE`, `ACECEED_LLAMA_SERVER_URL`, `ACECEED_LLAMA_MODEL_PATH`
  - `ACECEED_LLM_LOCAL_BACKEND`, `ACECEED_LLM8850_HOST`
  - `ACECEED_STT_BIN`, `ACECEED_STT_MODEL`, `ACECEED_STT_LANGUAGE`
  - `ACECEED_TTS_BIN`, `ACECEED_TTS_VOICE`
  - `ACECEED_VISION_BACKEND`, `ACECEED_API_PORT`, `ACECEED_AUDIO_DEVICE`
  - `OPENAI_API_KEY` (or custom env name from config)

## Code Conventions
- TypeScript ESM, strict type checking.
- Fastify + WebSocket for API and event stream.
- Pino for structured logging.
- Subprocess boundaries for whisper.cpp, piper, and llama.cpp.
- Fail fast on missing binaries/models with actionable errors.

## Performance Notes (Pi)
- Keep audio buffer size modest; record short clips.
- Use `llama-server` to avoid repeated model load.
- Backpressure: avoid concurrent PTT runs.
- Vision capture uses a single still frame; no video storage.

## Definition of Done Checklist
- [ ] PTT flow works (STT -> LLM -> safety -> TTS).
- [ ] Vision capture returns a valid still and detector result.
- [ ] Local LLM works offline (llama.cpp).
- [ ] Cloud LLM works with API key.
- [ ] No video storage; temp files removed.
- [ ] systemd unit configured for boot.
- [ ] Docs updated (safety, models, architecture, references).
