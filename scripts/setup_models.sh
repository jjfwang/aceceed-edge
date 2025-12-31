#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p /opt/models/whisper /opt/models/piper /opt/models/llama

echo "Downloading models to /opt/models/..."

WHISPER_URL="${WHISPER_URL:-https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin}"
PIPER_URL="${PIPER_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx}"
LLAMA_URL="${LLAMA_URL:-https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf}"

download() {
  local url="$1"
  local dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -L --fail -o "$dest" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$dest" "$url"
  else
    echo "Error: need curl or wget to download models." >&2
    exit 1
  fi
}

download "$WHISPER_URL" "/opt/models/whisper/ggml-base.en.bin"
download "$PIPER_URL" "/opt/models/piper/en_US-amy-medium.onnx"
download "$LLAMA_URL" "/opt/models/llama/llama-3.gguf"

echo "Downloaded models:"
echo "  /opt/models/whisper/ggml-base.en.bin"
echo "  /opt/models/piper/en_US-amy-medium.onnx"
echo "  /opt/models/llama/llama-3.gguf"
echo "Update configs/*.yaml paths if you use different filenames."
