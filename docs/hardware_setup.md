# Hardware Setup (Raspberry Pi 5)

## Recommended
- Raspberry Pi 5 (8GB)
- Raspberry Pi Camera Module 3
- MHS-3.5inch touchscreen display
- KAYSHUDA USB speakerphone

## Camera
- Enable camera in `raspi-config`.
- Verify: `rpicam-still --version`.

## Audio
- List devices: `arecord -l` and `aplay -l`.
- Update `configs/config.yaml` `audio.input.device` and `audio.output.device`.
- Quick test: `arecord -D plughw:CARD=KAYSHUDA,DEV=0 -d 5 /tmp/test.wav && aplay -D plughw:CARD=KAYSHUDA,DEV=0 /tmp/test.wav`.

## MHS-3.5inch Touchscreen Display
- Install the MHS driver stack per the vendor instructions (often via `LCD-show`), then reboot.
- Calibrate the touchscreen if needed (e.g., `xinput_calibrator`).
- Set `runtime.pushToTalkMode` to `api` and configure `runtime.ui.mode` (`hold` or `toggle`).
- Launch the UI on the display in kiosk mode: `chromium-browser --kiosk --app=http://localhost:8000/ui`.
- The on-screen PTT button is the primary input; the UI streams transcript and response text live.

## KAYSHUDA Speakerphone
- Plug the speakerphone in via USB, then locate its ALSA card name with `arecord -l` and `aplay -l`.
- Set `audio.input.device` and `audio.output.device` to the KAYSHUDA card (example: `plughw:CARD=KAYSHUDA,DEV=0`).

## LLM-8850 M.2 HAT
- Start the LLM-8850 Qwen3 service, then set `llm.local.backend: "llm8850"` and `llm.local.llm8850.host`.
- If the LLM-8850 service binds to port 8000, change `api.port` for the runtime.
- Use your installer docs to download the model to the LLM-8850 runtime; the runtime calls its local HTTP API.

## Performance Tips
- Use a heatsink/fan on Pi 5.
- Prefer a lightweight GGUF model for llama.cpp.
