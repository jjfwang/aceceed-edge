#!/usr/bin/env bash
set -euo pipefail

pnpm -C apps build
pnpm -C apps start
