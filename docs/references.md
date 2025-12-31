# References

## whisplay-ai-chatbot Patterns Adopted
- Audio capture loop: short PCM capture, then STT, then response playback.
- Event orchestration: simple event bus coordinating PTT and response flow.
- Service separation: keep audio, vision, and LLM behind clean interfaces.

## Improvements Made
- Config-driven backend switching for LLM/STT/TTS/vision.
- Stronger separation between perception, intelligence, and runtime layers.
- Safety agent gate for kid-safe, hint-first tutoring.
- Clear IPC boundaries for Python/CLI tools and future plugins.
