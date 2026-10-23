#!/usr/bin/env bash
# Start Agni locally: creates the virtual env on first run, then serves http://localhost:8000
set -e
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi
.venv/bin/pip install -q -r requirements.txt

PORT="${PORT:-8000}"
echo ""
echo "  🔥 Agni GenAI Adoption Lab → http://localhost:$PORT"
echo ""
exec .venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port "$PORT" --reload
