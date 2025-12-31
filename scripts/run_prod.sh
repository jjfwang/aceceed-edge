#!/usr/bin/env bash
set -euo pipefail

pnpm -C apps/edge-runtime build
pnpm -C apps/edge-runtime start
