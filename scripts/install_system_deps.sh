#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y \
  build-essential cmake git pkg-config \
  libopenblas-dev libssl-dev libasound2-dev libgpiod-dev libgpiod-tools \
  sox curl wget

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

sudo apt-get install -y rpicam-apps libcamera-apps

echo "Installing whisper.cpp..."
if [ ! -d /opt/whisper.cpp ]; then
  sudo git clone https://github.com/ggerganov/whisper.cpp /opt/whisper.cpp
fi
sudo make -C /opt/whisper.cpp
sudo ln -sf /opt/whisper.cpp/main /usr/local/bin/whisper-cpp-main

echo "Installing llama.cpp..."
if [ ! -d /opt/llama.cpp ]; then
  sudo git clone https://github.com/ggerganov/llama.cpp /opt/llama.cpp
fi
sudo make -C /opt/llama.cpp llama-server
sudo ln -sf /opt/llama.cpp/llama-server /usr/local/bin/llama-server

echo "Installing Piper (TTS)..."
if [ ! -d /opt/piper ]; then
  sudo git clone https://github.com/rhasspy/piper /opt/piper
fi
sudo make -C /opt/piper
sudo ln -sf /opt/piper/piper /usr/bin/piper

echo "System dependencies installed. Use scripts/setup_models.sh to download models."
