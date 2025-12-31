#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f /proc/device-tree/model ]]; then
  echo "Error: /proc/device-tree/model not found. Are you on a Raspberry Pi?" >&2
  exit 1
fi

model="$(tr -d '\0' </proc/device-tree/model)"
if [[ "${model}" != Raspberry* ]]; then
  echo "Error: This script is intended for Raspberry Pi. Detected: ${model}" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y git
fi

if ! command -v unzip >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y unzip
fi

if ! command -v i2cdetect >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y i2c-tools
fi

if ! command -v raspi-config >/dev/null 2>&1; then
  echo "Error: raspi-config is required to enable SPI. Install it and re-run." >&2
  exit 1
fi

WHISPLAY_DIR="${WHISPLAY_DIR:-/opt/whisplay}"

if [[ -d "${WHISPLAY_DIR}/.git" ]]; then
  sudo git -C "${WHISPLAY_DIR}" pull --ff-only
elif [[ -d "${WHISPLAY_DIR}" ]]; then
  echo "Error: ${WHISPLAY_DIR} exists but is not a git repo. Set WHISPLAY_DIR to an empty path." >&2
  exit 1
else
  sudo git clone https://github.com/PiSugar/Whisplay.git "${WHISPLAY_DIR}"
fi

sudo bash "${WHISPLAY_DIR}/Driver/install_wm8960_drive.sh"

echo "Whisplay driver installed. Reboot required."
