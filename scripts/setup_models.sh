#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p /opt/models/whisper /opt/models/piper /opt/models/llama

echo "Downloading models to /opt/models/..."

WHISPER_URL="${WHISPER_URL:-https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin}"
PIPER_URL="${PIPER_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx}"
PIPER_CONFIG_URL="${PIPER_CONFIG_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json}"
LLAMA_URL="${LLAMA_URL:-https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf}"

download() {
  local url="$1"
  local dest="$2"
  local dest_dir
  dest_dir="$(dirname "$dest")"
  local use_sudo=""
  if [[ ! -w "$dest_dir" ]]; then
    use_sudo="sudo"
  fi
  if command -v curl >/dev/null 2>&1; then
    $use_sudo curl -L --fail -o "$dest" "$url"
  elif command -v wget >/dev/null 2>&1; then
    $use_sudo wget -O "$dest" "$url"
  else
    echo "Error: need curl or wget to download models." >&2
    exit 1
  fi
}

download "$WHISPER_URL" "/opt/models/whisper/ggml-base.bin"
download "$PIPER_URL" "/opt/models/piper/en_US-amy-medium.onnx"
download "$PIPER_CONFIG_URL" "/opt/models/piper/en_US-amy-medium.onnx.json"
download "$LLAMA_URL" "/opt/models/llama/llama-3.gguf"

echo "Downloaded models:"
echo "  /opt/models/whisper/ggml-base.bin"
echo "  /opt/models/piper/en_US-amy-medium.onnx"
echo "  /opt/models/piper/en_US-amy-medium.onnx.json"
echo "  /opt/models/llama/llama-3.gguf"
echo "Update configs/*.yaml paths if you use different filenames."
