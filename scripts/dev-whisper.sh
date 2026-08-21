#!/usr/bin/env bash
set -e

PYTHON="/Library/Frameworks/Python.framework/Versions/3.10/bin/python3"

"$PYTHON" scripts/whisper_server.py &
WHISPER_PID=$!

cleanup() {
  echo ""
  echo "[dev] Stopping whisper server (pid $WHISPER_PID)…"
  kill "$WHISPER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[dev] Whisper server starting… waiting 5s for model load"
sleep 5

npx next dev
