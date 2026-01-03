#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
export ROOT_DIR
export PYTHONPATH="$ROOT_DIR/services-py:$ROOT_DIR/services-py/common/gen"

python3 - <<'PY'
import os
import sys

root = os.environ["ROOT_DIR"]
sys.path.append(os.path.join(root, "services-py", "common", "gen"))

import grpc
import assistant_pb2
import assistant_pb2_grpc

services = [
    ("ax8850", "127.0.0.1:50051", assistant_pb2_grpc.Ax8850ServiceStub),
    ("vision", "127.0.0.1:50052", assistant_pb2_grpc.VisionServiceStub),
    ("camera", "127.0.0.1:50053", assistant_pb2_grpc.CameraServiceStub),
    ("tts", "127.0.0.1:50054", assistant_pb2_grpc.TtsServiceStub),
]

failed = False
for name, addr, stub_cls in services:
    try:
        channel = grpc.insecure_channel(addr)
        stub = stub_cls(channel)
        res = stub.Health(assistant_pb2.HealthRequest())
        print(f"{name}: ok={res.ok} message={res.message}")
        if not res.ok:
            failed = True
    except Exception as exc:
        print(f"{name}: error {exc}")
        failed = True

if failed:
    raise SystemExit(1)
PY
