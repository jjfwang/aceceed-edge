#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p /opt/models/whisper /opt/models/piper /opt/models/llama

echo "Download models and place them under /opt/models/..."

# Whisper.cpp example (tiny model)
# wget -O /opt/models/whisper/ggml-base.en.bin \
#   https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin

# Piper example (replace with preferred voice)
# wget -O /opt/models/piper/en_US-amy-medium.onnx \
#   https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx

# Llama.cpp example (replace with your GGUF model)
# wget -O /opt/models/llama/llama-3.gguf \
#   https://huggingface.co/.../resolve/main/your-model.gguf

echo "Update configs/*.yaml paths after downloading models."
