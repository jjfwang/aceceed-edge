# Hardware Setup (Raspberry Pi 5)

## Recommended
- Raspberry Pi 5 (8GB)
- Raspberry Pi Camera Module 3
- USB microphone or I2S mic HAT
- Powered speaker or USB audio output

## Camera
- Enable camera in `raspi-config`.
- Verify: `rpicam-still --version`.

## Audio
- List devices: `arecord -l` and `aplay -l`.
- Update `configs/*.yaml` `audio.input.device` and `audio.output.device`.

## Performance Tips
- Use a heatsink/fan on Pi 5.
- Prefer a lightweight GGUF model for llama.cpp.
