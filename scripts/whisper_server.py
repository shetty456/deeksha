#!/usr/bin/env python3
"""
Minimal faster-whisper HTTP server for Deeksha.
Starts on http://127.0.0.1:8765 — called by the Next.js /api/whisper/transcribe route.

Usage:
  /Library/Frameworks/Python.framework/Versions/3.10/bin/python3 scripts/whisper_server.py
"""
import json
import os
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer

from faster_whisper import WhisperModel

PORT = 8765
PYTHON_BIN = "/Library/Frameworks/Python.framework/Versions/3.10/bin/python3"

print("[whisper] Loading model (base)…", flush=True)
model = WhisperModel("base", device="cpu", compute_type="int8")
print(f"[whisper] Ready — listening on http://127.0.0.1:{PORT}", flush=True)

# Whisper sometimes hallucinates these phrases on silent audio.
HALLUCINATIONS = {
    "thanks for watching",
    "thank you for watching",
    "thank you.",
    "thank you",
    "[music]",
    "[silence]",
    "(music)",
    "(silence)",
}


def is_hallucination(text: str) -> bool:
    return text.lower().strip("[]() .") in HALLUCINATIONS or text.lower().strip() in HALLUCINATIONS


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/transcribe":
            self._respond(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            self._respond(400, {"error": "empty body"})
            return

        audio_bytes = self.rfile.read(length)

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                f.write(audio_bytes)
                tmp_path = f.name

            segments, _ = model.transcribe(
                tmp_path,
                beam_size=1,
                language="en",
                condition_on_previous_text=False,
            )
            text = " ".join(s.text.strip() for s in segments).strip()

            if is_hallucination(text):
                text = ""

            self._respond(200, {"text": text})

        except Exception as exc:
            print(f"[whisper] error: {exc}", flush=True)
            self._respond(500, {"error": str(exc)})

        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def _respond(self, status: int, body: dict):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(payload))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):
        pass  # suppress per-request access logs


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[whisper] Shutting down", flush=True)
        sys.exit(0)
