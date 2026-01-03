#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET_DIR="/opt/assistant"

sudo mkdir -p "$TARGET_DIR"
if command -v rsync >/dev/null 2>&1; then
  sudo rsync -a --delete \
    --exclude node_modules \
    --exclude .venv \
    --exclude __pycache__ \
    "$ROOT_DIR/" "$TARGET_DIR/"
else
  sudo cp -R "$ROOT_DIR"/* "$TARGET_DIR/"
fi

sudo python3 -m pip install -r "$TARGET_DIR/services-py/requirements.txt"

sudo pnpm -C "$TARGET_DIR/apps/edge-runtime" install
sudo pnpm -C "$TARGET_DIR/apps/edge-runtime" run build

sudo cp "$TARGET_DIR/deploy/systemd/"*.service /etc/systemd/system/

if [ ! -f /etc/default/assistant ]; then
  sudo bash -c 'cat > /etc/default/assistant <<EOF
DEVICE_MODE=1
AX8850_PORT=50051
VISION_PORT=50052
CAMERA_PORT=50053
TTS_PORT=50054
EOF'
fi

sudo systemctl daemon-reload
sudo systemctl enable --now ax8850.service hailo_vision.service camera.service tts.service orchestrator.service
