#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p /opt/models/whisper /opt/models/piper /opt/models/llama

echo "Downloading models to /opt/models/..."

WHISPER_URL="${WHISPER_URL:-https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin}"
PIPER_URL="${PIPER_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx}"
PIPER_CONFIG_URL="${PIPER_CONFIG_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json}"
PIPER_ZH_URL="${PIPER_ZH_URL:-}"
PIPER_ZH_CONFIG_URL="${PIPER_ZH_CONFIG_URL:-}"
QWEN3_URL="${QWEN3_URL:-${LLAMA_URL:-https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q8_0.gguf}}"

download() {
  local url="$1"
  local dest="$2"
  if [[ -f "$dest" ]]; then
    echo "  Skipping (exists): $dest"
    return
  fi
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

download "$WHISPER_URL" "/opt/models/whisper/ggml-medium.bin"
download "$PIPER_URL" "/opt/models/piper/en_US-amy-medium.onnx"
download "$PIPER_CONFIG_URL" "/opt/models/piper/en_US-amy-medium.onnx.json"
if [[ -n "${PIPER_ZH_URL}" ]]; then
  download "$PIPER_ZH_URL" "/opt/models/piper/zh_CN-huayan-medium.onnx"
fi
if [[ -n "${PIPER_ZH_CONFIG_URL}" ]]; then
  download "$PIPER_ZH_CONFIG_URL" "/opt/models/piper/zh_CN-huayan-medium.onnx.json"
fi
download "$QWEN3_URL" "/opt/models/llama/qwen3-1.7b-q8_0.gguf"

echo "Downloaded models:"
echo "  /opt/models/whisper/ggml-medium.bin"
echo "  /opt/models/piper/en_US-amy-medium.onnx"
echo "  /opt/models/piper/en_US-amy-medium.onnx.json"
if [[ -n "${PIPER_ZH_URL}" ]]; then
  echo "  /opt/models/piper/zh_CN-huayan-medium.onnx"
fi
if [[ -n "${PIPER_ZH_CONFIG_URL}" ]]; then
  echo "  /opt/models/piper/zh_CN-huayan-medium.onnx.json"
fi
echo "  /opt/models/llama/qwen3-1.7b-q8_0.gguf (Qwen3 1.7B)"
echo "Update configs/config.yaml paths if you use different filenames."
