#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
export DEVICE_MODE=1
export PYTHONPATH="$ROOT_DIR/services-py:$ROOT_DIR/services-py/common/gen"

pids=()

python3 "$ROOT_DIR/services-py/ax8850_service/server.py" & pids+=($!)
python3 "$ROOT_DIR/services-py/hailo_vision_service/server.py" & pids+=($!)
python3 "$ROOT_DIR/services-py/camera_service/server.py" & pids+=($!)
python3 "$ROOT_DIR/services-py/tts_service/server.py" & pids+=($!)

trap 'kill ${pids[*]} 2>/dev/null || true' EXIT

pnpm -C "$ROOT_DIR/apps/edge-runtime" run build
pnpm -C "$ROOT_DIR/apps/edge-runtime" run start
