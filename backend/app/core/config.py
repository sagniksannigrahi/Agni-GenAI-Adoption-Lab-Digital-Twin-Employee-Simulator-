"""App settings, read from environment variables (see .env.example)."""

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env")
FRONTEND_DIR = ROOT / "frontend"
SAMPLES_DIR = ROOT / "backend" / "data" / "samples"

MODEL = os.getenv("AGNI_MODEL", "claude-opus-5-5")
MAX_PARALLEL = int(os.getenv("AGNI_MAX_PARALLEL", "8"))


def demo_mode() -> bool:
    """Demo mode returns realistic fake data, so the app runs without an API key."""
    if os.getenv("AGNI_DEMO") == "1":
        return True
    return not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))
