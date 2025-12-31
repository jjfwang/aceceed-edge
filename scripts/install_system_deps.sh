#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y \
  build-essential cmake git pkg-config \
  libopenblas-dev libssl-dev libasound2-dev libgpiod-dev gpiod libcurl4-openssl-dev \
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
sudo cmake -S /opt/whisper.cpp -B /opt/whisper.cpp/build -DCMAKE_BUILD_TYPE=Release
sudo cmake --build /opt/whisper.cpp/build --config Release
WHISPER_BIN="/opt/whisper.cpp/build/bin/main"
if [ ! -x "${WHISPER_BIN}" ] && [ -x "/opt/whisper.cpp/build/main" ]; then
  WHISPER_BIN="/opt/whisper.cpp/build/main"
elif [ ! -x "${WHISPER_BIN}" ] && [ -x "/opt/whisper.cpp/main" ]; then
  WHISPER_BIN="/opt/whisper.cpp/main"
fi
sudo ln -sf "${WHISPER_BIN}" /usr/local/bin/whisper-cpp-main

echo "Installing llama.cpp..."
if [ ! -d /opt/llama.cpp ]; then
  sudo git clone https://github.com/ggerganov/llama.cpp /opt/llama.cpp
fi
sudo cmake -S /opt/llama.cpp -B /opt/llama.cpp/build -DCMAKE_BUILD_TYPE=Release
sudo cmake --build /opt/llama.cpp/build --config Release --target llama-server
LLAMA_SERVER="/opt/llama.cpp/build/bin/llama-server"
if [ ! -x "${LLAMA_SERVER}" ] && [ -x "/opt/llama.cpp/build/llama-server" ]; then
  LLAMA_SERVER="/opt/llama.cpp/build/llama-server"
elif [ ! -x "${LLAMA_SERVER}" ] && [ -x "/opt/llama.cpp/llama-server" ]; then
  LLAMA_SERVER="/opt/llama.cpp/llama-server"
fi
sudo ln -sf "${LLAMA_SERVER}" /usr/local/bin/llama-server

echo "Installing Piper (TTS)..."
if [ ! -d /opt/piper ]; then
  sudo git clone https://github.com/rhasspy/piper /opt/piper
fi
sudo cmake -S /opt/piper -B /opt/piper/build -DCMAKE_BUILD_TYPE=Release
sudo cmake --build /opt/piper/build --config Release --target piper
PIPER_BIN="/opt/piper/build/piper"
if [ ! -x "${PIPER_BIN}" ] && [ -x "/opt/piper/piper" ]; then
  PIPER_BIN="/opt/piper/piper"
fi
sudo ln -sf "${PIPER_BIN}" /usr/bin/piper

echo "System dependencies installed. Use scripts/setup_models.sh to download models."
