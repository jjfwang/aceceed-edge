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

## Whisplay HAT (WM8960)
- Install the Whisplay driver: `bash scripts/install_whisplay.sh` (reboot required).
- After reboot, `aplay -l` should show `wm8960soundcard`; `default` is remapped to it.
- Set `audio.input.device` and `audio.output.device` to `default` or `hw:wm8960soundcard`.
- Mic/speaker quick test: `arecord -D default -d 5 /tmp/test.wav && aplay -D default /tmp/test.wav`.
- For the LCD display, `python3-pil`, `python3-rpi.gpio`, and `python3-spidev` must be installed.

## Whisplay Button PTT
- Set `runtime.pushToTalkMode` to `whisplay` in `configs/*.yaml`.
- Optional: `runtime.whisplay.mode` (`hold` or `toggle`) and `runtime.whisplay.buttonPin` (BOARD numbering).
- The runtime listens directly to GPIO (via `gpiomon` if available, otherwise `onoff`).
- On Raspberry Pi OS, you may need to run the runtime as root or grant GPIO access for the service user.
## Whisplay Display
- The runtime will render `agent:response` text on the Whisplay LCD when PTT mode is `whisplay`.

## Performance Tips
- Use a heatsink/fan on Pi 5.
- Prefer a lightweight GGUF model for llama.cpp.
