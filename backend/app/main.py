"""Agni - GenAI Adoption Lab. FastAPI entry point."""

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import chat, feedback, personas, prompt_coach, simulate, training
from .core.config import FRONTEND_DIR, MODEL, demo_mode

app = FastAPI(
    title="Agni - GenAI Adoption Lab",
    description="Digital-twin employees for GenAI beta testing, training, feedback and support.",
    version="1.0.0",
)

for r in (personas, simulate, training, feedback, prompt_coach, chat):
    app.include_router(r.router)


@app.get("/api/status", tags=["System"])
async def status():
    return {"demo": demo_mode(), "model": None if demo_mode() else MODEL}


@app.get("/", include_in_schema=False)
async def index():
    return FileResponse(FRONTEND_DIR / "index.html")


app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")
