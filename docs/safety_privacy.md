# Safety and Privacy

## Privacy Principles
- Offline-first by default; no cloud dependency for core features.
- No video storage. Still images are kept in memory or temp files and deleted immediately.
- Audio is stored only as short-lived temp files for STT/TTS.

## Safety Guardrails
- Tutor responses are short, hint-first, and age-appropriate.
- Rule-based filtering blocks unsafe topics for minors.
- When in doubt, the assistant redirects to a safe learning topic.

## Indicators
- Logs announce mic/camera active states.
- GPIO indicators can be added later (placeholder for hardware LED).
